import { useEffect, useMemo, useState } from 'react';
import { Pencil, Sparkles } from 'lucide-react';
import { fetchCampaigns, fetchContentItems, fetchStrategies, generateContentItem, updateCampaign } from '../api/contentEngineClient';
import { ContentItemPanel } from '../components/ContentItemPanel';
import type { Campaign, ContentItem, ContentStrategy, ContentType, Language, Platform } from '../types';
import { CONTENT_TYPE_LABELS, LANGUAGE_LABELS, PLATFORM_LABELS } from '../types';

const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

/**
 * Editable subset of a campaign — Workspace/product_id/product_slug/
 * utm_campaign/id are deliberately absent: they're permanent creation-time
 * snapshots (see api/content-engine/campaigns.js's PATCH comment) and stay
 * visible-but-read-only in the info card above this form instead.
 */
function EditCampaignForm({
  campaign,
  strategies,
  onSaved,
  onCancel,
}: {
  campaign: Campaign;
  strategies: ContentStrategy[];
  onSaved: (updated: Campaign) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(campaign.name);
  const [strategyId, setStrategyId] = useState(campaign.strategy_id);
  const [goal, setGoal] = useState(campaign.goal ?? '');
  const [audience, setAudience] = useState(campaign.audience ?? '');
  const [language, setLanguage] = useState<Language>((campaign.language as Language) ?? 'en-US');
  const [channels, setChannels] = useState<Platform[]>(campaign.channels ?? []);
  const [channelsTouched, setChannelsTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A legacy campaign's channels=[] ("no restriction") must survive an edit
  // that never touches Channels — only require a non-empty selection once
  // the admin actually interacts with the pills, or the campaign already
  // had channels set (Phase 2B+). Otherwise this field is simply left out
  // of the PATCH payload below, matching the backend's own untouched-field
  // contract for legacy campaigns.
  const channelsRequireSelection = channelsTouched || (campaign.channels?.length ?? 0) > 0;

  const toggleChannel = (value: Platform) => {
    setChannelsTouched(true);
    setChannels((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  };

  const canSave = name.trim().length > 0 && strategyId && (!channelsRequireSelection || channels.length > 0) && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateCampaign({
        id: campaign.id,
        name: name.trim(),
        strategyId,
        goal: goal.trim() || null,
        audience: audience.trim() || null,
        language,
        ...(channelsRequireSelection ? { channels } : {}),
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <p className="mb-3 text-sm font-bold text-navy-800">Edit Campaign</p>
      <p className="mb-4 text-xs text-navy-400">Workspace: {campaign.product_slug} (not editable)</p>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-navy-600">Campaign Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-navy-600">Content Strategy</label>
          <select
            value={strategyId}
            onChange={(e) => setStrategyId(e.target.value)}
            className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-navy-600">Goal (optional)</label>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Drive trial sign-ups"
            className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-navy-600">Audience (optional)</label>
          <textarea
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            rows={2}
            placeholder="e.g. Personal trainers and people organizing workout programs"
            className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-navy-600">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-navy-600">Channels</label>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(PLATFORM_LABELS) as [Platform, string][]).map(([value, label]) => {
              const checked = channels.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleChannel(value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${checked ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-navy-100 text-navy-600 hover:bg-navy-50'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {channels.length === 0 && <p className="mt-1 text-xs text-navy-400">Select at least one channel.</p>}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-lg border border-navy-100 px-4 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export function CampaignDetailView({ campaignId, onBack: _onBack }: { campaignId: string; onBack: () => void }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [strategies, setStrategies] = useState<ContentStrategy[]>([]);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [contentType, setContentType] = useState<ContentType>('caption');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchCampaigns()
      .then((all) => setCampaign(all.find((c) => c.id === campaignId) ?? null))
      .catch((err) => setError(err.message));
    fetchContentItems(campaignId)
      .then(setItems)
      .catch((err) => setError(err.message));
    fetchStrategies()
      .then(setStrategies)
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
      {isEditing ? (
        <EditCampaignForm
          campaign={campaign}
          strategies={strategies}
          onCancel={() => setIsEditing(false)}
          onSaved={(updated) => {
            setCampaign(updated);
            setIsEditing(false);
          }}
        />
      ) : (
        <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-extrabold text-navy-900">{campaign.name}</p>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit Campaign
            </button>
          </div>
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
      )}

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
