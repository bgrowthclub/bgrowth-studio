import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, ImagePlus, Loader2, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { Button, PrimaryButton } from '../../components/ui/Button';
import TagPicker from '../../components/TagPicker';
import GalleryEditor from '../../components/GalleryEditor';
import { CATEGORY_ADMIN_URL, useWorkspaceCategories } from '../../lib/workspaceCategories';
import { MAX_GALLERY_IMAGES, uploadGalleryFile } from '../../lib/productGallery';
import { getDownloadUrl, listFiles } from '../file-library/api';
import type { LibraryFile } from '../file-library/types';
import { releaseAction, saveDownload } from './api';
import { pdfPreviewImage } from './pdfPreview';
import { ReleasePanel } from './ReleasePanel';
import type { DownloadDraft } from './types';

interface Props {
  initial: DownloadDraft;
  ownerEmail: string;
  onBack: () => void;
  onSaved: () => void;
}

const INPUT = 'w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-brand';
const LABEL = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400';
const CARD = 'rounded-xl border border-navy-100 bg-white p-5';

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** One Download: files from the library, Canva links, instructions, page details and price. */
export function DownloadEditor({ initial, ownerEmail, onBack, onSaved }: Props) {
  const [draft, setDraft] = useState<DownloadDraft>(initial);
  const { areas, status: categoryStatus } = useWorkspaceCategories();
  const [library, setLibrary] = useState<LibraryFile[] | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<null | 'cover' | 'preview' | 'draft' | 'published'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const set = <K extends keyof DownloadDraft>(key: K, value: DownloadDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  useEffect(() => {
    listFiles()
      .then(setLibrary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the files.'));
  }, []);

  const chosen = new Set(draft.files.map((f) => f.id));
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (library ?? []).filter((f) => !chosen.has(f.id) && (!q || f.name.toLowerCase().includes(q) || (f.folder ?? '').toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, query, draft.files]);

  const kind = draft.files.length > 1 || draft.links.length > 0 ? 'Kit™' : 'PDF™';
  const pdfs = draft.files.filter((f) => f.mimeType === 'application/pdf');
  const galleryRoom = MAX_GALLERY_IMAGES - draft.gallery.images.length;

  function addFile(f: LibraryFile) {
    set('files', [...draft.files, { id: f.id, name: f.name, sizeBytes: f.size_bytes, mimeType: f.mime_type }]);
  }

  async function uploadCover(file: File | undefined) {
    if (!file) return;
    setBusy('cover');
    setError(null);
    try {
      set('coverImageUrl', await uploadGalleryFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(null);
    }
  }

  // First page of each PDF (top part, faded, watermarked) into the gallery.
  async function generatePreview() {
    setBusy('preview');
    setError(null);
    const added: string[] = [];
    try {
      for (const f of pdfs.slice(0, galleryRoom)) {
        const image = await pdfPreviewImage(await getDownloadUrl(f.id), f.name);
        added.push(await uploadGalleryFile(image));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the preview.');
    } finally {
      if (added.length) setDraft((d) => ({ ...d, gallery: { ...d.gallery, images: [...d.gallery.images, ...added] } }));
      setBusy(null);
    }
  }

  async function save(status: 'draft' | 'published'): Promise<boolean> {
    setError(null);
    setNotice(null);
    const fail = (message: string) => {
      setError(message);
      return false;
    };
    if (!draft.name.trim()) return fail('Give the product a name.');
    if (!draft.shortDescription.trim()) return fail('Write a short description.');
    if (status === 'published' && !draft.files.length) return fail('Add at least one file before publishing.');
    if (!draft.isFree && !(Number(draft.price) > 0)) return fail('Set a price, or mark it as free.');
    setBusy(status);
    try {
      const result = await saveDownload(draft, status, ownerEmail);
      setDraft((d) => ({
        ...d,
        status,
        productId: result.product?.id ?? d.productId ?? null,
        ...(status === 'draft' ? { scheduledPublishAt: null, reviewedBy: null, approvedBy: null } : {}),
      }));
      setNotice(status === 'published' ? 'Published — it is on bgrowth.app now.' : 'Draft saved.');
      onSaved();
      return true;
    } catch (err) {
      return fail(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!draft.productId) return;
    if (!window.confirm(`Delete “${draft.name}”? This can’t be undone. Its files stay in the File Library.`)) return;
    setError(null);
    try {
      await releaseAction(draft.productId, { action: 'delete' });
      onSaved();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
    }
  }

  // Imported Wix products go through review and approval before they can
  // be published; other products can still be published straight away.
  const canPublishDirectly = !draft.wix || draft.status === 'approved' || draft.status === 'published';

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="text-xs font-semibold text-brand-600 hover:underline">
          ← All downloads
        </button>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">{kind}</span>
        {draft.status && <span className="text-xs text-navy-400">Status: {draft.status}</span>}
      </div>

      <section className={CARD}>
        <h2 className="mb-3 text-sm font-extrabold text-navy-900">Files</h2>
        {draft.files.length === 0 && <p className="mb-3 text-sm text-navy-400">No files yet. Add one PDF for a single PDF, or several for a kit.</p>}
        <ul className="space-y-1.5">
          {draft.files.map((f, i) => (
            <li key={f.id} className="flex items-center gap-2 rounded-lg bg-navy-50/60 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="min-w-0 flex-1 truncate text-navy-800">{f.name}</span>
              <span className="text-xs text-navy-400">{formatSize(f.sizeBytes)}</span>
              <button type="button" onClick={() => set('files', draft.files.filter((_, j) => j !== i))} className="text-navy-400 hover:text-red-500" aria-label={`Remove ${f.name}`}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        {picking ? (
          <div className="mt-3 rounded-lg border border-navy-100 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-navy-300" />
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the library" className={`${INPUT} pl-8`} />
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPicking(false)}>
                Done
              </Button>
            </div>
            <ul className="max-h-60 overflow-y-auto">
              {library === null && <li className="p-2 text-sm text-navy-400">Loading…</li>}
              {matches.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => addFile(f)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-navy-50">
                    <Plus className="h-3.5 w-3.5 text-brand-600" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-navy-300">{f.folder ?? ''}</span>
                  </button>
                </li>
              ))}
              {library && matches.length === 0 && <li className="p-2 text-sm text-navy-400">No more files. Add files in Studio → Files.</li>}
            </ul>
          </div>
        ) : (
          <Button type="button" size="sm" className="mt-3" onClick={() => setPicking(true)}>
            <Plus className="h-4 w-4" /> Add from library
          </Button>
        )}
      </section>

      <section className={CARD}>
        <h2 className="mb-1 text-sm font-extrabold text-navy-900">Canva links (optional)</h2>
        <p className="mb-3 text-xs text-navy-400">Buyers open these to make their own copy in Canva.</p>
        <div className="space-y-2">
          {draft.links.map((l, i) => (
            <div key={i} className="flex flex-wrap gap-2">
              <input
                value={l.label}
                onChange={(e) => set('links', draft.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                placeholder="Name, e.g. Editable certificate (Canva)"
                className={`${INPUT} min-w-[200px] flex-1`}
              />
              <input
                value={l.url}
                onChange={(e) => set('links', draft.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                placeholder="https://www.canva.com/…"
                className={`${INPUT} min-w-[240px] flex-[2]`}
              />
              <button type="button" onClick={() => set('links', draft.links.filter((_, j) => j !== i))} className="text-navy-400 hover:text-red-500" aria-label="Remove link">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button type="button" size="sm" className="mt-3" onClick={() => set('links', [...draft.links, { label: '', url: '' }])}>
          <Plus className="h-4 w-4" /> Add link
        </Button>
      </section>

      <section className={CARD}>
        <h2 className="mb-1 text-sm font-extrabold text-navy-900">How to use (optional)</h2>
        <p className="mb-3 text-xs text-navy-400">Shown to buyers above their files.</p>
        <textarea value={draft.instructions} onChange={(e) => set('instructions', e.target.value)} rows={6} className={INPUT} placeholder="Step by step: how to print, fill in, or edit in Canva…" />
      </section>

      <section className={`${CARD} space-y-4`}>
        <h2 className="text-sm font-extrabold text-navy-900">Product page</h2>
        <div>
          <span className={LABEL}>Name</span>
          <input value={draft.name} onChange={(e) => set('name', e.target.value)} className={INPUT} placeholder="e.g. Jurat Certificate Legal B&W" />
        </div>
        <div>
          <span className={LABEL}>Short description</span>
          <textarea value={draft.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} rows={3} className={INPUT} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Category</span>
            <select value={draft.categorySlug} onChange={(e) => set('categorySlug', e.target.value)} className={INPUT} disabled={categoryStatus !== 'ready'}>
              <option value="">{categoryStatus === 'loading' ? 'Loading…' : 'No category'}</option>
              {areas.map((area) => (
                <optgroup key={area.id} label={area.name}>
                  <option value={area.slug}>{area.name} (whole area)</option>
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
          <div>
            <span className={LABEL}>Price</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-navy-700">
                <input type="checkbox" checked={draft.isFree} onChange={(e) => set('isFree', e.target.checked)} /> Free
              </label>
              {!draft.isFree && (
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-2 text-sm text-navy-400">$</span>
                  <input type="number" min="0" step="0.01" value={draft.price} onChange={(e) => set('price', e.target.value)} className={`${INPUT} pl-6`} />
                </div>
              )}
            </div>
            <p className="mt-1 text-[11px] text-navy-300">No free trial for downloads.</p>
          </div>
        </div>
        <div>
          <span className={LABEL}>Tags</span>
          <TagPicker value={draft.tags} onChange={(tags) => set('tags', tags)} manageUrl="https://bgrowth.app/platform/admin/tags" />
        </div>
        <div>
          <span className={LABEL}>Cover image</span>
          <div className="flex items-center gap-3">
            {draft.coverImageUrl ? (
              <img src={draft.coverImageUrl} alt="" className="h-16 w-16 rounded-lg border border-navy-100 object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-navy-200 text-navy-300">
                <ImagePlus className="h-5 w-5" />
              </div>
            )}
            <label className="cursor-pointer rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 shadow-sm hover:bg-navy-50">
              {busy === 'cover' ? 'Uploading…' : draft.coverImageUrl ? 'Replace image' : 'Upload image'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void uploadCover(e.target.files?.[0])} />
            </label>
          </div>
        </div>
        <div>
          <span className={LABEL}>Gallery</span>
          {pdfs.length > 0 && galleryRoom > 0 && (
            <Button type="button" size="sm" className="mb-3" disabled={busy !== null} onClick={() => void generatePreview()}>
              {busy === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate preview from {pdfs.length > 1 ? 'the PDFs' : 'the PDF'}
            </Button>
          )}
          <GalleryEditor value={draft.gallery} onChange={(gallery) => set('gallery', gallery)} />
          <p className="mt-1 text-[11px] text-navy-300">The preview shows only the top of the first page, faded, with a large BGrowth watermark.</p>
        </div>
      </section>

      <section className={`${CARD} space-y-4`}>
        <div>
          <h2 className="text-sm font-extrabold text-navy-900">Product page text</h2>
          <p className="text-xs text-navy-400">Shown on the product page on bgrowth.app. One item per line in the lists.</p>
        </div>
        <label className="block">
          <span className={LABEL}>Long description</span>
          <textarea
            value={draft.longDescription}
            onChange={(e) => set('longDescription', e.target.value)}
            rows={7}
            className={INPUT}
            placeholder="A few paragraphs about the product. Leave empty to use the short description."
          />
        </label>
        <label className="block">
          <span className={LABEL}>What's included</span>
          <textarea
            value={draft.included.join('\n')}
            onChange={(e) => set('included', e.target.value.split('\n'))}
            rows={6}
            className={INPUT}
            placeholder="Leave empty to list the files."
          />
        </label>
        <label className="block">
          <span className={LABEL}>Benefits</span>
          <textarea value={draft.benefits.join('\n')} onChange={(e) => set('benefits', e.target.value.split('\n'))} rows={5} className={INPUT} />
        </label>
      </section>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {notice && <p className="text-sm font-medium text-emerald-600">{notice}</p>}
      {draft.productId && draft.status !== 'published' && draft.status !== 'archived' ? (
        <ReleasePanel
          key={`${draft.status}-${draft.scheduledPublishAt ?? ''}`}
          productId={draft.productId}
          status={draft.status}
          scheduledAt={draft.scheduledPublishAt ?? null}
          reviewedBy={draft.reviewedBy ?? null}
          approvedBy={draft.approvedBy ?? null}
          ownerEmail={ownerEmail}
          saveFirst={() => save('draft')}
          onChanged={(next) => {
            setDraft((d) => ({
              ...d,
              status: next.status,
              scheduledPublishAt: next.scheduledAt,
              ...(next.reviewedBy !== undefined ? { reviewedBy: next.reviewedBy } : {}),
              ...(next.approvedBy !== undefined ? { approvedBy: next.approvedBy } : {}),
            }));
            onSaved();
          }}
        />
      ) : (
        !draft.productId && <p className="text-xs text-navy-400">Save a draft to start the release steps (review, approval, date).</p>
      )}
      <div className="flex flex-wrap gap-2 pb-10">
        {canPublishDirectly && (
          <PrimaryButton type="button" disabled={busy !== null} onClick={() => void save('published')}>
            {busy === 'published' ? 'Publishing…' : 'Publish'}
          </PrimaryButton>
        )}
        {draft.productId && draft.status !== 'published' && (
          <Button type="button" disabled={busy !== null} onClick={() => void remove()} className="text-red-500 hover:border-red-200 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
        <Button type="button" disabled={busy !== null} onClick={() => void save('draft')}>
          {busy === 'draft' ? 'Saving…' : draft.status === 'published' ? 'Save as draft (hides it)' : 'Save draft'}
        </Button>
      </div>
    </div>
  );
}
