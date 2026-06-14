"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ── Types ────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  goal: string | null;
  channel: string;
  message: string | null;
  audienceSize: number;
  status: "draft" | "launched";
  createdAt: string;
}

interface Performance {
  total: number;
  pending: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  openRate: number;
  clickRate: number;
  failureRate: number;
}

// ── Component ────────────────────────────────

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Draft message editing
  const [editMessage, setEditMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI channel reasoning
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [reasoningLoading, setReasoningLoading] = useState(false);

  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [analysisGeneratedAt, setAnalysisGeneratedAt] = useState<string | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // Launching
  const [launching, setLaunching] = useState(false);

  // ── Fetch campaign data ──
  useEffect(() => {
    fetch(`${API_URL}/api/campaigns/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Campaign service unavailable (HTTP ${res.status})`);
        return res.json();
      })
      .then((json) => {
        if (!json.success) throw new Error(json.message || "Failed to load campaign");
        setCampaign(json.campaign);
        setEditMessage(json.campaign.message || "");
        if (json.performance) setPerformance(json.performance);
        // Load cached analysis if available
        if (json.analysis) {
          setInsights(json.analysis.insights);
          setAnalysisGeneratedAt(json.analysis.generatedAt);
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
  }, [id]);

  // ── Fetch AI channel reasoning ──
  useEffect(() => {
    if (!campaign) return;
    setReasoningLoading(true);
    fetch(`${API_URL}/api/ai/channel-reasoning`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: campaign.channel,
        goal: campaign.goal || campaign.name,
        message: campaign.message || "",
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setReasoning(json.reasoning);
      })
      .catch(() => {})
      .finally(() => setReasoningLoading(false));
  }, [campaign]);

  // ── Refresh AI performance analysis (only Gemini trigger) ──
  const handleRefreshAnalysis = async () => {
    if (insightsLoading) return;
    setInsightsLoading(true);
    setRefreshMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/campaigns/${id}/refresh-analysis`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setInsights(json.insights);
        setAnalysisGeneratedAt(json.generatedAt);
        if (json.cached && json.reason === "performance_unchanged") {
          setRefreshMessage("Analysis is up to date. No new performance data.");
        }
      }
    } catch {
      // Silently fail — existing insights remain visible
    } finally {
      setInsightsLoading(false);
    }
  };

  // ── Save message ──
  const handleSave = async () => {
    if (!editMessage.trim() || saving) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`${API_URL}/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: editMessage.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Save failed");
      setCampaign(json.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Failed to save message");
    } finally {
      setSaving(false);
    }
  };

  // ── Launch campaign ──
  const handleLaunch = async () => {
    if (launching) return;
    setLaunching(true);
    try {
      const res = await fetch(`${API_URL}/api/campaigns/${id}/launch`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Launch failed");
      // Reload the page to get performance data
      window.location.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Launch failed");
      setLaunching(false);
    }
  };

  // ── Render states ──
  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md">
          <h3 className="text-red-400 text-lg font-bold mb-2">Campaign Unavailable</h3>
          <p className="text-[#94A3B8] text-sm mb-4">{error}</p>
          <button onClick={() => router.push("/campaigns")} className="px-4 py-2 bg-[#6366F1] hover:bg-[#5558E6] text-white rounded-lg text-sm font-semibold transition">
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const isDraft = campaign.status === "draft";

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* ── Back + Header ── */}
      <div>
        <button onClick={() => router.push("/campaigns")} className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm mb-4 inline-flex items-center gap-1 transition cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Campaigns
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#F8FAFC]">{campaign.name}</h1>
            <p className="text-[#94A3B8] mt-1">{campaign.goal || "No goal specified"}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${isDraft ? "bg-yellow-500/10 text-yellow-400" : "bg-[#22C55E]/10 text-[#22C55E]"}`}>
            {campaign.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── Campaign Info Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="Channel" value={campaign.channel.toUpperCase()} />
        <InfoCard label="Audience Size" value={campaign.audienceSize.toLocaleString()} />
        <InfoCard label="Status" value={campaign.status} />
        <InfoCard label="Created" value={new Date(campaign.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
      </div>

      {/* ── Message Section ── */}
      <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl p-6">
        <h3 className="text-lg font-bold text-[#F8FAFC] mb-4">Campaign Message</h3>
        {isDraft ? (
          <>
            <textarea
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              rows={4}
              className="w-full bg-[#0B1020] border border-[rgba(99,102,241,0.15)] rounded-xl p-4 text-[#F8FAFC] placeholder-[#94A3B8] text-sm outline-none focus:border-[#6366F1] transition resize-none"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleSave}
                disabled={saving || !editMessage.trim()}
                className="bg-[#6366F1] hover:bg-[#5558E6] text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {saveSuccess && <span className="text-[#22C55E] text-sm font-medium">✓ Saved</span>}
            </div>
          </>
        ) : (
          <div className="border-l-2 border-[#6366F1] bg-[#0B1020] p-4 rounded-lg">
            <p className="text-[#F8FAFC] text-sm italic">{campaign.message || "No message"}</p>
          </div>
        )}
      </div>

      {/* ── Channel Reasoning ── */}
      <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[#6366F1]">✦</span>
          <h3 className="text-lg font-bold text-[#F8FAFC]">Channel Strategy</h3>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block bg-[#6366F1]/10 text-[#6366F1] px-3 py-1 rounded-full text-sm font-semibold">{campaign.channel.toUpperCase()}</span>
        </div>
        {reasoningLoading ? (
          <div className="flex items-center gap-2 text-[#94A3B8] text-sm"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Analyzing channel strategy...</div>
        ) : reasoning ? (
          <p className="text-[#94A3B8] text-sm leading-relaxed">{reasoning}</p>
        ) : (
          <p className="text-[#94A3B8]/50 text-sm italic">Channel reasoning unavailable</p>
        )}
      </div>

      {/* ── Launch Button (Draft Only) ── */}
      {isDraft && (
        <div className="text-center">
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-8 py-3 rounded-xl text-lg font-semibold transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-lg shadow-[#22C55E]/20"
          >
            {launching ? (
              <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Launching...</>
            ) : (
              "🚀 Launch Campaign"
            )}
          </button>
        </div>
      )}

      {/* ── Performance Metrics (Launched Only) ── */}
      {!isDraft && performance && (
        <div>
          <h3 className="text-lg font-bold text-[#F8FAFC] mb-4">Delivery Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard label="Total Sent" value={performance.total} />
            <MetricCard label="Delivered" value={performance.delivered} color="green" />
            <MetricCard label="Opened" value={performance.opened} color="blue" />
            <MetricCard label="Clicked" value={performance.clicked} color="indigo" />
            <MetricCard label="Failed" value={performance.failed} color="red" />
          </div>

          {/* Rate cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <RateCard label="Open Rate" value={performance.openRate} />
            <RateCard label="Click Rate" value={performance.clickRate} />
            <RateCard label="Failure Rate" value={performance.failureRate} isNegative />
          </div>
        </div>
      )}

      {/* ── AI Performance Analysis (Launched Only) ── */}
      {!isDraft && performance && (
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6366F1] to-[#22C55E] rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
          <div className="relative bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[#6366F1] text-lg">✦</span>
                <h3 className="text-lg font-bold text-[#F8FAFC]">AI Performance Analysis</h3>
              </div>
              <button
                onClick={handleRefreshAnalysis}
                disabled={insightsLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1]/10 hover:bg-[#6366F1]/20 text-[#6366F1] rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {insightsLoading ? (
                  <><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Analyzing...</>
                ) : (
                  <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Refresh Analysis</>
                )}
              </button>
            </div>
            {insights && insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <div key={i} className="flex gap-3 items-start text-sm text-[#94A3B8]">
                    <span className="text-[#6366F1] mt-0.5 flex-shrink-0">•</span>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#94A3B8]/50 text-sm italic">Click &quot;Refresh Analysis&quot; to generate AI insights for this campaign.</p>
            )}
            {analysisGeneratedAt && (
              <div className="mt-4 pt-3 border-t border-[rgba(99,102,241,0.15)] flex flex-col text-xs text-[#94A3B8]/60">
                <span>
                  Analysis generated: {new Date(analysisGeneratedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                {refreshMessage && (
                  <span className="text-yellow-500 mt-1">{refreshMessage}</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable Sub-Components ──

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-xl p-4">
      <span className="text-xs text-[#94A3B8] uppercase tracking-wider">{label}</span>
      <p className="text-lg font-semibold text-[#F8FAFC] mt-1 capitalize">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorMap: Record<string, string> = {
    green: "text-[#22C55E]",
    blue: "text-blue-400",
    indigo: "text-[#6366F1]",
    red: "text-red-400",
  };
  return (
    <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-xl p-4 text-center">
      <span className="text-xs text-[#94A3B8] uppercase tracking-wider">{label}</span>
      <p className={`text-2xl font-bold mt-1 ${color ? colorMap[color] : "text-[#F8FAFC]"}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function RateCard({ label, value, isNegative }: { label: string; value: number; isNegative?: boolean }) {
  const color = isNegative
    ? value > 5 ? "text-red-400" : "text-[#22C55E]"
    : value > 20 ? "text-[#22C55E]" : value > 0 ? "text-yellow-400" : "text-[#94A3B8]";
  return (
    <div className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-xl p-4 flex justify-between items-center">
      <span className="text-sm text-[#94A3B8]">{label}</span>
      <span className={`text-xl font-bold ${color}`}>{value}%</span>
    </div>
  );
}
