import { listFiles } from '../file-library/api';
import type { LibraryFile } from '../file-library/types';
import { copyWixImage, saveDownload } from './api';
import type { DownloadDraft, DownloadFile, DownloadProduct } from './types';
import { WIX_PRODUCTS, type WixProduct } from './wixProducts';
import { WIX_TEXT } from './wixText';

export interface WixImportProgress {
  done: number;
  total: number;
  current: string;
  failed: { name: string; error: string }[];
}

// "CHK-NOT-010 BGrowthClub ... (2).pdf" → "CHK-NOT-010 BGROWTHCLUB ..."
function norm(name: string) {
  return name
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim()
    .toUpperCase();
}

function findFile(p: WixProduct, library: LibraryFile[]): DownloadFile | null {
  const pdfs = library.filter((f) => f.mime_type === 'application/pdf');
  const code = p.libraryCode ? norm(p.libraryCode) : null;
  const wix = p.wixFile ? norm(p.wixFile) : null;
  const hit =
    (code && pdfs.find((f) => norm(f.name).startsWith(code))) ||
    (code && pdfs.find((f) => norm(f.name).includes(code))) ||
    (wix && pdfs.find((f) => norm(f.name) === wix)) ||
    null;
  return hit ? { id: hit.id, name: hit.name, sizeBytes: hit.size_bytes, mimeType: hit.mime_type } : null;
}

function howtoText(wixId: string) {
  const steps = WIX_TEXT[wixId]?.howto ?? [];
  return steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
}

// Wix products that are not sold as Downloads here: the Notary Appointment
// Workspace is already a Studio Workspace (same address, so the draft can't
// be saved).
const NOT_DOWNLOADS = new Set(['ede608dd-deba-7b27-8517-922e00b2723b']);
const IMPORTABLE = WIX_PRODUCTS.filter((p) => !NOT_DOWNLOADS.has(p.wixId));

async function copyAll(urls: string[]) {
  const copied = await Promise.all(urls.map((u) => copyWixImage(u).catch(() => null)));
  return copied.filter((u): u is string => !!u);
}

/**
 * Creates a Download draft for every Wix product not imported yet (matched by
 * its Wix id). Nothing is published. Products whose PDF isn't in the File
 * Library are saved without files and show "Missing file" in the list.
 */
export async function importWixProducts(
  existing: DownloadProduct[],
  ownerEmail: string,
  onProgress: (p: WixImportProgress) => void,
  // Wix products deleted after an earlier import: not created again.
  skipped: string[] = [],
): Promise<WixImportProgress> {
  const already = new Set([...existing.map((d) => d.metadata?.wix?.id).filter(Boolean), ...skipped]);
  const todo = IMPORTABLE.filter((p) => !already.has(p.wixId));
  const library = await listFiles();
  const usedNames = new Map<string, number>();
  for (const d of existing) usedNames.set(d.name.toLowerCase(), 1);

  const progress: WixImportProgress = { done: 0, total: todo.length, current: '', failed: [] };
  for (const p of todo) {
    progress.current = p.name;
    onProgress({ ...progress });
    // Wix has a few products with the same name — the slug comes from the
    // name, so repeats get "(2)", "(3)" until renamed in review.
    const seen = usedNames.get(p.name.toLowerCase()) ?? 0;
    usedNames.set(p.name.toLowerCase(), seen + 1);
    const name = seen ? `${p.name} (${seen + 1})` : p.name;
    try {
      const [cover, ...rest] = await copyAll(p.images.slice(0, 7));
      const file = findFile(p, library);
      await saveDownload(
        {
          studioProductId: crypto.randomUUID(),
          name,
          shortDescription: p.tagline || p.name,
          categorySlug: '',
          tags: [],
          coverImageUrl: cover ?? '',
          isFree: p.price === 0,
          price: p.price ? p.price.toFixed(2) : '',
          files: file ? [file] : [],
          links: [],
          instructions: howtoText(p.wixId),
          gallery: { images: rest.slice(0, 6), video: null },
          longDescription: WIX_TEXT[p.wixId]?.longDescription ?? '',
          included: WIX_TEXT[p.wixId]?.included ?? [],
          benefits: WIX_TEXT[p.wixId]?.benefits ?? [],
          status: null,
          wix: { id: p.wixId, file: p.wixFile },
        },
        'draft',
        ownerEmail,
      );
    } catch (err) {
      progress.failed.push({ name, error: err instanceof Error ? err.message : 'Could not save.' });
    }
    progress.done += 1;
    onProgress({ ...progress });
  }
  progress.current = '';
  return progress;
}

export const WIX_PRODUCT_COUNT = IMPORTABLE.length;

/** How many Wix products are still to import (not imported, not deleted). */
export function wixLeftToImport(existing: DownloadProduct[], skipped: string[]) {
  const done = new Set([...existing.map((d) => d.metadata?.wix?.id).filter(Boolean), ...skipped]);
  return IMPORTABLE.filter((p) => !done.has(p.wixId)).length;
}

/**
 * "Update from Wix": for imported products still in Draft, attaches the PDF
 * when the File Library now has it and fills the product-page text (long
 * description, what's included, benefits, how-to) — only what is still
 * empty, so nothing already edited is overwritten.
 */
export async function updateFromWix(
  existing: DownloadProduct[],
  toDraft: (p: DownloadProduct) => DownloadDraft,
  ownerEmail: string,
  onProgress: (p: WixImportProgress) => void,
): Promise<WixImportProgress & { updated: number }> {
  const byId = new Map(WIX_PRODUCTS.map((p) => [p.wixId, p]));
  const targets = existing.filter((d) => d.metadata?.wix && d.status === 'draft');
  const library = await listFiles();
  const progress = { done: 0, total: targets.length, current: '', failed: [] as WixImportProgress['failed'], updated: 0 };
  for (const d of targets) {
    progress.current = d.name;
    onProgress({ ...progress });
    const wix = byId.get(d.metadata!.wix!.id);
    const text = WIX_TEXT[d.metadata!.wix!.id];
    const draft = toDraft(d);
    let changed = false;
    if (wix && draft.files.length === 0 && draft.links.length === 0) {
      const file = findFile(wix, library);
      if (file) {
        draft.files = [file];
        changed = true;
      }
    }
    if (text) {
      if (!draft.longDescription.trim() && text.longDescription) {
        draft.longDescription = text.longDescription;
        changed = true;
      }
      if (draft.included.length === 0 && text.included.length) {
        draft.included = text.included;
        changed = true;
      }
      if (draft.benefits.length === 0 && text.benefits.length) {
        draft.benefits = text.benefits;
        changed = true;
      }
      if (!draft.instructions.trim() && text.howto.length) {
        draft.instructions = howtoText(d.metadata!.wix!.id);
        changed = true;
      }
    }
    if (changed) {
      try {
        await saveDownload(draft, 'draft', ownerEmail);
        progress.updated += 1;
      } catch (err) {
        progress.failed.push({ name: d.name, error: err instanceof Error ? err.message : 'Could not save.' });
      }
    }
    progress.done += 1;
    onProgress({ ...progress });
  }
  progress.current = '';
  return progress;
}
