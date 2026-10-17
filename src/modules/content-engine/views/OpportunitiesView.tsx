import { useEffect, useState } from 'react';
import { Megaphone, Search } from 'lucide-react';
import { fetchSiteSearches, type SiteSearch } from '../api/contentEngineClient';
import { NewCampaignModal } from './NewCampaignModal';

const PERIODS = [7, 30, 90] as const;
type Filter = 'missing' | 'found' | 'all';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'missing', label: 'Not found' },
  { id: 'found', label: 'Found' },
  { id: 'all', label: 'All' },
];

function formatDay(day: string) {
  const [y, m, d] = day.split('-');
  return `${m}/${d}/${y}`;
}

/**
 * Opportunities — the first step of Product Discovery: what visitors type in
 * the catalog search (bgrowth.app and the Portal's Browse), from
 * portal.site_search_stats. "Not found" searches are ideas for new products;
 * found ones can become a campaign for the product that answers them.
 */
export function OpportunitiesView({ onOpenCampaign }: { onOpenCampaign: (campaignId: string) => void }) {
  const [days, setDays] = useState<number>(30);
  const [filter, setFilter] = useState<Filter>('missing');
  const [searches, setSearches] = useState<SiteSearch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [campaignFor, setCampaignFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSearches(null);
    setError(null);
    fetchSiteSearches(days)
      .then((list) => !cancelled && setSearches(list))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [days]);

  const visible = (searches ?? []).filter((s) =>
    filter === 'all' ? true : filter === 'missing' ? s.no_results > 0 : s.no_results < s.count,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-5 text-sm text-navy-400">
        What visitors search for in the catalog on bgrowth.app and the Portal. Searches that found nothing are ideas for new products.
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-card">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === f.id ? 'bg-brand text-white' : 'text-navy-500 hover:bg-navy-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl bg-white p-1 shadow-card">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${days === p ? 'bg-navy-900 text-white' : 'text-navy-500 hover:bg-navy-50'}`}
            >
              {p} days
            </button>
          ))}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {!searches && !error && <p className="text-sm text-navy-400">Loading searches…</p>}

      {searches && visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-navy-100 bg-white p-10 text-center">
          <Search className="mx-auto h-6 w-6 text-navy-300" />
          <p className="mt-2 text-sm font-bold text-navy-700">No searches here yet</p>
          <p className="mt-1 text-sm text-navy-400">They appear as visitors use the catalog search.</p>
        </div>
      )}

      {visible.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-100 bg-navy-50/50 text-[11px] font-bold uppercase tracking-wide text-navy-400">
              <tr>
                <th className="px-4 py-3">Search</th>
                <th className="px-4 py-3 text-right">Times</th>
                <th className="hidden px-4 py-3 text-right sm:table-cell">Not found</th>
                <th className="hidden px-4 py-3 sm:table-cell">Last</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {visible.map((s) => (
                <tr key={s.query}>
                  <td className="px-4 py-3 font-semibold text-navy-900">
                    {s.query}
                    {s.no_results === s.count && (
                      <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">No product yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-navy-900">{s.count}</td>
                  <td className="hidden px-4 py-3 text-right text-navy-500 sm:table-cell">{s.no_results}</td>
                  <td className="hidden px-4 py-3 text-navy-500 sm:table-cell">{formatDay(s.last_day)}</td>
                  <td className="px-4 py-3 text-right">
                    {s.no_results < s.count && (
                      <button
                        type="button"
                        onClick={() => setCampaignFor(s.query)}
                        className="inline-flex items-center gap-1 rounded-lg border border-navy-100 px-2.5 py-1 text-[11px] font-bold text-navy-600 hover:border-brand hover:text-brand-700"
                      >
                        <Megaphone className="h-3 w-3" /> Campaign
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {campaignFor !== null && (
        <NewCampaignModal
          initialQuery={campaignFor}
          onClose={() => setCampaignFor(null)}
          onCreated={(campaign) => {
            setCampaignFor(null);
            onOpenCampaign(campaign.id);
          }}
        />
      )}
    </div>
  );
}
