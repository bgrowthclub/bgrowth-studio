import { useEffect, useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import { fetchCampaigns } from '../api/contentEngineClient';
import type { Campaign } from '../types';
import { NewCampaignModal } from './NewCampaignModal';

export function CampaignsView({ onOpenCampaign }: { onOpenCampaign: (campaignId: string) => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const reload = () => {
    fetchCampaigns()
      .then(setCampaigns)
      .catch((err) => setError(err.message));
  };

  useEffect(reload, []);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-navy-400">One campaign per published Workspace you're promoting.</p>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-600"
        >
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      {!campaigns && !error && <p className="text-sm text-navy-400">Loading campaigns…</p>}

      {campaigns && campaigns.length === 0 && (
        <div className="rounded-2xl border border-dashed border-navy-100 bg-white p-10 text-center">
          <p className="text-sm font-bold text-navy-700">No campaigns yet</p>
          <p className="mt-1 text-sm text-navy-400">Create one to start generating social content for a published Workspace.</p>
        </div>
      )}

      <div className="space-y-3">
        {campaigns?.map((campaign) => {
          const counts = (campaign.content_items ?? []).length;
          return (
            <button
              key={campaign.id}
              type="button"
              onClick={() => onOpenCampaign(campaign.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-navy-100 bg-white p-5 text-left shadow-card transition-all hover:shadow-cardHover"
            >
              <div>
                <p className="text-sm font-extrabold text-navy-900">{campaign.name}</p>
                <p className="mt-1 text-xs text-navy-400">
                  {campaign.content_strategies?.name} · {campaign.product_slug} · {counts} content item{counts === 1 ? '' : 's'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-navy-300" />
            </button>
          );
        })}
      </div>

      {showNewModal && (
        <NewCampaignModal
          onClose={() => setShowNewModal(false)}
          onCreated={(campaign) => {
            setShowNewModal(false);
            reload();
            onOpenCampaign(campaign.id);
          }}
        />
      )}
    </div>
  );
}
