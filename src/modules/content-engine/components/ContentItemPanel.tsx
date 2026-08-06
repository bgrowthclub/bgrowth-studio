import { useState } from 'react';
import { Trash2, Copy, Check } from 'lucide-react';
import { ContentItemBody, buildContentCopy } from './ContentItemBody';
import { StatusBadge } from './StatusBadge';
import { deleteContentItem, updateContentItem } from '../api/contentEngineClient';
import { buildUtmLink } from '../utmLink';
import type { ContentItem } from '../types';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS } from '../types';

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
 */
export function ContentItemPanel({ item, campaign, onChange, onDeleted }: ContentItemPanelProps) {
  const [draftBody, setDraftBody] = useState(item.body);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [contentCopied, setContentCopied] = useState(false);

  const isDirty = JSON.stringify(draftBody) !== JSON.stringify(item.body);
  const editable = item.status === 'draft' || item.status === 'review';
  const utmCampaign = campaign ?? item.campaigns;
  const contentCopy = buildContentCopy({ content_type: item.content_type, body: draftBody });

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
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-700">{PLATFORM_LABELS[item.platform]}</span>
          <span className="text-xs font-semibold text-navy-400">{CONTENT_TYPE_LABELS[item.content_type]}</span>
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
        {item.status !== 'published' && (
          <button type="button" onClick={handleDelete} className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
