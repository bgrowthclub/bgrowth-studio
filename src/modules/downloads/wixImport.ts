import { listFiles } from '../file-library/api';
import type { LibraryFile } from '../file-library/types';
import { copyWixImage, saveDownload } from './api';
import type { DownloadFile, DownloadProduct } from './types';
import { WIX_PRODUCTS, type WixProduct } from './wixProducts';

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
): Promise<WixImportProgress> {
  const already = new Set(existing.map((d) => d.metadata?.wix?.id).filter(Boolean));
  const todo = WIX_PRODUCTS.filter((p) => !already.has(p.wixId));
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
          instructions: '',
          gallery: { images: rest.slice(0, 6), video: null },
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

export const WIX_PRODUCT_COUNT = WIX_PRODUCTS.length;
