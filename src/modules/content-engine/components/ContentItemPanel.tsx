import { useEffect, useState } from 'react';
import { Trash2, Copy, Check, Sparkles, Repeat, Image as ImageIcon, Download } from 'lucide-react';
import { ContentItemBody, buildContentCopy } from './ContentItemBody';
import { StatusBadge } from './StatusBadge';
import {
  createPublication,
  deleteContentItem,
  fetchCreativeAssets,
  generateContentItem,
  generateCreativeAsset,
  updateContentItem,
} from '../api/contentEngineClient';
import { buildUtmLink } from '../utmLink';
import type { ContentItem, CreativeAsset, VariationType } from '../types';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, VARIATION_TYPE_LABELS } from '../types';

const VARIATION_TYPE_VALUES = Object.keys(VARIATION_TYPE_LABELS) as VariationType[];
// Mirrors api/content-engine/creative-assets.js's own APPROVAL_GATE_STATUSES
// exactly — Generate Creative must only be offered once text content is
// past authoring/review, so media is never generated against content that
// may still be rewritten. The server re-enforces this independently; this
// is only what decides whether the button renders.
const CREATIVE_GATE_STATUSES: ContentItem['status'][] = ['approved', 'scheduled', 'published'];

interface ContentItemPanelProps {
  item: ContentItem;
  campaign?: { product_slug: string; utm_campaign: string };
  onChange: (updated: ContentItem) => void;
  onDeleted: (id: string) => void;
}

/**
 * The one place a content_item's body is previewed, edited, and moved
 * through its approval lifecycle (draft -> review -> approved -> scheduled
 * -> published) — reused as-is by CampaignDetailView, ContentLibraryView,
 * and CalendarView rather than three copies of this logic.
 *
 * Phase 2D — also the one place a variation can be generated from an
 * existing item. A newly generated variation is rendered by recursively
 * mounting this same component (it's just another content_item, with the
 * same full set of capabilities, including generating further variations
 * from it) directly below the source card — self-contained here so no
 * caller (CampaignDetailView/ContentLibraryView/CalendarView) needs new
 * props or state to see the result immediately. On the next real fetch
 * (e.g. a fresh page load), the new row is already a completely ordinary,
 * independent content_items row and appears in its normal place in that
 * flat list — this local rendering is only a same-session convenience.
 */
