'use client';

import { useState } from 'react';

const EXAMPLE_PROMPTS = [
  'Reactivate inactive customers',
  'Increase sales from Mumbai customers',
  'Reward high value customers',
];

interface GeneratedCampaign {
  campaignName: string;
  segmentQuery: string;
  channel: string;
  message: string;
}

export default function AICopilotPage() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!goal.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      const res = await fetch(`${API_URL}/api/ai/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Request failed (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Generation failed');
      setResult(data.generated);
    } catch (err: unknown) {
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('AI service unavailable. Please ensure the CRM API is running.');
      } else {
        setError(err instanceof Error ? err.message : 'AI campaign generation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] px-4 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(to right, #6366F1, #22C55E)',
            }}
          >
            ✦ AI Copilot
          </span>
        </h1>
        <p className="mt-3 text-lg text-[#94A3B8]">
          Describe your business goal and let AI build your campaign
        </p>
      </div>

      {/* Prompt Input */}
      <div className="max-w-2xl mx-auto">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="What would you like to achieve?"
          rows={4}
          className="w-full min-h-[120px] resize-none bg-[#121A2F] border border-[rgba(99,102,241,0.15)] rounded-xl p-6 text-lg text-[#F8FAFC] placeholder-[#94A3B8] outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/30 transition"
        />

        {/* Example Chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setGoal(prompt)}
              className="bg-[#121A2F] border border-[rgba(99,102,241,0.15)] px-3 py-1.5 rounded-full text-sm text-[#94A3B8] cursor-pointer hover:border-[#6366F1] hover:text-[#6366F1] transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Submit */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !goal.trim()}
            className="bg-[#6366F1] hover:bg-[#5558E6] text-white px-8 py-3 rounded-xl text-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              '✦ Generate Campaign'
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-400 text-center">
            {error}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-[#121A2F] rounded-2xl p-8 border border-[rgba(99,102,241,0.15)]">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[#22C55E] text-xl">✓</span>
              <h2 className="text-xl font-bold text-[#F8FAFC]">
                Campaign Generated
              </h2>
            </div>

            {/* Campaign Name */}
            <h3 className="text-xl font-bold text-[#F8FAFC] mb-4">
              {result.campaignName}
            </h3>

            {/* Segment Query */}
            <div className="mb-4">
              <span className="text-sm text-[#94A3B8]">Target Audience</span>
              <p className="mt-1 text-[#F8FAFC]">{result.segmentQuery}</p>
            </div>

            {/* Channel */}
            <div className="mb-4">
              <span className="text-sm text-[#94A3B8]">Channel</span>
              <div className="mt-1">
                <span className="inline-block bg-[#6366F1]/10 text-[#6366F1] px-3 py-1 rounded-full text-sm font-medium">
                  {result.channel}
                </span>
              </div>
            </div>

            {/* Message */}
            <div className="mb-6">
              <span className="text-sm text-[#94A3B8]">Message</span>
              <div className="mt-1 border-l-2 border-[#6366F1] bg-[#0B1020] p-4 rounded-lg">
                <p className="text-[#F8FAFC] italic">{result.message}</p>
              </div>
            </div>

            {/* Saved Indicator */}
            <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#22C55E]" />
              Saved as Draft
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
