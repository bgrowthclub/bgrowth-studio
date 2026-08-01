import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * The only entry point into Studio-mode. No sign-up link, no "forgot
 * password" self-service flow — admin accounts are created by hand in the
 * Supabase Dashboard (see PRODUCTION_LAUNCH steps), and a password reset is
 * a rare, manual Dashboard action too. This is deliberately the smallest
 * possible login screen, not a customer-facing auth product.
 */
export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      // No further action needed — onAuthStateChange (AuthContext) picks up
      // the new session, and RequireAdmin re-evaluates automatically.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6fb] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-navy-100 bg-white p-8 shadow-card">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600">BGrowth Studio</p>
          <h1 className="mt-1 text-xl font-extrabold text-navy-900">Admin Sign In</h1>
          <p className="mt-1 text-sm text-navy-400">Internal access only.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-xs font-semibold text-navy-600">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-900 outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1 block text-xs font-semibold text-navy-600">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-900 outline-none focus:border-brand-500"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
