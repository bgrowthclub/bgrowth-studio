import { useState } from 'react';
import { X } from 'lucide-react';
import { createGrant } from '../api/accessManagementClient';
import { WorkspacePicker } from './WorkspacePicker';
import type { AccessGrant, WorkspaceOption } from '../types';

interface GrantAccessDialogProps {
  userId: string;
  onClose: () => void;
  onGranted: (grant: AccessGrant) => void;
}

type Access = 'all' | 'specific';
type Duration = 'lifetime' | 'expires';

/** Local datetime-local input value -> ISO string, or null if empty. */
function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function GrantAccessDialog({ userId, onClose, onGranted }: GrantAccessDialogProps) {
  const [access, setAccess] = useState<Access>('all');
  const [workspace, setWorkspace] = useState<WorkspaceOption | null>(null);
  const [duration, setDuration] = useState<Duration>('lifetime');
  const [expiresAtLocal, setExpiresAtLocal] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<{ message: string } | null>(null);

  const canSubmit = access === 'all' || Boolean(workspace);

  async function handleSubmit(confirmWarning: boolean) {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await createGrant({
        userId,
        scope: access,
        productId: access === 'specific' ? (workspace?.productId ?? undefined) : undefined,
        expiresAt: duration === 'expires' ? toIso(expiresAtLocal) : undefined,
        note: note.trim() || undefined,
        confirmWarning,
      });
      if (result.requiresConfirmation) {
        // Nothing was created yet — surface the warning and wait for the
        // admin to explicitly click through (handleSubmit(true)) before
        // resubmitting with confirmWarning: true.
        setWarning({ message: result.warning.message });
        return;
      }
      onGranted(result.grant);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create this grant.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-cardHover">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy-900">Grant Access</h2>
          <button type="button" onClick={onClose} className="text-navy-400 hover:text-navy-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Access</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-navy-900">
                <input type="radio" name="access" checked={access === 'all'} onChange={() => setAccess('all')} />
                All Workspaces <span className="text-navy-400">(existing and future)</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-navy-900">
                <input type="radio" name="access" checked={access === 'specific'} onChange={() => setAccess('specific')} />
                Specific Workspace
              </label>
            </div>
            {access === 'specific' && (
              <div className="mt-2">
                <WorkspacePicker value={workspace} onChange={setWorkspace} />
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Duration</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-navy-900">
                <input type="radio" name="duration" checked={duration === 'lifetime'} onChange={() => setDuration('lifetime')} />
                Lifetime
              </label>
              <label className="flex items-center gap-2 text-sm text-navy-900">
                <input type="radio" name="duration" checked={duration === 'expires'} onChange={() => setDuration('expires')} />
                Expires
              </label>
            </div>
            {duration === 'expires' && (
              <input
                type="datetime-local"
                value={expiresAtLocal}
                onChange={(event) => setExpiresAtLocal(event.target.value)}
                className="mt-2 w-full rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-900 outline-none focus:border-brand-500"
              />
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Note (optional)</p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-900 outline-none focus:border-brand-500"
              placeholder="Why is this access being granted?"
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {warning && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <p>{warning.message}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-navy-100 px-4 py-2 text-sm font-semibold text-navy-600 hover:bg-navy-50"
            >
              Cancel
            </button>
            {warning ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Granting…' : 'Grant Anyway'}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSubmit || isSubmitting || (duration === 'expires' && !expiresAtLocal)}
                onClick={() => handleSubmit(false)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Granting…' : 'Grant Access'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
