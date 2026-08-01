import { supabase } from './supabaseClient';

/**
 * Every call to a /api/* route that expects requireAdmin() (see
 * api/_lib/requireAdmin.js) needs the current session's access token as a
 * Bearer header — this is the one place that attaches it, so no call site
 * has to know the mechanics. Used by the existing generate/improve/
 * generate-blueprint calls (now gated) and every new Content Engine route.
 *
 * Throws if there's no session — every caller of this function only ever
 * runs from behind RequireAdmin, so a missing session here means something
 * upstream already went wrong, not a case to degrade gracefully for.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session — sign in again.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  return fetch(input, { ...init, headers });
}
