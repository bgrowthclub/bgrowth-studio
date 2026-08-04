import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// This module is imported unconditionally from main.tsx (AuthProvider wraps
// the whole app, including the public ?template=/?calc=/?planner= fill
// routes that have zero backend dependency by design). Throwing here would
// take down those public customer-facing pages too if Studio's Supabase
// vars are ever missing/misconfigured — so a missing config degrades to a
// loud console error plus a client that will fail (only) when a studio-mode
// auth call is actually attempted, never a bundle-wide crash.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      '(same project bgrowth-portal already uses) for Studio admin sign-in to work. ' +
      'Public checklist/planner/calculator fill links are unaffected.',
  );
}

// Anon-key client, browser-side only — used for the admin login session and
// for reading portal.catalog_index (already public-read RLS, the same data
// Portal's own Browse/Home pages expose to anonymous visitors). Also used to
// read the caller's own row in portal.studio_admins (see RequireAdmin.tsx) —
// the RLS policy there only ever allows a session to see its own row, never
// a listing of other admins. Every privileged read/write beyond that (e.g.
// Access Management's member search and Access Grant creation) goes through
// a requireAdmin()-gated /api/* route using the service-role key, which
// never reaches the browser.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.invalid',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
