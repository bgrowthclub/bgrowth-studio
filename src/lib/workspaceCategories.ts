import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/**
 * The one category list shared with the BGrowth Website (portal.workspace_
 * categories, Portal migration 0032): Areas at the top level, categories
 * inside them. Managed in the Website's Admin → Categories; Studio only reads
 * it (public read). A Workspace stores one category slug.
 */
export interface WorkspaceCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
}

export interface WorkspaceArea extends WorkspaceCategory {
  children: WorkspaceCategory[];
}

export const CATEGORY_ADMIN_URL = 'https://bgrowth.app/platform/admin/categories';

export function groupCategories(rows: WorkspaceCategory[]): WorkspaceArea[] {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  return sorted
    .filter((c) => !c.parent_id)
    .map((area) => ({ ...area, children: sorted.filter((c) => c.parent_id === area.id) }));
}

/** Matches a stored value (a slug, or an old category name typed in Settings) to a known slug. */
export function matchCategorySlug(value: string | undefined | null, rows: WorkspaceCategory[]): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  const hit = rows.find((c) => c.slug === v || c.name.toLowerCase() === v);
  return hit?.slug;
}

export function useWorkspaceCategories() {
  const [rows, setRows] = useState<WorkspaceCategory[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    supabase
      .schema('portal')
      .from('workspace_categories')
      .select('*')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setStatus('error');
          return;
        }
        setRows(
          (data ?? []).map((c: Record<string, unknown>) => ({
            id: String(c.id),
            name: String(c.name),
            slug: String(c.slug),
            parent_id: (c.parent_id as string | null | undefined) ?? null,
            sort_order: Number(c.sort_order ?? 0),
          })),
        );
        setStatus('ready');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, areas: groupCategories(rows), status };
}

/**
 * The category a published Workspace has on the Portal/Website right now —
 * set there by Admin → Categories, so Studio picks it up instead of
 * publishing a blank over it.
 */
export async function fetchPublishedCategorySlug(studioProductId: string): Promise<string | undefined> {
  const { data } = await supabase
    .schema('portal')
    .from('products')
    .select('category_id, workspace_categories(slug)')
    .eq('studio_product_id', studioProductId)
    .maybeSingle();
  const joined = (data as { workspace_categories?: { slug?: string } | null } | null)?.workspace_categories;
  return joined?.slug ?? undefined;
}
