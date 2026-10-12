import { apiFetch } from '../../lib/apiClient';
import { slugifyProductName } from '../../lib/publishingEngine';
import type { DownloadContent, DownloadDraft, DownloadProduct } from './types';

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

export async function listDownloads(): Promise<DownloadProduct[]> {
  const { downloads } = await parse<{ downloads: DownloadProduct[] }>(await apiFetch('/api/access-management?resource=library&downloads=1'));
  return downloads;
}

/** Saves a Download as a draft or publishes it (content_type 'pdf', Website only). */
export async function saveDownload(draft: DownloadDraft, status: 'draft' | 'published', publishedBy: string) {
  const content: DownloadContent = {
    kind: 'download',
    files: draft.files,
    links: draft.links.filter((l) => l.label.trim() && l.url.trim()).map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
    instructions: draft.instructions,
  };
  const priceCents = draft.isFree ? null : Math.round(Number(draft.price || 0) * 100);
  // Public product page details (products.metadata): "what's included" and
  // whether it's a single PDF or a kit. File ids/links stay in the content,
  // which only buyers can read.
  const kit = content.files.length > 1 || content.links.length > 0;
  const included = [
    ...content.files.map((f) => f.name.replace(/\.[a-z0-9]+$/i, '')),
    ...(content.links.length ? [`${content.links.length} editable Canva ${content.links.length === 1 ? 'template' : 'templates'}`] : []),
    ...(content.instructions.trim() ? ['Step-by-step instructions'] : []),
  ];
  const response = await apiFetch('/api/publishing-engine?action=publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studioProductId: draft.studioProductId,
      slug: slugifyProductName(draft.name),
      name: draft.name.trim(),
      shortDescription: draft.shortDescription.trim(),
      contentType: 'pdf',
      categorySlug: draft.categorySlug || undefined,
      tags: draft.tags,
      gallery: draft.gallery,
      content,
      metadata: { included, downloadKind: kit ? 'kit' : 'pdf' },
      status,
      destinationKey: 'portal',
      publishedBy,
      coverImage: draft.coverImageUrl ? { url: draft.coverImageUrl } : undefined,
      // A file can't be given back once downloaded: no trials for Downloads.
      isTrialEligible: false,
      trialDuration: null,
      trialUnit: 'days',
      isFree: draft.isFree,
      priceCents,
      currency: 'usd',
    }),
  });
  return parse<{ ok: boolean; product?: { id: string; slug: string; status: string } }>(response);
}
