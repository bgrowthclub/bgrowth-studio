import { apiFetch } from './apiClient';
import { supabase } from './supabaseClient';

/**
 * Product page gallery (Portal migration 0050): up to 6 images and one short
 * video (a YouTube/TikTok/Instagram link or an uploaded file), shown as a
 * carousel on the Website's product page. Files go to the public
 * portal-product-assets bucket; the publish sends the URLs.
 */
export interface ProductGallery {
  images: string[];
  video: { kind: 'link' | 'file'; url: string } | null;
}

export const MAX_GALLERY_IMAGES = 6;
export const EMPTY_GALLERY: ProductGallery = { images: [], video: null };

/** The published product's gallery (null = not published yet / not readable). */
export async function fetchPublishedGallery(studioProductId: string): Promise<ProductGallery | null> {
  const { data, error } = await supabase
    .schema('portal')
    .from('products')
    .select('gallery')
    .eq('studio_product_id', studioProductId)
    .maybeSingle();
  if (error || !data) return null;
  const g = (data as { gallery?: Partial<ProductGallery> | null }).gallery ?? {};
  return {
    images: Array.isArray(g.images) ? g.images.filter((u): u is string => typeof u === 'string') : [],
    video: g.video && typeof g.video.url === 'string' ? g.video : null,
  };
}

/** Uploads one image or video and returns its public URL. */
export async function uploadGalleryFile(file: File): Promise<string> {
  const response = await apiFetch('/api/access-management?resource=library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'gallery-upload-url', mimeType: file.type, size: file.size }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Upload failed (${response.status})`);
  const { error } = await supabase.storage.from(data.bucket).uploadToSignedUrl(data.path, data.token, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  return data.url as string;
}
