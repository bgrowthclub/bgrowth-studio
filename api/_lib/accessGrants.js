/**
 * Access Grant business rules — deliberately framework/request-agnostic (no
 * `req`/`res` anywhere in this file) so a future Website Admin server can
 * import this same module unchanged, per the Studio → Website Admin
 * migration path. Operates purely on plain access_grants rows already
 * fetched by the caller; never talks to Supabase itself.
 *
 * Mirrors portal.has_workspace_access()'s own SQL condition exactly
 * (supabase/migrations/0021_access_grants.sql, bgrowth-portal) so this
 * module's notion of "active" can never drift from the database's.
 */

/** True iff a grant row currently counts as access — same condition has_workspace_access() checks in SQL. */
export function isGrantActive(grant) {
  if (grant.revoked_at !== null) return false;
  if (grant.expires_at !== null && new Date(grant.expires_at) <= new Date()) return false;
  return true;
}

/** One of 'active' | 'expired' | 'revoked' — the single place this derivation happens, reused by every GET response. */
export function deriveGrantStatus(grant) {
  if (grant.revoked_at !== null) return 'revoked';
  if (grant.expires_at !== null && new Date(grant.expires_at) <= new Date()) return 'expired';
  return 'active';
}

/**
 * Checks a proposed new grant against a user's existing rows before insert.
 * `existingGrants` should be every access_grants row for the target user
 * (any product, any status) — this function does its own active-filtering.
 *
 * Returns { ok: true } to proceed, or { ok: false, code, message, conflictingGrant? }
 * to block. A 'warn' case (scope='all' already covers a requested 'specific'
 * grant) is NOT blocked here — it's surfaced to the caller as `warning` so
 * the API layer can return it for the client to show a confirm step, per
 * the audited duplicate-protection rules (scenario 3 is advisory, not a hard block).
 */
export function checkForDuplicateGrant(existingGrants, proposed) {
  const active = existingGrants.filter(isGrantActive);

  if (proposed.scope === 'all') {
    const existingAll = active.find((g) => g.scope === 'all');
    if (existingAll) {
      return {
        ok: false,
        code: 'DUPLICATE_ALL_GRANT',
        message: 'This member already has an active All Workspaces grant.',
        conflictingGrant: existingAll,
      };
    }
    return { ok: true };
  }

  // scope === 'specific'
  const existingSpecific = active.find((g) => g.scope === 'specific' && g.product_id === proposed.productId);
  if (existingSpecific) {
    return {
      ok: false,
      code: 'DUPLICATE_SPECIFIC_GRANT',
      message: 'This member already has an active grant for this Workspace.',
      conflictingGrant: existingSpecific,
    };
  }

  const existingAll = active.find((g) => g.scope === 'all');
  if (existingAll) {
    return {
      ok: true,
      warning: {
        code: 'COVERED_BY_ALL_GRANT',
        message: 'This member already has access to every Workspace via an active All Workspaces grant. You can still add this specific grant if you want it to survive a future revoke of the global one.',
        conflictingGrant: existingAll,
      },
    };
  }

  return { ok: true };
}
