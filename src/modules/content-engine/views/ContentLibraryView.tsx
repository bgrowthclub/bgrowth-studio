import { useEffect, useMemo, useState } from 'react';
import { fetchContentItems } from '../api/contentEngineClient';
import { ContentItemPanel } from '../components/ContentItemPanel';
import type { ContentItem, ContentItemStatus, Platform } from '../types';
import { PLATFORM_LABELS, STATUS_LABELS } from '../types';

export function ContentLibraryView({ onOpenCampaign }: { onOpenCampaign: (campaignId: string) => void }) {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContentItemStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');

  useEffect(() => {
    fetchContentItems()
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  const visible = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => (statusFilter === 'all' || item.status === statusFilter) && (platformFilter === 'all' || item.platform === platformFilter));
  }, [items, statusFilter, platformFilter]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContentItemStatus | 'all')}
          className="rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
          className="rounded-lg border border-navy-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="all">All platforms</option>
          {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {!items && !error && <p className="text-sm text-navy-400">Loading content library…</p>}
      {items && visible.length === 0 && <p className="text-sm text-navy-400">No content items match these filters.</p>}

      <div className="space-y-3">
        {visible.map((item) => (
          <div key={item.id}>
            {item.campaigns && (
              <button
                type="button"
                onClick={() => onOpenCampaign(item.campaign_id)}
                className="mb-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
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
  );
}
