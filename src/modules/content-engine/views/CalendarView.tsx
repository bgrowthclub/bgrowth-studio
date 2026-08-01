import { useEffect, useMemo, useState } from 'react';
import { fetchContentItems } from '../api/contentEngineClient';
import { ContentItemPanel } from '../components/ContentItemPanel';
import type { ContentItem } from '../types';

/**
 * Manual scheduling calendar for Phase 1 — no dedicated calendar table (per
 * the approved architecture); this simply groups approved/scheduled
 * content_items by their own scheduled_at, which is exactly what "set one
 * date on this item" scheduling needs. An admin sets/changes the date from
 * the same ContentItemPanel used everywhere else, and marks it Published
 * here once it's actually posted.
 */
export function CalendarView({ onOpenCampaign }: { onOpenCampaign: (campaignId: string) => void }) {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContentItems()
      .then((all) => setItems(all.filter((i) => i.status === 'approved' || i.status === 'scheduled')))
      .catch((err) => setError(err.message));
  }, []);

  const groups = useMemo(() => {
    if (!items) return [];
    const unscheduled = items.filter((i) => !i.scheduled_at);
    const scheduled = items
      .filter((i) => i.scheduled_at)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

    const byDate = new Map<string, ContentItem[]>();
    for (const item of scheduled) {
      const key = new Date(item.scheduled_at!).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      byDate.set(key, [...(byDate.get(key) ?? []), item]);
    }

    return [
      ...(unscheduled.length ? [{ label: 'Not yet scheduled', items: unscheduled }] : []),
      ...Array.from(byDate.entries()).map(([label, groupItems]) => ({ label, items: groupItems })),
    ];
  }, [items]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {!items && !error && <p className="text-sm text-navy-400">Loading calendar…</p>}
      {items && groups.length === 0 && (
        <p className="text-sm text-navy-400">Nothing approved or scheduled yet. Approve content in a campaign first.</p>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-navy-400">{group.label}</p>
          <div className="space-y-3">
            {group.items.map((item) => (
              <div key={item.id}>
                {item.campaigns && (
                  <button type="button" onClick={() => onOpenCampaign(item.campaign_id)} className="mb-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    {item.campaigns.name} →
                  </button>
                )}
                <ContentItemPanel
                  item={item}
                  onChange={(updated) => setItems((prev) => (prev ? prev.map((i) => (i.id === updated.id ? updated : i)) : prev))}
                  onDeleted={(id) => setItems((prev) => (prev ? prev.filter((i) => i.id !== id) : prev))}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
