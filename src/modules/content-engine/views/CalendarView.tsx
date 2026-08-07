import { useEffect, useMemo, useState } from 'react';
import { fetchContentItems, fetchPublications } from '../api/contentEngineClient';
import { ContentItemPanel } from '../components/ContentItemPanel';
import { PublicationOccurrenceCard } from '../components/PublicationOccurrenceCard';
import type { ContentItem, ContentPublication } from '../types';

type CalendarEntry = { kind: 'item'; timestamp: number; item: ContentItem } | { kind: 'publication'; timestamp: number; publication: ContentPublication };

/**
 * Manual scheduling calendar. Two independent sources are merged into the
 * same date-grouped list, additively — the original content_items query
 * (unchanged, still exactly what it fetched/filtered/grouped before Phase
 * 2E) plus scheduled content_publications rows (Phase 2E's Republish
 * occurrences). A ContentPublication is never cast or faked into a
 * ContentItem shape to reuse ContentItemPanel — it renders through its own
 * PublicationOccurrenceCard, a real sibling component with its own,
 * narrower set of actions (see that file's own comment).
 */
export function CalendarView({ onOpenCampaign }: { onOpenCampaign: (campaignId: string) => void }) {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [publications, setPublications] = useState<ContentPublication[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContentItems()
      .then((all) => setItems(all.filter((i) => i.status === 'approved' || i.status === 'scheduled')))
      .catch((err) => setError(err.message));
    fetchPublications()
      .then((all) => setPublications(all.filter((p) => p.status === 'scheduled')))
      .catch((err) => setError(err.message));
  }, []);

  const groups = useMemo(() => {
    if (!items || !publications) return [];
    const unscheduledItems = items.filter((i) => !i.scheduled_at);
    const scheduledItems = items.filter((i) => i.scheduled_at);
    const scheduledPublications = publications.filter((p) => p.scheduled_at);

    const byDate = new Map<string, CalendarEntry[]>();
    const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    for (const item of scheduledItems) {
      const key = dateLabel(item.scheduled_at!);
      const timestamp = new Date(item.scheduled_at!).getTime();
      byDate.set(key, [...(byDate.get(key) ?? []), { kind: 'item', timestamp, item }]);
    }
    for (const publication of scheduledPublications) {
      const key = dateLabel(publication.scheduled_at!);
      const timestamp = new Date(publication.scheduled_at!).getTime();
      byDate.set(key, [...(byDate.get(key) ?? []), { kind: 'publication', timestamp, publication }]);
    }

    const dateGroups = Array.from(byDate.entries())
      .map(([label, entries]) => ({ label, entries: entries.sort((a, b) => a.timestamp - b.timestamp) }))
      .sort((a, b) => a.entries[0].timestamp - b.entries[0].timestamp);

    return [
      ...(unscheduledItems.length ? [{ label: 'Not yet scheduled', entries: unscheduledItems.map((item) => ({ kind: 'item' as const, timestamp: 0, item })) }] : []),
      ...dateGroups,
    ];
  }, [items, publications]);

  const loading = items === null || publications === null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {loading && !error && <p className="text-sm text-navy-400">Loading calendar…</p>}
      {!loading && groups.length === 0 && (
        <p className="text-sm text-navy-400">Nothing approved or scheduled yet. Approve content in a campaign first.</p>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-navy-400">{group.label}</p>
          <div className="space-y-3">
            {group.entries.map((entry) =>
              entry.kind === 'item' ? (
                <div key={`item-${entry.item.id}`}>
                  {entry.item.campaigns && (
                    <button
                      type="button"
                      onClick={() => onOpenCampaign(entry.item.campaign_id)}
                      className="mb-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      {entry.item.campaigns.name} →
                    </button>
                  )}
                  <ContentItemPanel
                    item={entry.item}
                    onChange={(updated) => setItems((prev) => (prev ? prev.map((i) => (i.id === updated.id ? updated : i)) : prev))}
                    onDeleted={(id) => setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev))}
                  />
                </div>
              ) : (
                <PublicationOccurrenceCard
                  key={`publication-${entry.publication.id}`}
                  publication={entry.publication}
                  onChanged={(updated) => setPublications((prev) => (prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev))}
                  onCancelled={(id) => setPublications((prev) => (prev ? prev.filter((p) => p.id !== id) : prev))}
                  onOpenCampaign={onOpenCampaign}
                />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
