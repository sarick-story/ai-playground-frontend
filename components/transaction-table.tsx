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

export function TransactionTable() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "https://www.storyscan.xyz/api/v2/transactions?filter=validated&type=coin_transfer%2Ctoken_transfer&method=transfer",
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
        type: Array.isArray(item.transaction_types)
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
  }, []);

  return (
    <div className="bg-black/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-gray-800/50 w-full flex flex-col h-[400px]">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-xl font-['Acronym',_var(--font-ibm-plex-mono),_sans-serif] text-white">
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
        <div className="overflow-y-auto h-full">
          <table className="w-full table-fixed">
            <thead className="bg-gray-900/60 sticky top-0 z-10">
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
                Array(6)
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
                    className="h-[252px] px-4 text-center text-red-400"
                  >
                    {error}
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="h-[252px] px-4 text-center text-gray-400"
                  >
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 6).map((tx, index) => {
                  // Get the actual recipient address and amount from decoded input
                  const recipientAddress =
                    tx.decoded_input?.parameters?.find((p) => p.name === "to")
                      ?.value || "";
                  const amount =
                    tx.decoded_input?.parameters?.find(
                      (p) => p.name === "value"
                    )?.value || "0";

                  return (
                    <tr
                      key={tx.hash || index}
                      className="h-[42px] hover:bg-gray-900/40"
                    >
                      <td className="px-4 py-3 text-sm truncate">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800/60 text-cyan-500">
                          {tx.type.toLowerCase().replace(/_/g, " ")}
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
                            href={`https://www.storyscan.xyz/tx/${tx.hash}`}
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
                          {formatTokenValue(amount)} {tx.to.name || ""}
                        </span>
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
