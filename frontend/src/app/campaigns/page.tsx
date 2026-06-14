'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { API_URL } from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  goal: string;
  channel: string;
  message: string;
  audienceSize: number;
  status: 'draft' | 'launched';
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launchingIds, setLaunchingIds] = useState<Set<string>>(new Set());
  const router = useRouter();


  useEffect(() => {
    fetch(`${API_URL}/api/campaigns`)
      .then((res) => {
        if (!res.ok) throw new Error(`Campaign service unavailable (HTTP ${res.status})`);
        return res.json();
      })
      .then((json) => {
        setCampaigns(json.data);
      })
      .catch((err) => {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          setError('Backend service unavailable. Please ensure the CRM API is running.');
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLaunch = async (id: string) => {
    setLaunchingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`${API_URL}/api/campaigns/${id}/launch`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Campaign launch failed (HTTP ${res.status})`);
      }
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'launched' as const } : c))
      );
    } catch (err: unknown) {
      const msg = err instanceof TypeError && (err as Error).message === 'Failed to fetch'
        ? 'Backend service unavailable'
        : err instanceof Error ? err.message : 'Campaign launch failed';
      alert(msg);
    } finally {
      setLaunchingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-red-400 text-lg font-semibold">Something went wrong</p>
        <p className="text-[#94A3B8] text-sm mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#F8FAFC]">Campaigns</h1>
        <p className="text-[#94A3B8] mt-1">{campaigns.length} campaigns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            onClick={() => router.push(`/campaigns/${campaign.id}`)}
            className="bg-[#121A2F] rounded-xl p-6 border border-[rgba(99,102,241,0.15)] cursor-pointer hover:border-[#6366F1]/50 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#F8FAFC]">{campaign.name}</h2>
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium ${
                  campaign.status === 'draft'
                    ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-[#22C55E]/10 text-[#22C55E]'
                }`}
              >
                {campaign.status}
              </span>
            </div>

            <span className="bg-[#6366F1]/10 text-[#6366F1] px-2 py-1 rounded-md text-xs font-medium">
              {campaign.channel}
            </span>

            <p className="text-[#94A3B8] text-sm mt-4">{campaign.goal}</p>

            <div className="flex items-center justify-between mt-4">
              <p className="text-[#94A3B8] text-sm">
                Audience: <span className="text-[#F8FAFC] font-medium">{campaign.audienceSize.toLocaleString()}</span>
              </p>
              <p className="text-[#94A3B8] text-xs">
                {new Date(campaign.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>

            {campaign.status === 'draft' && (
              <button
                onClick={(e) => { e.stopPropagation(); handleLaunch(campaign.id); }}
                disabled={launchingIds.has(campaign.id)}
                className="mt-4 w-full bg-[#6366F1] hover:bg-[#5558E6] disabled:opacity-60 text-white px-4 py-2 rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
              >
                {launchingIds.has(campaign.id) ? 'Launching...' : 'Launch'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