export function ContentItemPanel({ item, campaign, onChange, onDeleted }: ContentItemPanelProps) {
  const [draftBody, setDraftBody] = useState(item.body);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [contentCopied, setContentCopied] = useState(false);
  const [showVariationPicker, setShowVariationPicker] = useState(false);
  const [variationType, setVariationType] = useState<VariationType>(VARIATION_TYPE_VALUES[0]);
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);
  const [variationError, setVariationError] = useState<string | null>(null);
  const [localVariations, setLocalVariations] = useState<ContentItem[]>([]);
  const [showRepublishPicker, setShowRepublishPicker] = useState(false);
  const [republishDate, setRepublishDate] = useState('');
  const [isSchedulingRepublish, setIsSchedulingRepublish] = useState(false);
  const [republishError, setRepublishError] = useState<string | null>(null);
  const [republishScheduled, setRepublishScheduled] = useState(false);
  const [creativeAssets, setCreativeAssets] = useState<CreativeAsset[]>([]);
  const [isGeneratingCreative, setIsGeneratingCreative] = useState(false);
  const [creativeError, setCreativeError] = useState<string | null>(null);

  const isDirty = JSON.stringify(draftBody) !== JSON.stringify(item.body);
  const editable = item.status === 'draft' || item.status === 'review';
  const utmCampaign = campaign ?? item.campaigns;
  const contentCopy = buildContentCopy({ content_type: item.content_type, body: draftBody });
  const canGenerateCreative = CREATIVE_GATE_STATUSES.includes(item.status);

  // Loads this item's own existing creative assets once — a plain fetch
  // scoped to item.id, mirroring the same "each component owns its own
  // related data" pattern already used for content_publications elsewhere
  // in this module.
  useEffect(() => {
    fetchCreativeAssets(item.id)
      .then(setCreativeAssets)
      .catch((err) => setCreativeError(err instanceof Error ? err.message : 'Failed to load creative assets.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const handleGenerateCreative = async () => {
    setIsGeneratingCreative(true);
    setCreativeError(null);
    try {
      // No new content_items row, no change to body/platform/content_type —
      // this only creates a creative_assets row referencing item.id. See
      // api/content-engine/creative-assets.js.
      const asset = await generateCreativeAsset({ contentItemId: item.id, assetType: 'image' });
      setCreativeAssets((prev) => [asset, ...prev]);
    } catch (err) {
      setCreativeError(err instanceof Error ? err.message : 'Creative generation failed.');
    } finally {
      setIsGeneratingCreative(false);
    }
  };

  const handleGenerateVariation = async () => {
    setIsGeneratingVariation(true);
    setVariationError(null);
    try {
      const variation = await generateContentItem({
        campaignId: item.campaign_id,
        platform: item.platform,
        contentType: item.content_type,
        sourceContentItemId: item.id,
        variationType,
      });
      setLocalVariations((prev) => [variation, ...prev]);
      setShowVariationPicker(false);
    } catch (err) {
      setVariationError(err instanceof Error ? err.message : 'Variation generation failed.');
    } finally {
      setIsGeneratingVariation(false);
    }
  };

  const handleScheduleRepublish = async () => {
    if (!republishDate) return;
    setIsSchedulingRepublish(true);
    setRepublishError(null);
    try {
      // No AI call, no new content_items row: this reuses item.id's exact
      // existing body/platform/content_type by only creating a new
      // content_publications occurrence — see content-items.js.
      await createPublication({ contentItemId: item.id, scheduledAt: new Date(republishDate).toISOString() });
      setShowRepublishPicker(false);
      setRepublishDate('');
      setRepublishScheduled(true);
      setTimeout(() => setRepublishScheduled(false), 2500);
    } catch (err) {
      setRepublishError(err instanceof Error ? err.message : 'Failed to schedule republish.');
    } finally {
      setIsSchedulingRepublish(false);
    }
  };

  const runUpdate = async (patch: Parameters<typeof updateContentItem>[0]) => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateContentItem(patch);
      onChange(updated);
      if (patch.body) setDraftBody(updated.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this content item?')) return;
    try {
      await deleteContentItem(item.id);
      onDeleted(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleCopyLink = async () => {
    if (!utmCampaign) return;
    try {
      await navigator.clipboard.writeText(buildUtmLink(utmCampaign, item));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Copy failed — your browser blocked clipboard access.');
    }
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(contentCopy.text);
      setContentCopied(true);
      setTimeout(() => setContentCopied(false), 1500);
    } catch {
      setError('Copy failed — your browser blocked clipboard access.');
    }
  };

  return (
    <>
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-700">{PLATFORM_LABELS[item.platform]}</span>
          <span className="text-xs font-semibold text-navy-400">{CONTENT_TYPE_LABELS[item.content_type]}</span>
          {item.parent_content_item_id && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
              Variation{item.variation_label ? ` · ${item.variation_label}` : ''}
            </span>
          )}
        </div>
        <StatusBadge status={item.status} />
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <ContentItemBody item={{ content_type: item.content_type, body: draftBody }} editable={editable} onChange={setDraftBody} />

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2">
        <p className="flex-1 truncate text-xs text-navy-500">Ready to paste into {PLATFORM_LABELS[item.platform]} or elsewhere</p>
        <button
          type="button"
          onClick={handleCopyContent}
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
        >
          {contentCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {contentCopied ? 'Copied!' : contentCopy.label}
        </button>
      </div>

      {utmCampaign && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-navy-50 px-3 py-2">
          <p className="flex-1 truncate text-xs text-navy-500">{buildUtmLink(utmCampaign, item)}</p>
          <button type="button" onClick={handleCopyLink} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}

      {(item.status === 'approved' || item.status === 'scheduled') && (
        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">Scheduled Date</label>
          <input
            type="datetime-local"
            defaultValue={item.scheduled_at ? item.scheduled_at.slice(0, 16) : ''}
            onChange={(e) =>
              runUpdate({
                id: item.id,
                status: e.target.value ? 'scheduled' : 'approved',
                scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
            className="rounded-lg border border-navy-100 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
      )}

      {item.status === 'published' && item.published_at && (
        <p className="mt-3 text-xs text-navy-400">Published {new Date(item.published_at).toLocaleString()}</p>
      )}

      {republishScheduled && <p className="mt-3 text-xs font-semibold text-success">Republish scheduled.</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {editable && isDirty && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => runUpdate({ id: item.id, body: draftBody })}
            className="rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-900 disabled:opacity-60"
          >
            Save Edits
          </button>
        )}
        {item.status === 'draft' && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => runUpdate({ id: item.id, status: 'review', body: isDirty ? draftBody : undefined })}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            Send to Review
          </button>
        )}
        {item.status === 'review' && (
          <>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => runUpdate({ id: item.id, status: 'approved', body: isDirty ? draftBody : undefined })}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => runUpdate({ id: item.id, status: 'draft' })}
              className="rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50"
            >
              Back to Draft
            </button>
          </>
        )}
        {(item.status === 'approved' || item.status === 'scheduled') && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => runUpdate({ id: item.id, status: 'published' })}
            className="rounded-lg bg-success px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            Mark Published
          </button>
        )}
        {!showVariationPicker && (
          <button
            type="button"
            onClick={() => setShowVariationPicker(true)}
            className="flex items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> Generate Variation
          </button>
        )}
        {item.status === 'published' && !showRepublishPicker && (
          <button
            type="button"
            onClick={() => setShowRepublishPicker(true)}
            className="flex items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50"
          >
            <Repeat className="h-3.5 w-3.5" /> Republish
          </button>
        )}
        {canGenerateCreative && (
          <button
            type="button"
            disabled={isGeneratingCreative}
            onClick={handleGenerateCreative}
            className="flex items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {isGeneratingCreative ? 'Generating…' : 'Generate Creative'}
          </button>
        )}
        {item.status !== 'published' && (
          <button type="button" onClick={handleDelete} className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        )}
      </div>

      {showVariationPicker && (
        <div className="mt-3 space-y-2 rounded-lg border border-navy-100 p-3">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">Variation Type</label>
          <p className="text-xs text-navy-400">
            Platform: {PLATFORM_LABELS[item.platform]} · Content Type: {CONTENT_TYPE_LABELS[item.content_type]} (inherited from this item, not editable)
          </p>
          <select
            value={variationType}
            onChange={(e) => setVariationType(e.target.value as VariationType)}
            className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          >
            {VARIATION_TYPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {VARIATION_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
          {variationError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{variationError}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isGeneratingVariation}
              onClick={handleGenerateVariation}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isGeneratingVariation ? 'Generating…' : 'Generate Variation'}
            </button>
            <button
              type="button"
              disabled={isGeneratingVariation}
              onClick={() => {
                setShowVariationPicker(false);
                setVariationError(null);
              }}
              className="rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showRepublishPicker && (
        <div className="mt-3 space-y-2 rounded-lg border border-navy-100 p-3">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">Republish Content</label>
          <p className="text-xs text-navy-400">
            Platform: {PLATFORM_LABELS[item.platform]} · Content Type: {CONTENT_TYPE_LABELS[item.content_type]} (same as this item, not editable)
          </p>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">New Publication Date &amp; Time</label>
            <input
              type="datetime-local"
              value={republishDate}
              onChange={(e) => setRepublishDate(e.target.value)}
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          {republishError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{republishError}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSchedulingRepublish || !republishDate}
              onClick={handleScheduleRepublish}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Repeat className="h-3.5 w-3.5" />
              {isSchedulingRepublish ? 'Scheduling…' : 'Schedule Republish'}
            </button>
            <button
              type="button"
              disabled={isSchedulingRepublish}
              onClick={() => {
                setShowRepublishPicker(false);
                setRepublishError(null);
              }}
              className="rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {creativeError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{creativeError}</p>}

      {creativeAssets.length > 0 && (
        <div className="mt-4 border-t border-navy-100 pt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-navy-400">Creative Assets</p>
          <div className="flex flex-wrap gap-3">
            {creativeAssets.map((asset) => (
              <div key={asset.id} className="w-28 shrink-0">
                {asset.public_url ? (
                  <a href={asset.public_url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-navy-100">
                    <img src={asset.public_url} alt="Generated creative" className="h-28 w-28 object-cover" />
                  </a>
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-navy-100 bg-navy-50 text-xs text-navy-400">
                    No preview
                  </div>
                )}
                {asset.public_url && (
                  <a
                    href={asset.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    <Download className="h-3 w-3" /> Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {localVariations.length > 0 && (
      <div className="mt-3 space-y-3 border-l-2 border-brand-100 pl-3">
        {localVariations.map((variation) => (
          <ContentItemPanel
            key={variation.id}
            item={variation}
            campaign={campaign}
            onChange={(updated) => setLocalVariations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))}
            onDeleted={(id) => setLocalVariations((prev) => prev.filter((v) => v.id !== id))}
          />
        ))}
      </div>
    )}
    </>
  );
}
