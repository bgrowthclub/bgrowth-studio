import { useEffect, useState } from 'react';
import { ExternalLink, ImagePlus, UploadCloud, X } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { compressImage } from '../../../lib/utils';
import { archiveProduct, publishCalculatorToPortal, slugifyProductName } from '../../../lib/publishingEngine';
import { useWorkspaceCategories, CATEGORY_ADMIN_URL } from '../../../lib/workspaceCategories';
import type { CalculatorConfig } from '../types';

interface Props {
  config: CalculatorConfig;
  ownerEmail: string;
  onClose: () => void;
}

interface Published {
  slug: string;
  status: string;
  version: number;
}

/** The id this calculator has in the BGrowth catalog (products.studio_product_id). */
export function calculatorStudioId(config: CalculatorConfig) {
  return `calc-${config.productId}`;
}

const INPUT = 'w-full rounded-xl border border-navy-100 px-3 py-2 text-sm text-navy-800 focus:border-brand focus:outline-none';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wide text-navy-400';

/**
 * Publishes a calculator to the BGrowth Website (bgrowth.app) — sold there
 * on its own or in bundles, never on the Portal (decided 10/10/2026). Same
 * pipeline as Workspaces: price or free, optional free trial, category and
 * cover; publishing again updates it (new version).
 */
