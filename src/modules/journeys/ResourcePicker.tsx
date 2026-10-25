import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { ResourceArticle, ResourceProduct, ResourceState } from './types';

const INPUT = 'w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-brand';

const TYPE_LABEL: Record<string, string> = { workspace: 'Workspace', calculator: 'Calculator', pdf: 'Download', bundle: 'Bundle' };

/** How a referenced resource shows to members right now. */
export function StateBadge({ state }: { state: ResourceState | 'missing' }) {
  const look: Record<string, [string, string]> = {
    available: ['Published', 'bg-emerald-50 text-emerald-700'],
    coming_soon: ['Not published — members see “Coming soon”', 'bg-amber-50 text-amber-700'],
    unavailable: ['Unavailable', 'bg-red-50 text-red-600'],
    missing: ['Not found', 'bg-red-50 text-red-600'],
  };
  const [label, cls] = look[state];
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

function productStatus(p: ResourceProduct) {
  if (p.status === 'ready_for_review') return 'reviewed';
  if (p.status === 'approved') return 'approved';
  return p.status;
}

interface ProductProps {
  products: ResourceProduct[] | null;
  value: string | undefined;
  onChange: (id: string | undefined) => void;
}

/** Choose one existing product (Workspace, calculator, Download, bundle), with its real status. */
export function ProductPicker({ products, value, onChange }: ProductProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const chosen = products?.find((p) => p.id === value);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products ?? []).filter((p) => !q || p.name.toLowerCase().includes(q) || p.slug.includes(q)).slice(0, 40);
  }, [products, query]);

  if (value && !open) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-navy-50/60 px-3 py-2 text-sm">
        <span className="min-w-0 flex-1 truncate text-navy-800">
          {chosen ? (
            <>
              {chosen.name} <span className="text-xs text-navy-400">· {TYPE_LABEL[chosen.content_type] ?? chosen.content_type} · {productStatus(chosen)}</span>
            </>
          ) : products ? (
            'A product that no longer exists or can’t be used'
          ) : (
            'Loading…'
          )}
        </span>
        {products && <StateBadge state={chosen ? chosen.state : 'missing'} />}
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-brand-600 hover:underline">
          Change
        </button>
        <button type="button" onClick={() => onChange(undefined)} className="text-navy-400 hover:text-red-500" aria-label="Clear product">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-navy-100 p-2">
      <div className="relative mb-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-navy-300" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" className={`${INPUT} pl-8`} />
      </div>
      <ul className="max-h-56 overflow-y-auto">
        {products === null && <li className="p-2 text-sm text-navy-400">Loading…</li>}
        {matches.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => {
                onChange(p.id);
                setOpen(false);
                setQuery('');
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-navy-50"
            >
              <span className="min-w-0 flex-1 truncate">
                {p.name}{' '}
                <span className="text-xs text-navy-400">
                  · {TYPE_LABEL[p.content_type] ?? p.content_type} · {p.is_free ? 'Free' : `$${((p.price_cents ?? 0) / 100).toFixed(2)}`}
                </span>
              </span>
              <StateBadge state={p.state} />
            </button>
          </li>
        ))}
        {products && matches.length === 0 && <li className="p-2 text-sm text-navy-400">No product found.</li>}
      </ul>
      {value && (
        <button type="button" onClick={() => setOpen(false)} className="mt-1 text-xs font-semibold text-navy-500 hover:underline">
          Cancel
        </button>
      )}
    </div>
  );
}

interface ArticleProps {
  articles: ResourceArticle[] | null;
  value: string | undefined;
  onChange: (slug: string | undefined) => void;
}

/** Choose one Knowledge article, with its real status. */
export function ArticlePicker({ articles, value, onChange }: ArticleProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const chosen = articles?.find((a) => a.slug === value);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (articles ?? []).filter((a) => !q || a.title.toLowerCase().includes(q) || a.slug.includes(q)).slice(0, 40);
  }, [articles, query]);

  if (value && !open) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-navy-50/60 px-3 py-2 text-sm">
        <span className="min-w-0 flex-1 truncate text-navy-800">
          {chosen ? (
            <>
              {chosen.title}{' '}
              <span className="text-xs text-navy-400">
                · {chosen.status}
                {chosen.access !== 'members' && ` · ${chosen.access === 'everyone' ? 'everyone' : chosen.access.replace('plan:', 'plan ')}`}
              </span>
            </>
          ) : articles ? (
            'An article that no longer exists'
          ) : (
            'Loading…'
          )}
        </span>
        {articles && <StateBadge state={chosen ? chosen.state : 'missing'} />}
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-brand-600 hover:underline">
          Change
        </button>
        <button type="button" onClick={() => onChange(undefined)} className="text-navy-400 hover:text-red-500" aria-label="Clear article">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-navy-100 p-2">
      <div className="relative mb-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-navy-300" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Knowledge articles" className={`${INPUT} pl-8`} />
      </div>
      <ul className="max-h-56 overflow-y-auto">
        {articles === null && <li className="p-2 text-sm text-navy-400">Loading…</li>}
        {matches.map((a) => (
          <li key={a.slug}>
            <button
              type="button"
              onClick={() => {
                onChange(a.slug);
                setOpen(false);
                setQuery('');
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-navy-50"
            >
              <span className="min-w-0 flex-1 truncate">
                {a.title} <span className="text-xs text-navy-400">· {a.status}</span>
              </span>
              <StateBadge state={a.state} />
            </button>
          </li>
        ))}
        {articles && matches.length === 0 && <li className="p-2 text-sm text-navy-400">No article found.</li>}
      </ul>
      {value && (
        <button type="button" onClick={() => setOpen(false)} className="mt-1 text-xs font-semibold text-navy-500 hover:underline">
          Cancel
        </button>
      )}
    </div>
  );
}
