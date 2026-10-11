import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/**
 * The one tag list shared with the BGrowth Website (portal.tags, Portal
 * migration 0048). Managed in the Website's Admin → Catalog → Tags; Studio
 * reads it (public read) and sends a product's tag names when publishing —
 * the publish endpoint reuses a tag with the same key or adds a new one.
 */
export interface StudioTag {
  id: string;
  name: string;
  slug: string;
}

// Same rule as portal.tag_slug(): lower case, no accents, words joined by "-".
export function tagSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function useTagList(): StudioTag[] {
  const [tags, setTags] = useState<StudioTag[]>([]);
  useEffect(() => {
    let cancelled = false;
    supabase
      .schema('portal')
      .from('tags')
      .select('id, name, slug')
      .order('name')
      .then(({ data }) => {
        if (!cancelled && data) setTags(data as StudioTag[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return tags;
}

/** The published product's current tag names (null = not published yet / not readable). */
export async function fetchPublishedTags(studioProductId: string): Promise<string[] | null> {
  const { data: product } = await supabase
    .schema('portal')
    .from('products')
    .select('id')
    .eq('studio_product_id', studioProductId)
    .maybeSingle();
  const id = (product as { id?: string } | null)?.id;
  if (!id) return null;
  const { data, error } = await supabase.schema('portal').from('product_tags').select('tags(name)').eq('product_id', id);
  if (error) return null;
  return ((data ?? []) as { tags?: { name?: string } | null }[]).flatMap((r) => (r.tags?.name ? [r.tags.name] : []));
}
