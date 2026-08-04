import { supabase } from '../../../lib/supabaseClient';
import type { AccessGrant, CreateGrantInput, MemberSummary, WorkspaceOption } from '../types';

async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

/**
 * PHASE 1 — TEMPORARY: plain fetch, no Bearer token. Studio has no
 * per-user session to attach today (see the Access Management Phase 1
 * audit — 0022_studio_admins.sql is prepared but not applied, AuthProvider
 * is unmounted). Switch back to apiFetch() (src/lib/apiClient.ts) once
 * Studio-wide auth is activated — it already exists and is unused,
 * ready to be reconnected alongside requireAdmin() on the server side.
 */
export async function searchMembers(email: string): Promise<MemberSummary[]> {
  const res = await fetch(`/api/access-management?resource=members&email=${encodeURIComponent(email)}`);
  const { members } = await parseOrThrow<{ members: MemberSummary[] }>(res);
  return members;
}

export async function fetchGrants(userId: string): Promise<AccessGrant[]> {
  const res = await fetch(`/api/access-management?resource=grants&userId=${encodeURIComponent(userId)}`);
  const { grants } = await parseOrThrow<{ grants: AccessGrant[] }>(res);
  return grants;
}

/**
 * Two possible shapes: `{ requiresConfirmation: true, warning }` when the
 * server found scenario 3 (an existing 'all' grant already covers this
 * specific request) and hasn't created anything yet, or `{ grant }` once
 * created — either on the first call (no warning applied) or a resubmit
 * with `confirmWarning: true` after the admin explicitly proceeds.
 */
export async function createGrant(
  input: CreateGrantInput & { confirmWarning?: boolean },
): Promise<{ requiresConfirmation: true; warning: { code: string; message: string } } | { requiresConfirmation?: false; grant: AccessGrant }> {
  const res = await fetch('/api/access-management?resource=grants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseOrThrow(res);
}

export async function revokeGrant(id: string): Promise<AccessGrant> {
  const res = await fetch('/api/access-management?resource=grants', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'revoke' }),
  });
  const { grant } = await parseOrThrow<{ grant: AccessGrant }>(res);
  return grant;
}

/**
 * Reads published Workspaces straight from portal.catalog_index — same
 * public-read table, same approach as Content Engine's own
 * searchPublishedProducts (src/modules/content-engine/api/catalogProducts.ts).
 * No requireAdmin()-gated route needed for this read; duplicating it into a
 * new endpoint would just be a second copy of already-public data.
 */
export async function searchWorkspaces(query: string): Promise<WorkspaceOption[]> {
  let request = supabase
    .schema('portal')
    .from('catalog_index')
    .select('product_id, slug, name')
    .order('published_at', { ascending: false })
    .limit(25);

  if (query.trim()) {
    request = request.ilike('name', `%${query.trim()}%`);
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ productId: row.product_id, slug: row.slug, name: row.name }));
}
