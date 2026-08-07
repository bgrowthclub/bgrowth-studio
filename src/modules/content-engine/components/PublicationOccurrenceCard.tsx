import { useState } from 'react';
import { Calendar, Repeat, X } from 'lucide-react';
import { cancelPublication, updatePublication } from '../api/contentEngineClient';
import type { ContentPublication } from '../types';
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS } from '../types';

interface PublicationOccurrenceCardProps {
  publication: ContentPublication;
  onChanged: (updated: ContentPublication) => void;
  onCancelled: (id: string) => void;
  onOpenCampaign?: (campaignId: string) => void;
}

/**
 * Represents one content_publications OCCURRENCE — never editable content.
 * Deliberately a sibling to ContentItemPanel, not a variant of it: a
 * ContentPublication has no body, no authoring lifecycle, and none of
 * ContentItemPanel's actions (Save Edits, Send to Review, Approve, Mark
 * Published, Generate Variation, Delete Content) make sense here — this
 * card only ever touches its own scheduled_at or deletes itself, never the
 * underlying content_item, which stays completely untouched by every
 * action on this card. Used by CalendarView for the scheduled 'republish'
 * occurrences it fetches alongside its existing content_items query.
 */
export function PublicationOccurrenceCard({ publication, onChanged, onCancelled, onOpenCampaign }: PublicationOccurrenceCardProps) {
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(publication.scheduled_at ? publication.scheduled_at.slice(0, 16) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentItem = publication.content_items;
  const campaign = contentItem?.campaigns;

  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updatePublication({ id: publication.id, scheduledAt: new Date(rescheduleDate).toISOString() });
      onChanged({ ...updated, content_items: updated.content_items ?? publication.content_items });
      setIsRescheduling(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this scheduled republish? The original content is not affected.')) return;
    setError(null);
    try {
      await cancelPublication(publication.id);
      onCancelled(publication.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel.');
    }
  };

  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {contentItem && <span className="rounded-lg bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-700">{PLATFORM_LABELS[contentItem.platform]}</span>}
        <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-600">
          <Repeat className="h-3 w-3" /> Republish
        </span>
      </div>

      {campaign && <p className="text-sm font-extrabold text-navy-900">{campaign.name}</p>}
      {contentItem && <p className="mt-0.5 text-xs text-navy-400">{CONTENT_TYPE_LABELS[contentItem.content_type]}</p>}

      <p className="mt-2 flex items-center gap-1.5 text-xs text-navy-500">
        <Calendar className="h-3.5 w-3.5" />
        {publication.scheduled_at ? new Date(publication.scheduled_at).toLocaleString() : 'No date set'}
      </p>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      {isRescheduling ? (
        <div className="mt-3 space-y-2 rounded-lg border border-navy-100 p-3">
          <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400">New Date &amp; Time</label>
          <input
            type="datetime-local"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSaving || !rescheduleDate}
              onClick={handleReschedule}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving…' : 'Save Date'}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsRescheduling(false);
                setRescheduleDate(publication.scheduled_at ? publication.scheduled_at.slice(0, 16) : '');
              }}
              className="rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {contentItem && onOpenCampaign && (
            <button
              type="button"
              onClick={() => onOpenCampaign(contentItem.campaign_id)}
              className="rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50"
            >
              Open Content
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsRescheduling(true)}
            className="rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" /> Cancel Republish
          </button>
        </div>
      )}
    </div>
  );
}
