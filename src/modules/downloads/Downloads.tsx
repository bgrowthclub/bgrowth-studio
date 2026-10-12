import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText, Package, Plus } from 'lucide-react';
import { PrimaryButton } from '../../components/ui/Button';
import { EMPTY_GALLERY } from '../../lib/productGallery';
import { listDownloads } from './api';
import { DownloadEditor } from './DownloadEditor';
import type { DownloadDraft, DownloadProduct } from './types';

interface Props {
  ownerEmail: string;
  onHome?: () => void;
}

function toDraft(p: DownloadProduct | null): DownloadDraft {
  return {
    studioProductId: p?.studio_product_id ?? crypto.randomUUID(),
    name: p?.name ?? '',
    shortDescription: p?.short_description ?? '',
    categorySlug: p?.category_slug ?? '',
    tags: p?.tags ?? [],
    coverImageUrl: p?.cover_image_url ?? '',
    isFree: p?.is_free ?? false,
    price: p?.price_cents != null ? (p.price_cents / 100).toFixed(2) : '',
    files: p?.content?.files ?? [],
    links: p?.content?.links ?? [],
    instructions: p?.content?.instructions ?? '',
    gallery: p?.gallery
      ? { images: Array.isArray(p.gallery.images) ? p.gallery.images : [], video: p.gallery.video ?? null }
      : EMPTY_GALLERY,
    status: p?.status ?? null,
  };
}

/**
 * Studio → Downloads: single PDFs and kits (several files, Canva links,
 * instructions) built from the File Library and sold on bgrowth.app
 * (content_type 'pdf'). Buyers download from their member area.
 */
export function Downloads({ ownerEmail, onHome }: Props) {
  const [items, setItems] = useState<DownloadProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DownloadDraft | null>(null);

  const load = useCallback(() => {
    listDownloads()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load downloads.'));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans">
      <header className="flex items-center gap-3 border-b border-navy-100 bg-white px-4 py-4 sm:px-6">
        <button type="button" onClick={onHome} className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
          <ArrowLeft className="h-4 w-4" /> Home
        </button>
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-brand-600" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">BGrowth Studio</p>
            <h1 className="text-sm font-extrabold text-navy-900">Downloads</h1>
          </div>
        </div>
      </header>

      {editing ? (
        <DownloadEditor key={editing.studioProductId} initial={editing} ownerEmail={ownerEmail} onBack={() => setEditing(null)} onSaved={load} />
      ) : (
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-navy-500">Single PDFs and kits made from your files, sold on bgrowth.app. Buyers download them from their member area.</p>
            <PrimaryButton type="button" size="sm" onClick={() => setEditing(toDraft(null))}>
              <Plus className="h-4 w-4" /> New download
            </PrimaryButton>
          </div>
          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          <div className="overflow-hidden rounded-xl border border-navy-100 bg-white">
            {items === null && !error && <p className="p-6 text-sm text-navy-400">Loading…</p>}
            {items?.length === 0 && <p className="p-6 text-sm text-navy-400">No downloads yet.</p>}
            {items?.map((p) => {
              const files = p.content?.files.length ?? 0;
              const kit = files > 1 || (p.content?.links.length ?? 0) > 0;
              const Icon = kit ? Package : FileText;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setEditing(toDraft(p))}
                  className="flex w-full items-center gap-3 border-t border-navy-50 px-4 py-3 text-left first:border-t-0 hover:bg-navy-50/50"
                >
                  <Icon className="h-5 w-5 shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">{p.name}</p>
                    <p className="text-xs text-navy-400">
                      {kit ? 'Kit™' : 'PDF™'} · {files} {files === 1 ? 'file' : 'files'} · {p.is_free ? 'Free' : `$${((p.price_cents ?? 0) / 100).toFixed(2)}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      p.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-navy-50 text-navy-500'
                    }`}
                  >
                    {p.status}
                  </span>
                </button>
              );
            })}
          </div>
        </main>
      )}
    </div>
  );
}
