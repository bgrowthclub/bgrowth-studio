import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { AdminLoginPage } from './AdminLoginPage';
import { supabase } from '../lib/supabaseClient';

function FullPageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#f4f6fb]">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

function NotAuthorizedScreen({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#f4f6fb] px-4 text-center">
      <p className="text-lg font-bold text-navy-800">Not authorized</p>
      <p className="max-w-sm text-sm text-navy-400">
        {email ? <>The account <span className="font-medium text-navy-600">{email}</span> is</> : 'This account is'} not
        on the Studio admin list. Ask an existing admin to add it.
      </p>
      <button
        type="button"
        onClick={onSignOut}
        className="mt-2 rounded-lg border border-navy-100 px-4 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-50"
      >
        Sign out
      </button>
    </div>
  );
}

/**
 * The gate for Studio-mode only — never wraps the public-fill routes
 * (?template=/?calc=/?planner=), which stay unauthenticated by design (see
 * App.tsx). Two checks, in order: (1) is there a real Supabase session at
 * all (AdminLoginPage otherwise), (2) does that session's user id have a
 * row in portal.studio_admins (NotAuthorizedScreen otherwise) — the one
 * Studio-wide admin allowlist (supabase/migrations/0022_studio_admins.sql,
 * bgrowth-portal), not a Content-Engine-owned table. Being a row in
 * auth.users — which a Portal customer also is, since both apps share one
 * Supabase project — satisfies neither check by itself; only step 2
 * actually grants Studio access.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isLoading, signOut } = useAuth();
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // WHY THE USER ID AND NOT THE SESSION (08/11/2026). This used to depend on
  // the session object, which Supabase replaces on its own — when the token
  // is refreshed (about hourly) and when the tab regains focus. Each
  // replacement re-ran the check, which showed the spinner INSTEAD of the
  // children, which unmounted the whole Studio and threw away every bit of
  // its state. Someone editing a Journey or a course was dropped back on
  // the list, apparently at random, losing unsaved work.
  //
  // The same person is still the same person after a token refresh, so the
  // check runs per user, not per session object.
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setIsCheckingAdmin(false);
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    setIsCheckingAdmin(true);
    supabase
      .schema('portal')
      .from('studio_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIsAdmin(Boolean(data));
        setIsCheckingAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // The spinner only before we know: once someone is in, a re-check never
  // takes the screen away from them again. Belt and braces with the rule
  // above — if any future change re-runs the check, it must not cost the
  // person their work.
  if (isLoading || (session && isCheckingAdmin && !isAdmin)) return <FullPageSpinner />;
  if (!session) return <AdminLoginPage />;
  if (!isAdmin) return <NotAuthorizedScreen email={session.user.email ?? null} onSignOut={signOut} />;

  return <>{children}</>;
}
