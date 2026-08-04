import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { checkForDuplicateGrant, deriveGrantStatus } from '../_lib/accessGrants.js';

/**
 * Access Grant management — GET lists a member's grants (with derived
 * status), POST creates one, PATCH revokes one.
 *
 * Reuses portal.access_grants exactly as designed (see
 * bgrowth-portal/supabase/migrations/0021_access_grants.sql) — no new
 * table, no schema change, no touching has_workspace_access(), licenses,
 * trial logic, or Stripe.
 *
 * PHASE 1 — TEMPORARY, NO AUTH: this endpoint has no requireAdmin() gate.
 * Studio has no per-user authentication today (see the Access Management
 * Phase 1 audit — 0022_studio_admins.sql is prepared but not applied). The
 * only protection right now is whatever restricts who can reach this
 * deployment at all — anyone who can reach it can create or revoke real
 * Workspace access. Re-add `const admin = await requireAdmin(req); if
 * (!admin) return res.status(401)...` here, and restore `granted_by:
 * admin.email` below, once Studio-wide auth is activated. Do not expose
 * this endpoint more broadly until then.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabase = getSupabaseAdmin();

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
