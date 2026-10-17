import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { searchPublishedProducts } from '../../content-engine/api/contentEngineClient';
import type { LinkedProduct } from '../types';

function kindLabel(type?: string) {
  if (type === 'pdf') return 'Download';
  if (type === 'bundle') return 'Bundle';
  if (type === 'calculator') return 'Calculator';
  return 'Workspace';
}

interface ProductPickerProps {
  product: LinkedProduct | null;
  onChange: (product: LinkedProduct | null) => void;
}

/**
 * Optional: the BGrowth product this photo post promotes — same published
 * product list as Content Engine's New Campaign picker.
 */
export function ProductPicker({ product, onChange }: ProductPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LinkedProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchPublishedProducts(query)
        .then((list) => {
          if (cancelled) return;
          setError(null);
          setResults(
            list.map((p) => ({ id: p.product_id, slug: p.slug, name: p.name, short_description: p.short_description, content_type: p.content_type })),
          );
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load products.');
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, product]);

  if (product) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-brand bg-brand-50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-brand-700">{product.name}</p>
          <p className="text-[11px] text-navy-400">{kindLabel(product.content_type)} · bgrowth.app/product/{product.slug}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="shrink-0 text-navy-400 hover:text-red-600" aria-label="Remove product">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-3">
      <div className="flex items-center gap-2 rounded-lg border border-navy-100 px-3 py-2">
        <Search className="h-4 w-4 text-navy-300" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search published products…"
          className="w-full text-sm outline-none"
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
        {results.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-navy-700 hover:bg-navy-50"
          >
            <span className="truncate">{p.name}</span>
            <span className="ml-2 shrink-0 text-[11px] text-navy-400">{kindLabel(p.content_type)}</span>
          </button>
        ))}
        {!error && results.length === 0 && <p className="px-3 py-2 text-xs text-navy-400">No published products found.</p>}
      </div>
    </div>
  );
}
