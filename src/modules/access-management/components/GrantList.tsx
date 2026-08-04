import { GrantRow } from './GrantRow';
import type { AccessGrant } from '../types';

interface GrantListProps {
  grants: AccessGrant[];
  onGrantUpdated: (grant: AccessGrant) => void;
}

function Section({ title, grants, onGrantUpdated }: { title: string; grants: AccessGrant[]; onGrantUpdated: (grant: AccessGrant) => void }) {
  if (grants.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-400">{title}</p>
      <div className="flex flex-col gap-2">
        {grants.map((grant) => (
          <GrantRow key={grant.id} grant={grant} onRevoked={onGrantUpdated} />
        ))}
      </div>
    </div>
  );
}

/** Splits into Active / Expired / Revoked, per the audited grant-history requirement — status is derived server-side (deriveGrantStatus), never recomputed here. */
export function GrantList({ grants, onGrantUpdated }: GrantListProps) {
  if (grants.length === 0) {
    return <p className="text-sm text-navy-400">No Access Grants yet for this member.</p>;
  }

  const active = grants.filter((g) => g.status === 'active');
  const expired = grants.filter((g) => g.status === 'expired');
  const revoked = grants.filter((g) => g.status === 'revoked');

  return (
    <div className="flex flex-col gap-6">
      <Section title="Active" grants={active} onGrantUpdated={onGrantUpdated} />
      <Section title="Expired" grants={expired} onGrantUpdated={onGrantUpdated} />
      <Section title="Revoked" grants={revoked} onGrantUpdated={onGrantUpdated} />
    </div>
  );
}
