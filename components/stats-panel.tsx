"use client";

import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  Activity,
  Box,
  Users,
  Clock,
  Database,
  Zap,
} from "lucide-react";
import { formatNumber } from "@/utils/format-number";

interface NetworkStats {
  average_block_time: number;
  coin_price: string;
  coin_image: string;
  gas_prices: {
    slow: number;
    average: number;
    fast: number;
  };
  network_utilization_percentage: number;
  total_addresses: string;
  total_blocks: string;
  total_transactions: string;
  transactions_today: string;
}

export function StatsPanel() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const response = await fetch("https://www.storyscan.xyz/api/v2/stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-2xl bg-black rounded-2xl shadow-2xl p-6 border border-gray-800">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-20 bg-gray-800 rounded-lg" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-800 rounded-lg" />
            <div className="h-24 bg-gray-800 rounded-lg" />
            <div className="h-24 bg-gray-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-grow bg-black/80 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-gray-800/50">
      <div className="p-6 space-y-6">
        {/* Header with price and refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {stats?.coin_image && (
              <img
                src={stats.coin_image || "/placeholder.svg"}
                alt="Coin"
                className="w-8 h-8 rounded-full"
              />
            )}
            <div>
              <h3 className="text-xl font-[var(--font-space-grotesk),_var(--font-ibm-plex-mono),_sans-serif] text-white">
                ${stats?.coin_price || "0.00"}
              </h3>
              <p className="text-sm text-gray-400">Current Price</p>
            </div>
          </div>
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Network Stats */}
          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-500" />
              <span className="text-sm text-gray-400">Network Usage</span>
            </div>
            <p className="mt-2 text-xl font-bold text-white">
              {stats?.network_utilization_percentage.toFixed(1)}%
            </p>
          </div>

          {/* Total Transactions */}
          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
            <div className="flex items-center space-x-2">
              <Box className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-400">Total Tx</span>
            </div>
            <p className="mt-2 text-xl font-bold text-white">
              {formatNumber(Number.parseInt(stats?.total_transactions || "0"))}
            </p>
          </div>

          {/* Total Addresses */}
          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-pink-500" />
              <span className="text-sm text-gray-400">Addresses</span>
            </div>
            <p className="mt-2 text-xl font-bold text-white">
              {formatNumber(Number.parseInt(stats?.total_addresses || "0"))}
            </p>
          </div>

          {/* Block Time */}
          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-500" />
              <span className="text-sm text-gray-400">Block Time</span>
            </div>
            <p className="mt-2 text-xl font-bold text-white">
              {stats?.average_block_time
                ? (stats.average_block_time / 1000).toFixed(1)
                : "0"}
              s
            </p>
          </div>

          {/* Total Blocks */}
          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-400">Blocks</span>
            </div>
            <p className="mt-2 text-xl font-bold text-white">
              {formatNumber(Number.parseInt(stats?.total_blocks || "0"))}
            </p>
          </div>

          {/* Gas Prices */}
          <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-pink-500" />
              <span className="text-sm text-gray-400">Gas (Gwei)</span>
            </div>
            <p className="mt-2 text-sm font-medium text-white">
              {stats?.gas_prices.average} avg · {stats?.gas_prices.fast} fast
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
