import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { fetchCampaigns, fetchContentItems, generateContentItem } from '../api/contentEngineClient';
import { ContentItemPanel } from '../components/ContentItemPanel';
import type { Campaign, ContentItem, ContentType, Platform } from '../types';
import { CONTENT_TYPE_LABELS, LANGUAGE_LABELS, PLATFORM_LABELS } from '../types';

const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

export function CampaignDetailView({ campaignId, onBack: _onBack }: { campaignId: string; onBack: () => void }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [contentType, setContentType] = useState<ContentType>('caption');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchCampaigns()
      .then((all) => setCampaign(all.find((c) => c.id === campaignId) ?? null))
      .catch((err) => setError(err.message));
    fetchContentItems(campaignId)
      .then(setItems)
      .catch((err) => setError(err.message));
  };

  useEffect(load, [campaignId]);

  // Legacy campaigns (or campaigns fetched before this column existed) have
  // channels missing/empty — that means "no campaign-level restriction," so
  // Generate keeps offering every currently supported platform, exactly as
  // it always did. A campaign with channels selected narrows to just those.
  const allowedPlatforms = useMemo<Platform[]>(() => {
    if (campaign?.channels && campaign.channels.length > 0) return campaign.channels;
    return ALL_PLATFORMS;
  }, [campaign]);

  useEffect(() => {
    if (allowedPlatforms.length > 0 && !allowedPlatforms.includes(platform)) {
      setPlatform(allowedPlatforms[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedPlatforms]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const item = await generateContentItem({ campaignId, platform, contentType });
      setItems((prev) => [item, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!campaign) return <p className="text-sm text-navy-400">Loading campaign…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <p className="text-base font-extrabold text-navy-900">{campaign.name}</p>
        <p className="mt-1 text-xs text-navy-400">
          {campaign.content_strategies?.name} · Workspace: {campaign.product_slug} · UTM: {campaign.utm_campaign}
        </p>
        {campaign.goal && <p className="mt-2 text-sm text-navy-600">Goal: {campaign.goal}</p>}
        {campaign.audience && <p className="mt-1 text-sm text-navy-600">Audience: {campaign.audience}</p>}
        <p className="mt-1 text-xs text-navy-400">
          {campaign.language && <>Language: {LANGUAGE_LABELS[campaign.language as keyof typeof LANGUAGE_LABELS] ?? campaign.language} · </>}
          Channels: {campaign.channels?.length ? campaign.channels.map((c) => PLATFORM_LABELS[c]).join(', ') : 'All platforms'}
        </p>
      </div>

      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <p className="mb-3 text-sm font-bold text-navy-800">Generate Content</p>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {allowedPlatforms.map((value) => (
                <option key={value} value={value}>
                  {PLATFORM_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-navy-400">No content generated yet for this campaign.</p>}
        {items.map((item) => (
          <ContentItemPanel
            key={item.id}
            item={item}
            campaign={campaign}
            onChange={(updated) => setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
            onDeleted={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}
