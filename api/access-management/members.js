import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

/**
 * Member search for Access Management — GET /api/access-management/members?email=...
 *
 * Two-step lookup, per the audited plan:
 *  1. portal.users.email (a plain, indexed column) is searched first purely
 *     as a fast candidate index — it's a signup-time snapshot, not
 *     authoritative (see bgrowth-portal's own Access Grant audit).
 *  2. Each candidate's authoritative record is confirmed via
 *     supabase.auth.admin.getUserById() — the real GoTrue Admin API,
 *     always current. This is what the response actually returns; a stale
 *     portal.users.email would never reach the client.
 *
 * Response is deliberately narrow: id, email, full_name, has_used_trial,
 * created_at, last_sign_in_at. Never password hashes, MFA factors,
 * identities, or any other auth.users field.
 *
 * PHASE 1 — TEMPORARY, NO AUTH: this endpoint has no requireAdmin() gate.
 * Studio has no per-user authentication today (see the Access Management
 * Phase 1 audit — 0022_studio_admins.sql is prepared but not applied). The
 * only protection right now is whatever restricts who can reach this
 * deployment at all. Re-add `const admin = await requireAdmin(req); if
 * (!admin) return res.status(401)...` here once Studio-wide auth is
 * activated — do not treat this endpoint as safe to expose more broadly
 * until then.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = (req.query.email ?? '').trim();
  if (email.length < 3) {
    return res.status(400).json({ error: 'email must be at least 3 characters.' });
  }

  const supabase = getSupabaseAdmin();

  const { data: candidates, error: candidatesError } = await supabase
    .schema('portal')
    .from('users')
    .select('id, email, full_name, has_used_trial')
    .ilike('email', `%${email}%`)
    .limit(10);
  if (candidatesError) return res.status(500).json({ error: candidatesError.message });

  const members = [];
  for (const candidate of candidates ?? []) {
    const { data: authResult, error: authError } = await supabase.auth.admin.getUserById(candidate.id);
    if (authError || !authResult?.user) continue; // stale portal.users row with no matching auth.users — skip, never guess.
    members.push({
      id: authResult.user.id,
      email: authResult.user.email, // authoritative — always the auth.users value, never the portal.users snapshot.
      fullName: candidate.full_name,
      hasUsedTrial: candidate.has_used_trial,
      createdAt: authResult.user.created_at,
      lastSignInAt: authResult.user.last_sign_in_at ?? null,
    });
  }

  return res.json({ members });
}
