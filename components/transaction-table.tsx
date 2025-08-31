"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import { CopyIconButton } from "./copy-button";

function truncateHash(hash: string | undefined, maxLength = 10): string {
  if (!hash) return "";
  if (hash.length <= maxLength) return hash;
  return (
    hash.substring(0, maxLength / 2) +
    "..." +
    hash.substring(hash.length - maxLength / 2)
  );
}

// Format token value to human readable format
function formatTokenValue(value: string): string {
  const num = Number.parseFloat(value) / 1e18;
  if (isNaN(num)) return "0";

  if (num === 0) return "0";

  if (num >= 1000000) {
    const millions = num / 1000000;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }

  if (num >= 1000) {
    const thousands = num / 1000;
    return `${
      thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)
    }k`;
  }

  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
}

interface Transaction {
  hash: string;
  type: string;
  status: string;
  timestamp: string;
  method: string;
  value: string;
  exchange_rate: string;
  from: {
    hash: string;
  };
  to: {
    hash: string;
    name?: string;
  };
  transaction_types: string[];
  decoded_input?: {
    parameters?: Array<{
      name: string;
      type: string;
      value: string;
    }>;
  };
}

interface TransactionTableProps {
  className?: string;
}

export function TransactionTable({ className = "" }: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionCount] = useState(10); // Fixed to 10 transactions, removed state setter

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use query parameters to filter transactions by method and limit results
      const response = await fetch(
        `https://www.storyscan.io/api/v2/transactions?filter=validated&method=approve,transfer,multicall,mint,commit&items_count=${transactionCount}`,
        {
          headers: {
            accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data);

      if (!data || !data.items || !Array.isArray(data.items)) {
        throw new Error("Invalid API response format");
      }

      const formattedTransactions = data.items.map((item: any) => ({
        hash: item.hash || "",
        // If transaction_types is an array, use the first type, otherwise use the string or default
        type: Array.isArray(item.transaction_types) && item.transaction_types.length > 0
          ? item.transaction_types[0]
          : item.transaction_types || "contract_call",
        status: item.status || "pending",
        timestamp: new Date(item.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
        method: item.method || "",
        value: item.value || "0",
        exchange_rate: item.exchange_rate || "",
        from: item.from || { hash: "" },
        to: item.to || { hash: "" },
        transaction_types: item.transaction_types || [],
        decoded_input: item.decoded_input || {},
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch transactions"
      );
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [transactionCount]);

  // Helper function to get a more user-friendly display name for transaction types
  const getTransactionTypeDisplay = (type: string): string => {
    const typeMap: Record<string, string> = {
      "token_transfer": "Token Transfer",
      "contract_call": "Contract Call",
      "coin_transfer": "Coin Transfer",
      "contract_creation": "Contract Creation",
      "token_creation": "Token Creation"
    };
    
    return typeMap[type.toLowerCase()] || type.replace(/_/g, " ");
  };

  // Helper function to get a more user-friendly display name for transaction methods
  const getMethodDisplay = (method: string): string => {
    const methodMap: Record<string, string> = {
      "approve": "Approve",
      "transfer": "Transfer",
      "multicall": "Multi Call",
      "mint": "Mint",
      "commit": "Commit",
      "transferFrom": "Transfer From"
    };
    
    return methodMap[method] || method.charAt(0).toUpperCase() + method.slice(1);
  };

  // Helper function to extract the appropriate amount based on transaction method
  const getTransactionAmount = (tx: Transaction): string => {
    if (tx.method === "approve") {
      // For approve transactions, get the allowance amount
      const allowance = tx.decoded_input?.parameters?.find(
        (p) => p.name === "value" || p.name === "amount" || p.name === "allowance"
      )?.value;
      
      // If the allowance is the max uint256 value, display "Unlimited"
      if (allowance && allowance.startsWith("115792089237316195423570985008687907853269984665640564039457584007")) {
        return "Unlimited";
      }
      
      return allowance || "0";
    } else if (tx.method === "transfer" || tx.method === "transferFrom") {
      // For transfer transactions, get the transfer amount
      return tx.decoded_input?.parameters?.find(
        (p) => p.name === "value" || p.name === "amount"
      )?.value || tx.value || "0";
    } else if (tx.method === "mint") {
      // For mint transactions, get the mint amount
      return tx.decoded_input?.parameters?.find(
        (p) => p.name === "amount" || p.name === "value"
      )?.value || "0";
    }
    
    // Default fallback
    return tx.value || "0";
  };

  return (
    <div className={`bg-black/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-gray-800/50 w-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-xl font-[var(--font-space-grotesk),_var(--font-ibm-plex-mono),_sans-serif] text-white">
          Latest Transactions
        </h2>
        <button
          onClick={fetchTransactions}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="overflow-y-auto h-full custom-scrollbar">
          <table className="w-full table-fixed">
            <thead className="transaction-table-header">
              <tr>
                <th className="w-[20%] px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="w-[30%] px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Hash
                </th>
                <th className="w-[25%] px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="w-[25%] px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                Array(transactionCount)
                  .fill(0)
                  .map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td colSpan={4} className="px-4 py-[21px]">
                        <div className="h-5 bg-gray-800 rounded" />
                      </td>
                    </tr>
                  ))
              ) : error ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-4 text-center text-red-400"
                  >
                    {error}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-4 text-center text-gray-400"
                  >
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((tx, index) => {
                  // Get the appropriate amount based on transaction method
                  const amount = getTransactionAmount(tx);
                  
                  // Get the recipient address for display
                  const recipient = tx.method === "approve" 
                    ? tx.decoded_input?.parameters?.find(p => p.name === "spender")?.value 
                    : tx.to.hash;

                  return (
                    <tr
                      key={tx.hash || index}
                      className="hover:bg-gray-900/40"
                    >
                      <td className="px-4 py-3 text-sm truncate">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tx.method === "approve" ? "bg-blue-800/60 text-blue-300" :
                          tx.method === "transfer" ? "bg-purple-800/60 text-purple-300" :
                          tx.method === "mint" ? "bg-green-800/60 text-green-300" :
                          tx.method === "multicall" ? "bg-yellow-800/60 text-yellow-300" :
                          tx.method === "commit" ? "bg-orange-800/60 text-orange-300" :
                          "bg-gray-800/60 text-gray-300"
                        }`}>
                          {getMethodDisplay(tx.method)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-300 truncate">
                        <div className="flex space-x-1 items-center">
                          {truncateHash(tx.hash)}

                          <CopyIconButton
                            className="ml-1 size-3"
                            message={tx.hash}
                          />
                          <a
                            href={`https://www.storyscan.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-white flex-shrink-0"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 truncate">
                        <span className="font-medium text-purple-400 whitespace-nowrap">
                          {amount === "Unlimited" ? amount : formatTokenValue(amount)} {tx.to.name || ""}
                        </span>
                        {tx.method === "approve" && recipient && (
                          <div className="text-xs text-gray-500 mt-1">
                            Spender: {truncateHash(recipient)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {tx.timestamp}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
