import type { MemberSummary } from '../types';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Deliberately narrow — id/email/name/trial-used/dates only. Never renders anything from auth beyond what /api/access-management?resource=members already chose to expose. */
export function MemberSummaryCard({ member }: { member: MemberSummary }) {
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <p className="text-lg font-bold text-navy-900">{member.fullName || member.email}</p>
      {member.fullName && <p className="text-sm text-navy-400">{member.email}</p>}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <dt className="font-semibold text-navy-400">Member ID</dt>
        <dd className="truncate font-mono text-navy-600">{member.id}</dd>
        <dt className="font-semibold text-navy-400">Trial used</dt>
        <dd className="text-navy-600">{member.hasUsedTrial === null ? 'Unknown' : member.hasUsedTrial ? 'Yes' : 'No'}</dd>
        <dt className="font-semibold text-navy-400">Member since</dt>
        <dd className="text-navy-600">{formatDate(member.createdAt)}</dd>
        <dt className="font-semibold text-navy-400">Last sign in</dt>
        <dd className="text-navy-600">{formatDate(member.lastSignInAt)}</dd>
      </dl>
    </div>
  );
}
