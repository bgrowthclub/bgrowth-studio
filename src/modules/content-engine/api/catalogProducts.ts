import { supabase } from '../../../lib/supabaseClient';
import type { PublishedProductSummary } from '../types';

/**
 * Reads published products straight from bgrowth-portal's own public-read
 * portal.catalog_index — the approved "Option A" product source. No
 * requireAdmin()-gated route needed for this one read: catalog_index is
 * already public (Portal's own Browse/Home pages read it anonymously), and
 * duplicating it into a Content Engine table would violate "no duplicate
 * product catalog."
 */
export async function searchPublishedProducts(query: string): Promise<PublishedProductSummary[]> {
  let request = supabase
    .schema('portal')
    .from('catalog_index')
    .select('product_id, slug, name, short_description, cover_image_url')
    .order('published_at', { ascending: false })
    .limit(25);

  if (query.trim()) {
    request = request.ilike('name', `%${query.trim()}%`);
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data ?? [];
}
