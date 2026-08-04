import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Plus } from 'lucide-react';
import { fetchGrants } from './api/accessManagementClient';
import { MemberSearch } from './components/MemberSearch';
import { MemberSummaryCard } from './components/MemberSummaryCard';
import { GrantList } from './components/GrantList';
import { GrantAccessDialog } from './components/GrantAccessDialog';
import type { AccessGrant, MemberSummary } from './types';

interface AccessManagementProps {
  onHome?: () => void;
}

/**
 * BGrowth Access Management — internal, admin-only. Manages
 * portal.access_grants directly (see bgrowth-portal's
 * supabase/migrations/0021_access_grants.sql); never touches licenses,
 * trials, or Stripe. Always rendered from inside RequireAdmin (see
 * App.tsx) — every read/write here can assume a verified Studio admin,
 * and every server call additionally re-verifies via requireAdmin().
 */
export function AccessManagement({ onHome }: AccessManagementProps) {
  const [member, setMember] = useState<MemberSummary | null>(null);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [isLoadingGrants, setIsLoadingGrants] = useState(false);
  const [grantsError, setGrantsError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    setIsLoadingGrants(true);
    setGrantsError(null);
    fetchGrants(member.id)
      .then((data) => {
        if (!cancelled) setGrants(data);
      })
      .catch((err) => {
        if (!cancelled) setGrantsError(err instanceof Error ? err.message : 'Could not load grants.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingGrants(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member]);

  function handleGranted(grant: AccessGrant) {
    setGrants((prev) => [grant, ...prev]);
    setIsDialogOpen(false);
  }

  function handleGrantUpdated(updated: AccessGrant) {
    setGrants((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans">
      <header className="flex items-center gap-3 border-b border-navy-100 bg-white px-4 py-4 sm:px-6">
        <button type="button" onClick={onHome} className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
          <ArrowLeft className="h-4 w-4" /> Home
        </button>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-brand-600" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">BGrowth Studio</p>
            <h1 className="text-sm font-extrabold text-navy-900">Access Management</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {!member && <MemberSearch onSelect={setMember} />}

        {member && (
          <div className="flex flex-col gap-6">
            <button type="button" onClick={() => setMember(null)} className="w-fit text-xs font-semibold text-brand-600 hover:underline">
              ← Search a different member
            </button>

            <MemberSummaryCard member={member} />

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-500">Access Grants</h2>
              <button
                type="button"
                onClick={() => setIsDialogOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <Plus className="h-3.5 w-3.5" /> Grant Access
              </button>
            </div>

            {isLoadingGrants && <p className="text-sm text-navy-400">Loading grants…</p>}
            {grantsError && <p className="text-sm text-red-600">{grantsError}</p>}
            {!isLoadingGrants && !grantsError && <GrantList grants={grants} onGrantUpdated={handleGrantUpdated} />}
          </div>
        )}
      </main>

      {isDialogOpen && member && (
        <GrantAccessDialog userId={member.id} onClose={() => setIsDialogOpen(false)} onGranted={handleGranted} />
      )}
    </div>
  );
}
