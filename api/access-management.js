import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { checkForDuplicateGrant, deriveGrantStatus } from './_lib/accessGrants.js';

/**
 * Diagnostic-only: logs which stage failed, server-side, without ever
 * including secrets, headers, request bodies, or member data — see the
 * Access Management production error audit. Never sent to the browser.
 */
function logDiagnostic(stage, err) {
  console.error(
    `[access-management] stage=${stage} name=${err?.name ?? 'Error'} message=${err?.message ?? String(err)}`,
    err?.stack ?? ''
  );
}

/**
 * Diagnostic-only: logs the hostname (never the full URL, which is not
 * secret either, but the hostname alone is all this needs) SUPABASE_URL
 * resolves to, so a production log can confirm which Supabase project this
 * deployment is actually pointed at — see the Access Management production
 * error audit. Reads process.env directly; does not touch supabaseAdmin.js
 * or its client configuration.
 */
function logSupabaseHostname() {
  const url = process.env.SUPABASE_URL;
  if (!url) return;
  try {
    console.log(`[access-management] SUPABASE_URL hostname=${new URL(url).hostname}`);
  } catch (err) {
    console.error(`[access-management] stage=client_init:hostname_parse name=${err?.name ?? 'Error'} message=${err?.message ?? String(err)}`);
  }
}

/**
 * Diagnostic-only: logs the PostgREST response metadata for a failed
 * portal.users query — none of these fields (message/code/details/hint/
 * status/statusText) can ever contain the service-role key, headers, or
 * member data; they're the same shape Postgres/PostgREST itself returns.
 */
function logPostgrestFailure(stage, error, status, statusText) {
  console.error(
    `[access-management] stage=${stage} message=${error?.message ?? ''} code=${error?.code ?? ''} details=${error?.details ?? ''} hint=${error?.hint ?? ''} status=${status ?? ''} statusText=${statusText ?? ''}`
  );
}

/**
 * Access Management — consolidated into one Serverless Function (Vercel
 * Hobby plan's 12-function limit; see the Access Management Serverless
 * Function audit). Was two files (members.js, grants.js); routed here by
 * `?resource=members` vs `?resource=grants`, with the exact same
 * method-based dispatch grants.js already had (GET/POST/PATCH) preserved
 * verbatim underneath. No behavior change — same queries, same response
 * shapes, same duplicate-protection rules, same Phase 1 no-auth posture.
 *
 * PHASE 1 — TEMPORARY, NO AUTH: this endpoint has no requireAdmin() gate.
 * Studio has no per-user authentication today (see the Access Management
 * Phase 1 audit — 0022_studio_admins.sql is prepared but not applied). The
 * only protection right now is whatever restricts who can reach this
 * deployment at all — anyone who can reach it can search members and
 * create/revoke real Workspace access. Re-add `const admin = await
 * requireAdmin(req); if (!admin) return res.status(401)...` here, and
 * restore `granted_by: admin.email` in the grants/POST branch, once
 * Studio-wide auth is activated. Do not expose this endpoint more broadly
 * until then.
 */

/**
 * Member search — GET ?resource=members&email=...
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
 */
