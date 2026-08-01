import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for Studio's own serverless functions only —
 * never imported by anything that ships to the browser. Bypasses RLS
 * entirely, same as bgrowth-portal's own api/_lib/supabaseAdmin.ts, which
 * this mirrors. Reads plain process.env vars (these functions run under
 * Node on Vercel, not through Vite).
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
