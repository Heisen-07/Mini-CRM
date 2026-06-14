"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface AnalyticsMetrics {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  highestSpender: string;
  topCity: string;
  inactive30: number;
  inactive90: number;
}

interface AnalyticsData {
  metrics: AnalyticsMetrics;
  aiSummary: string[];
  cached: boolean;
  generatedAt: string | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // ── Load metrics + cached/fallback insights (no Gemini call) ──
  const fetchData = () => {
    fetch(`${API_URL}/api/analytics/summary`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Analytics service unavailable (HTTP ${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        if (json.success) {
          setData({
            metrics: json.metrics,
            aiSummary: json.aiSummary,
            cached: json.cached,
            generatedAt: json.generatedAt,
          });
        } else {
          throw new Error(json.message || "Analytics service returned an error");
        }
      })
      .catch((err) => {
        if (err instanceof TypeError && err.message === "Failed to fetch") {
          setError("Backend service unavailable. Please ensure the CRM API is running.");
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Refresh AI insights (only call to Gemini) ──
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/analytics/refresh`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Refresh failed (HTTP ${res.status})`);
      const json = await res.json();
      if (json.success && data) {
        setData({
          ...data,
          metrics: json.metrics,
          aiSummary: json.aiSummary,
          cached: json.cached,
          generatedAt: json.generatedAt,
        });
        if (json.cached && json.reason === "data_unchanged") {
          setRefreshMessage("Insights are up to date. No new business data.");
        }
      }
    } catch {
      // Silently fail — existing insights remain visible
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md">
          <svg
            className="w-12 h-12 text-red-500 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-red-400 text-lg font-bold mb-2">Analytics Unavailable</h3>
          <p className="text-[#94A3B8] text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              window.location.reload();
            }}
            className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg text-sm font-semibold transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, aiSummary } = data;

  // Format generatedAt for display
  const lastUpdated = data.generatedAt
    ? new Date(data.generatedAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#F8FAFC]">Analytics Dashboard</h1>
        <p className="text-[#94A3B8] mt-1">Real-time business insights and CRM aggregates</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Customers */}
        <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl p-6 relative overflow-hidden group hover:border-[#6366F1]/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94A3B8] text-sm font-medium">Total Customers</span>
            <div className="p-2 bg-[#6366F1]/10 rounded-lg text-[#6366F1]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#F8FAFC]">{metrics.totalCustomers.toLocaleString()}</h2>
          <p className="text-[#22C55E] text-xs font-semibold mt-2 flex items-center gap-1">
            <span>↑ Active database count</span>
          </p>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl p-6 relative overflow-hidden group hover:border-[#6366F1]/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94A3B8] text-sm font-medium">Total Revenue</span>
            <div className="p-2 bg-[#22C55E]/10 rounded-lg text-[#22C55E]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 8H12M12 15H12" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#F8FAFC]">₹{metrics.totalRevenue.toLocaleString()}</h2>
          <p className="text-[#94A3B8]/60 text-xs mt-2">Aggregated order values</p>
        </div>

        {/* Total Orders */}
        <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl p-6 relative overflow-hidden group hover:border-[#6366F1]/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94A3B8] text-sm font-medium">Total Orders</span>
            <div className="p-2 bg-[#6366F1]/10 rounded-lg text-[#6366F1]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#F8FAFC]">{metrics.totalOrders.toLocaleString()}</h2>
          <p className="text-[#94A3B8]/60 text-xs mt-2">Processed transactions</p>
        </div>

        {/* Average Order Value */}
        <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl p-6 relative overflow-hidden group hover:border-[#6366F1]/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#94A3B8] text-sm font-medium">Avg Order Value</span>
            <div className="p-2 bg-[#22C55E]/10 rounded-lg text-[#22C55E]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-[#F8FAFC]">₹{metrics.avgOrderValue.toLocaleString()}</h2>
          <p className="text-[#94A3B8]/60 text-xs mt-2">Mean spend per order</p>
        </div>
      </div>

      {/* Detail highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Customer Insights */}
        <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-[#F8FAFC] border-b border-[rgba(99,102,241,0.15)] pb-3">Highlights</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#0B1020] p-4 rounded-xl border border-[rgba(99,102,241,0.08)]">
              <span className="text-xs text-[#94A3B8]">Highest Spending Customer</span>
              <p className="text-sm font-semibold text-[#F8FAFC] mt-1 truncate">{metrics.highestSpender}</p>
            </div>
            <div className="bg-[#0B1020] p-4 rounded-xl border border-[rgba(99,102,241,0.08)]">
              <span className="text-xs text-[#94A3B8]">Top City (Volume)</span>
              <p className="text-sm font-semibold text-[#F8FAFC] mt-1">{metrics.topCity}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#94A3B8]">Audience Inactivity Status</h4>
            <div className="flex items-center justify-between p-3 bg-[#0B1020] rounded-xl border border-yellow-500/10">
              <span className="text-sm text-[#F8FAFC]">Inactive &gt; 30 Days</span>
              <span className="text-yellow-400 font-bold">{metrics.inactive30} customers</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0B1020] rounded-xl border border-red-500/10">
              <span className="text-sm text-[#F8FAFC]">Inactive &gt; 90 Days</span>
              <span className="text-red-400 font-bold">{metrics.inactive90} customers</span>
            </div>
          </div>
        </div>

        {/* AI Business Insights Section */}
        <div className="relative group">
          {/* Glowing background */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6366F1] to-[#22C55E] rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
          
          <div className="relative bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl p-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-[rgba(99,102,241,0.15)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#6366F1] text-lg">✦</span>
                  <h3 className="text-lg font-bold text-[#F8FAFC]">AI Business Insights</h3>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1]/10 hover:bg-[#6366F1]/20 text-[#6366F1] rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {refreshing ? (
                    <>
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh AI Insights
                    </>
                  )}
                </button>
              </div>

              {/* Insights Content — aiSummary is string[] */}
              <div className="text-sm text-[#94A3B8] leading-relaxed space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {aiSummary.map((insight, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <span className="text-[#6366F1] mt-0.5 flex-shrink-0">•</span>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-[rgba(99,102,241,0.15)] flex justify-between items-start">
              <div className="flex flex-col text-xs text-[#94A3B8]/60">
                <span>
                  {lastUpdated
                    ? `Last AI Update: ${lastUpdated}`
                    : "Rule-based insights — click Refresh for AI analysis"}
                </span>
                {refreshMessage && (
                  <span className="text-yellow-500 mt-1">{refreshMessage}</span>
                )}
              </div>
              {data.cached && (
                <span className="bg-[#6366F1]/10 text-[#6366F1] px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                  Cached
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