export function PublishCalculatorDialog({ config, ownerEmail, onClose }: Props) {
  const studioProductId = calculatorStudioId(config);
  const { areas, status: categoryStatus } = useWorkspaceCategories();
  const [slug, setSlug] = useState(slugifyProductName(config.name));
  const [shortDescription, setShortDescription] = useState(config.subtitle ?? '');
  const [category, setCategory] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState('');
  const [trial, setTrial] = useState(true);
  const [trialDays, setTrialDays] = useState('7');
  const [cover, setCover] = useState<{ base64: string } | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [published, setPublished] = useState<Published | null>(null);
  const [busy, setBusy] = useState<'publish' | 'archive' | 'image' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Already published? Start from what the catalog has.
  useEffect(() => {
    let cancelled = false;
    supabase
      .schema('portal')
      .from('products')
      .select('slug, short_description, is_free, price_cents, is_trial_eligible, trial_duration, status, current_version, cover_image_url, workspace_categories(slug)')
      .eq('studio_product_id', studioProductId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const row = data as Record<string, unknown>;
        setSlug(String(row.slug ?? ''));
        setShortDescription(String(row.short_description ?? ''));
        setIsFree(Boolean(row.is_free));
        setPrice(row.price_cents != null ? String(Number(row.price_cents) / 100) : '');
        setTrial(Boolean(row.is_trial_eligible));
        setTrialDays(row.trial_duration != null ? String(row.trial_duration) : '7');
        setCoverUrl((row.cover_image_url as string | null) ?? null);
        const cat = row.workspace_categories as { slug?: string } | null;
        if (cat?.slug) setCategory(cat.slug);
        setPublished({ slug: String(row.slug), status: String(row.status), version: Number(row.current_version ?? 1) });
      });
    return () => {
      cancelled = true;
    };
  }, [studioProductId]);

  async function pickImage(file: File) {
    setBusy('image');
    try {
      setCover(await compressImage(file, 1600, 1000, 0.8));
    } catch (e) {
      setMessage({ ok: false, text: 'Could not process that image — ' + (e instanceof Error ? e.message : 'unknown error') });
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setMessage(null);
    const cleanSlug = slugifyProductName(slug);
    if (!cleanSlug) return setMessage({ ok: false, text: 'Set the address (slug).' });
    if (!shortDescription.trim()) return setMessage({ ok: false, text: 'Write a short description (shown on the cards).' });
    const priceCents = Math.round(Number(price) * 100);
    if (!isFree && !(priceCents > 0)) return setMessage({ ok: false, text: 'Set a price, or mark it as free.' });
    const days = Math.round(Number(trialDays));
    if (trial && !(days > 0)) return setMessage({ ok: false, text: 'Set the trial days, or turn the trial off.' });

    setBusy('publish');
    try {
      const result = await publishCalculatorToPortal({
        studioProductId,
        config,
        slug: cleanSlug,
        shortDescription: shortDescription.trim(),
        categorySlug: category || undefined,
        status: 'published',
        publishedBy: ownerEmail || 'studio',
        coverImage: cover ? { base64: cover.base64, mimeType: 'image/jpeg', fileExtension: 'jpg' } : coverUrl ? { url: coverUrl } : undefined,
        isTrialEligible: trial,
        trialDuration: trial ? days : null,
        trialUnit: 'days',
        isFree,
        priceCents: isFree ? null : priceCents,
        currency: 'usd',
      });
      if (!result.ok || !result.product) {
        const issues = result.issues ? ` (${JSON.stringify(result.issues).slice(0, 200)})` : '';
        setMessage({ ok: false, text: `Publish failed — ${result.error ?? 'unknown error'}${issues}` });
        return;
      }
      setPublished({ slug: result.product.slug, status: result.product.status, version: result.product.version });
      setCoverUrl(result.product.coverImageUrl ?? coverUrl);
      setCover(null);
      setMessage({ ok: true, text: `Published on bgrowth.app ✓ (v${result.product.version})` });
    } finally {
      setBusy(null);
    }
  }

  async function unpublish() {
    if (!confirm('Take this calculator off bgrowth.app? Members who bought it keep it.')) return;
    setBusy('archive');
    setMessage(null);
    try {
      const result = await archiveProduct({ studioProductId, publishedBy: ownerEmail || 'studio' });
      if (!result.ok) return setMessage({ ok: false, text: 'Unpublish failed — ' + (result.error ?? 'unknown error') });
      setPublished((p) => (p ? { ...p, status: 'archived' } : p));
      setMessage({ ok: true, text: 'Taken off the site. Members who bought it keep access.' });
    } finally {
      setBusy(null);
    }
  }

  const live = published?.status === 'published';
  const image = cover?.base64 ?? coverUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-navy-900">Publish to bgrowth.app</h2>
            <p className="text-sm text-navy-400">
              {config.name}
              {published && (
                <span className={live ? ' text-emerald-600' : ' text-navy-400'}>
                  {' '}
                  · {live ? `live, v${published.version}` : 'not on the site'}
                </span>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-navy-400 hover:bg-navy-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className={LABEL}>Address</span>
            <div className="flex items-center rounded-xl border border-navy-100 pl-3 text-sm focus-within:border-brand">
              <span className="text-navy-400">bgrowth.app/product/</span>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-transparent py-2 pr-3 text-navy-800 outline-none" />
            </div>
          </label>
          <label className="block">
            <span className={LABEL}>Short description (cards)</span>
            <textarea value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} rows={2} maxLength={300} className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT} disabled={categoryStatus !== 'ready'}>
              <option value="">{categoryStatus === 'loading' ? 'Loading…' : 'No category'}</option>
              {areas.map((area) => (
                <optgroup key={area.id} label={area.name}>
                  <option value={area.slug}>{area.name} — general</option>
                  {area.children.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <a href={CATEGORY_ADMIN_URL} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-navy-400 hover:text-brand">
              Manage categories <ExternalLink className="h-3 w-3" />
            </a>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} /> Free
            </label>
            {!isFree && (
              <label className="block">
                <span className={LABEL}>Price (USD)</span>
                <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={INPUT} placeholder="9.90" />
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-navy-700">
              <input type="checkbox" checked={trial} onChange={(e) => setTrial(e.target.checked)} /> Free trial
            </label>
            {trial && (
              <label className="block">
                <span className={LABEL}>Trial days</span>
                <input type="number" min="1" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} className={INPUT} />
              </label>
            )}
          </div>

          <div>
            <span className={LABEL}>Cover image (optional)</span>
            <div className="flex items-center gap-3">
              {image ? (
                <img src={image} alt="" className="h-14 w-24 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-24 items-center justify-center rounded-lg bg-navy-50 text-[10px] text-navy-400">No image</span>
              )}
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50">
                <ImagePlus className="h-3.5 w-3.5" /> {busy === 'image' ? 'Processing…' : image ? 'Change' : 'Upload'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void pickImage(file);
                  }}
                />
              </label>
            </div>
          </div>

          {message && <p className={`rounded-xl px-3 py-2 text-xs ${message.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{message.text}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 pt-4">
            <div className="flex items-center gap-2">
              {live && published && (
                <a
                  href={`https://bgrowth.app/product/${encodeURIComponent(published.slug)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                >
                  View on site <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {live && (
                <button type="button" onClick={() => void unpublish()} disabled={busy !== null} className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50">
                  {busy === 'archive' ? 'Unpublishing…' : 'Unpublish'}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => void publish()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" /> {busy === 'publish' ? 'Publishing…' : live ? 'Publish update' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
