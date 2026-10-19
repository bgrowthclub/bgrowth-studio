import { useState } from 'react';
import { CheckCircle, ExternalLink, Link2Off, RefreshCw } from 'lucide-react';
import { fetchOldLinks, type OldLink } from './api/knowledgeEngineClient';

interface OldLinksCheckProps {
  onEditArticle: (id: string) => void;
}

const KIND_LABEL: Record<string, string> = { article: 'Article', download: 'Download', workspace: 'Workspace', calculator: 'Calculator', bundle: 'Bundle' };

// Studio Sprint 108: lists articles and products that still use an image on
// Wix's servers or a link to the old site, to fix by hand while reviewing.
// It only shows — nothing is changed here.
export function OldLinksCheck({ onEditArticle }: OldLinksCheckProps) {
  const [found, setFound] = useState<OldLink[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    setLoading(true);
    setError(null);
    fetchOldLinks()
      .then(setFound)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not run the check.'))
      .finally(() => setLoading(false));
  };

  // One row per article/product, with every place found inside it.
  const groups = (found ?? []).reduce<Record<string, { first: OldLink; hits: OldLink[] }>>((acc, f) => {
    const key = `${f.kind}:${f.id}`;
    (acc[key] ??= { first: f, hits: [] }).hits.push(f);
    return acc;
  }, {});
  const list = Object.values(groups);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-navy-800">Old links check</p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-navy-400">
              Finds articles and products (downloads, Workspaces, calculators, bundles) that still use an image hosted on Wix (wixstatic.com) or a link to the old site
              (benterprises.biz, wix.com). Nothing is changed here — open each one and replace the image or link when you review it.
            </p>
          </div>
          <button type="button" onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Checking…' : found ? 'Check again' : 'Check now'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </div>

      {found && list.length === 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
          <CheckCircle className="h-5 w-5" /> Nothing found — every article and product uses images and links on BGrowth.
        </div>
      )}

      {list.length > 0 && (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-navy-400">
            {list.length} {list.length === 1 ? 'item' : 'items'} · {found?.length} {found?.length === 1 ? 'place' : 'places'}
          </p>
          <div className="space-y-3">
            {list.map(({ first, hits }) => (
              <div key={`${first.kind}:${first.id}`} className="rounded-2xl border border-navy-100 bg-white p-4 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="mr-2 rounded-full bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase text-navy-500">{KIND_LABEL[first.kind] ?? first.kind}</span>
                    <span className="text-sm font-bold text-navy-800">{first.title}</span>
                    {first.status && <span className="ml-2 text-xs text-navy-400">{first.status}</span>}
                  </div>
                  {first.kind === 'article' ? (
                    <button type="button" onClick={() => onEditArticle(first.id)} className="text-xs font-bold text-brand-600 hover:underline">
                      Open to fix
                    </button>
                  ) : (
                    <span className="text-xs text-navy-400">Fix it in {first.kind === 'download' ? 'Downloads' : 'its publish screen'}</span>
                  )}
                </div>
                <ul className="mt-3 space-y-1.5">
                  {hits.map((h, i) => (
                    <li key={i} className="flex min-w-0 items-start gap-2 text-xs">
                      <Link2Off className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span className="shrink-0 font-semibold text-navy-600">{h.where}:</span>
                      <a href={h.url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 truncate text-navy-400 hover:text-brand-600">
                        <span className="truncate">{h.url}</span> <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
