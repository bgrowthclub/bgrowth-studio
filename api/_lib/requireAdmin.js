import { getSupabaseAdmin } from './supabaseAdmin.js';

/**
 * The one gate every Studio server-side privileged endpoint calls first —
 * Access Management's own routes today, Content Engine's once it's wired in
 * too. Verifies the caller's Supabase session (the exact
 * `supabase.auth.getUser(accessToken)` call bgrowth-portal's own
 * api/checkout/create-session.ts already uses to verify a session
 * server-side), then checks portal.studio_admins for that user id — the one
 * Studio-wide admin allowlist (supabase/migrations/0022_studio_admins.sql,
 * bgrowth-portal), independent of any single module. Not content_engine.admins:
 * that schema was never actually applied to production (rolled back before
 * Content Engine's admin gate was finished) and is not being recreated.
 *
 * Returns the authenticated admin user on success, or null on any failure
 * (missing/invalid token, valid session but not an admin) — callers always
 * respond 401 on null, never distinguishing "not logged in" from
 * "logged in but not an admin" to the client, since neither should reveal
 * more than "you can't do this."
 */
export async function requireAdmin(req) {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!accessToken) return null;

  const supabase = getSupabaseAdmin();

  const { data: userResult, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userResult.user) return null;

  const { data: adminRow, error: adminError } = await supabase
    .schema('portal')
    .from('studio_admins')
    .select('user_id, email')
    .eq('user_id', userResult.user.id)
    .maybeSingle();
  if (adminError || !adminRow) return null;

  return { id: userResult.user.id, email: adminRow.email };
}
