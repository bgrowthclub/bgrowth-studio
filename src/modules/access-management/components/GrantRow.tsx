import { useState } from 'react';
import { revokeGrant } from '../api/accessManagementClient';
import type { AccessGrant } from '../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

interface GrantRowProps {
  grant: AccessGrant;
  onRevoked: (grant: AccessGrant) => void;
}

export function GrantRow({ grant, onRevoked }: GrantRowProps) {
  const [isRevoking, setIsRevoking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    setIsRevoking(true);
    setError(null);
    try {
      const updated = await revokeGrant(grant.id);
      onRevoked(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke this grant.');
    } finally {
      setIsRevoking(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-navy-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy-900">
          {grant.scope === 'all' ? 'All Workspaces' : (grant.product?.name ?? 'Unknown Workspace')}
        </p>
        <p className="mt-0.5 text-xs text-navy-400">
          {grant.expiresAt ? `Expires ${formatDate(grant.expiresAt)}` : 'Lifetime'} · Granted {formatDate(grant.createdAt)}
          {grant.grantedBy ? ` by ${grant.grantedBy}` : ''}
        </p>
        {grant.note && <p className="mt-1 text-xs italic text-navy-500">"{grant.note}"</p>}
        {grant.status === 'revoked' && grant.revokedAt && (
          <p className="mt-1 text-xs text-red-500">Revoked {formatDate(grant.revokedAt)}</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      {grant.status === 'active' && (
        <div className="shrink-0">
          {confirmOpen ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-navy-500">Revoke this grant?</span>
              <button
                type="button"
                disabled={isRevoking}
                onClick={handleRevoke}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isRevoking ? 'Revoking…' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Revoke
            </button>
          )}
        </div>
      )}
    </div>
  );
}