async function handleMembers(req, res, supabase) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = (req.query.email ?? '').trim();
  if (email.length < 3) {
    return res.status(400).json({ error: 'email must be at least 3 characters.' });
  }

  // TEMPORARY DIAGNOSTIC — comparison test to determine whether the
  // portal.users PGRST125 failure is specific to that table or systemic to
  // this client's access to the portal schema (see the Access Management
  // production error audit). Uses the exact same supabase client instance,
  // same schema, a table already confirmed exposed and working elsewhere.
  // Read-only, does not affect the response below. Remove once resolved.
  try {
    const {
      status: diagStatus,
      statusText: diagStatusText,
      error: diagError,
    } = await supabase.schema('portal').from('workspace_categories').select('id').limit(1);
    if (diagError) {
      console.error(
        `[access-management] diagnostic=portal_workspace_categories status=${diagStatus ?? ''} statusText=${diagStatusText ?? ''} code=${diagError.code ?? ''} message=${diagError.message ?? ''}`
      );
    } else {
      console.log(`[access-management] diagnostic=portal_workspace_categories status=${diagStatus ?? ''} success=true`);
    }
  } catch (err) {
    console.error(
      `[access-management] diagnostic=portal_workspace_categories threw name=${err?.name ?? 'Error'} message=${err?.message ?? String(err)}`
    );
  }

  let candidates;
  try {
    const { data, error: candidatesError, status, statusText } = await supabase
      .schema('portal')
      .from('users')
      .select('id, email, full_name, has_used_trial')
      .ilike('email', `%${email}%`)
      .limit(10);
    if (candidatesError) {
      logPostgrestFailure('members:portal_users_query', candidatesError, status, statusText);
      return res.status(500).json({ error: candidatesError.message });
    }
    candidates = data;
  } catch (err) {
    logDiagnostic('members:portal_users_query', err);
    return res.status(500).json({ error: 'Member search failed.' });
  }

  const members = [];
  for (const candidate of candidates ?? []) {
    let authResult;
    let authError;
    try {
      ({ data: authResult, error: authError } = await supabase.auth.admin.getUserById(candidate.id));
    } catch (err) {
      logDiagnostic('members:auth_admin_getUserById', err);
      continue; // same "skip this candidate" behavior as a returned authError below — never guess.
    }
    if (authError) logDiagnostic('members:auth_admin_getUserById', authError);
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

/**
 * Access Grant management — GET ?resource=grants&userId=... lists a
 * member's grants (with derived status), POST creates one, PATCH revokes
 * one.
 *
 * Reuses portal.access_grants exactly as designed (see
 * bgrowth-portal/supabase/migrations/0021_access_grants.sql) — no new
 * table, no schema change, no touching has_workspace_access(), licenses,
 * trial logic, or Stripe.
 */
async function handleGrants(req, res, supabase) {
  if (req.method === 'GET') {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const { data, error } = await supabase
      .schema('portal')
      .from('access_grants')
      .select('*, products(id, name, slug)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const grants = (data ?? []).map((g) => ({
      id: g.id,
      scope: g.scope,
      product: g.products ? { id: g.products.id, name: g.products.name, slug: g.products.slug } : null,
      expiresAt: g.expires_at,
      note: g.note,
      grantedBy: g.granted_by,
      createdAt: g.created_at,
      revokedAt: g.revoked_at,
      status: deriveGrantStatus(g),
    }));
    return res.json({ grants });
  }

  if (req.method === 'POST') {
    const { userId, scope, productId, expiresAt, note, confirmWarning } = req.body ?? {};

    if (!userId) return res.status(400).json({ error: 'userId is required.' });
    if (scope !== 'all' && scope !== 'specific') {
      return res.status(400).json({ error: "scope must be 'all' or 'specific'." });
    }
    if (scope === 'specific' && !productId) {
      return res.status(400).json({ error: 'productId is required when scope is "specific".' });
    }
    if (scope === 'all' && productId) {
      return res.status(400).json({ error: 'productId must not be set when scope is "all".' });
    }
    if (expiresAt !== undefined && expiresAt !== null) {
      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'expiresAt is not a valid date.' });
      if (parsed <= new Date()) return res.status(400).json({ error: 'expiresAt must be in the future.' });
    }

    // grantedBy is deliberately never read from req.body. Phase 1 has no
    // server-verified admin identity to use instead (see the file-level
    // comment above) — a fixed literal below stands in until Studio-wide
    // auth is activated and requireAdmin()'s admin.email can be restored
    // here. The existing `note` field remains available for Andreia/Bruno
    // to record who/why by hand in the meantime.
    const { data: existingGrants, error: existingError } = await supabase
      .schema('portal')
      .from('access_grants')
      .select('*')
      .eq('user_id', userId);
    if (existingError) return res.status(500).json({ error: existingError.message });

    const check = checkForDuplicateGrant(existingGrants ?? [], { scope, productId: productId ?? null });
    if (!check.ok) {
      return res.status(409).json({ error: check.message, code: check.code, conflictingGrant: check.conflictingGrant });
    }
    // Scenario 3 (a global grant already covers this specific request) is
    // advisory, not blocking — but the admin must explicitly confirm before
    // the row is actually created. Without confirmWarning, report the
    // warning and create nothing yet.
    if (check.warning && !confirmWarning) {
      return res.status(200).json({ requiresConfirmation: true, warning: check.warning });
    }

    const { data: inserted, error: insertError } = await supabase
      .schema('portal')
      .from('access_grants')
      .insert({
        user_id: userId,
        scope,
        product_id: scope === 'specific' ? productId : null,
        expires_at: expiresAt ?? null,
        note: note || null,
        granted_by: 'BGrowth Studio (Phase 1 — no per-user auth yet)',
      })
      .select('*, products(id, name, slug)')
      .single();
    if (insertError) return res.status(500).json({ error: insertError.message });

    const grant = {
      id: inserted.id,
      scope: inserted.scope,
      product: inserted.products ? { id: inserted.products.id, name: inserted.products.name, slug: inserted.products.slug } : null,
      expiresAt: inserted.expires_at,
      note: inserted.note,
      grantedBy: inserted.granted_by,
      createdAt: inserted.created_at,
      revokedAt: inserted.revoked_at,
      status: deriveGrantStatus(inserted),
    };
    return res.status(201).json({ grant });
  }

  if (req.method === 'PATCH') {
    const { id, action } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id is required.' });
    if (action !== 'revoke') return res.status(400).json({ error: "action must be 'revoke'." });

    // .is('revoked_at', null) makes this idempotent — revoking an
    // already-revoked grant matches zero rows instead of overwriting its
    // original revoked_at, so a double-click can never "re-revoke" or
    // silently reactivate anything.
    const { data, error } = await supabase
      .schema('portal')
      .from('access_grants')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .is('revoked_at', null)
      .select('*, products(id, name, slug)')
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(409).json({ error: 'This grant is already revoked or does not exist.' });

    const grant = {
      id: data.id,
      scope: data.scope,
      product: data.products ? { id: data.products.id, name: data.products.name, slug: data.products.slug } : null,
      expiresAt: data.expires_at,
      note: data.note,
      grantedBy: data.granted_by,
      createdAt: data.created_at,
      revokedAt: data.revoked_at,
      status: deriveGrantStatus(data),
    };
    return res.json({ grant });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const resource = req.query.resource;
  if (resource !== 'members' && resource !== 'grants') {
    return res.status(400).json({ error: 'resource must be "members" or "grants".' });
  }

  logSupabaseHostname();

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    logDiagnostic('client_init', err);
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  try {
    if (resource === 'members') return await handleMembers(req, res, supabase);
    return await handleGrants(req, res, supabase);
  } catch (err) {
    logDiagnostic(`${resource}:unhandled`, err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
