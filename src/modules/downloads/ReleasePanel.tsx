import { useState } from 'react';
import { CalendarClock, Check, Loader2, Rocket, Undo2 } from 'lucide-react';
import { Button, PrimaryButton } from '../../components/ui/Button';
import { releaseAction } from './api';

/** Stage shown in the list and the editor (Portal migration 0051). */
export function releaseLabel(status: string | null | undefined, scheduledAt?: string | null) {
  if (status === 'published') return 'Published';
  if (status === 'approved') return scheduledAt ? `Scheduled · ${new Date(scheduledAt).toLocaleDateString()}` : 'Approved';
  if (status === 'ready_for_review') return 'Reviewed — waiting for approval';
  if (status === 'archived') return 'Unpublished';
  return 'Draft';
}

export const RELEASE_STEPS = ['Draft', 'Reviewed', 'Approved', 'Scheduled', 'Published'];

function stepIndex(status: string | null | undefined, scheduledAt?: string | null) {
  if (status === 'published') return 4;
  if (status === 'approved') return scheduledAt ? 3 : 2;
  if (status === 'ready_for_review') return 1;
  return 0;
}

// A date picked as "YYYY-MM-DD" goes on sale that morning (the daily job
// runs late morning, Brazil time).
function dayToIso(day: string) {
  return new Date(`${day}T08:00:00`).toISOString();
}

interface Props {
  productId: string;
  status: string | null;
  scheduledAt: string | null;
  reviewedBy: string | null;
  approvedBy: string | null;
  /** Saves the editor's current changes first (as a draft). */
  saveFirst: () => Promise<boolean>;
  onChanged: (next: { status: string; scheduledAt: string | null; reviewedBy?: string | null; approvedBy?: string | null }) => void;
  ownerEmail: string;
}

/** The steps a product goes through before it is sold: review, approval, date. */
export function ReleasePanel({ productId, status, scheduledAt, reviewedBy, approvedBy, saveFirst, onChanged, ownerEmail }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState(scheduledAt ? scheduledAt.slice(0, 10) : '');
  const current = stepIndex(status, scheduledAt);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  const markReviewed = () =>
    run('review', async () => {
      if (!(await saveFirst())) return;
      await releaseAction(productId, { action: 'stage', stage: 'ready_for_review' });
      onChanged({ status: 'ready_for_review', scheduledAt: null, reviewedBy: ownerEmail, approvedBy: null });
    });
  const approve = () =>
    run('approve', async () => {
      await releaseAction(productId, { action: 'stage', stage: 'approved' });
      onChanged({ status: 'approved', scheduledAt: null, approvedBy: ownerEmail });
    });
  const backToDraft = () =>
    run('draft', async () => {
      await releaseAction(productId, { action: 'stage', stage: 'draft' });
      onChanged({ status: 'draft', scheduledAt: null, reviewedBy: null, approvedBy: null });
    });
  const schedule = (at: string | null) =>
    run('schedule', async () => {
      const r = await releaseAction(productId, { action: 'schedule', at });
      onChanged({ status: 'approved', scheduledAt: r.scheduledPublishAt ?? null });
    });
  const publishNow = () =>
    run('publish', async () => {
      if (!window.confirm('Publish it now? It goes on sale on bgrowth.app.')) return;
      await releaseAction(productId, { action: 'publish-now' });
      onChanged({ status: 'published', scheduledAt: null });
    });

  const spin = (key: string) => busy === key && <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <section className="rounded-xl border border-navy-100 bg-white p-5">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-navy-400">Release</p>
      <ol className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
        {RELEASE_STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-2.5 py-1 font-semibold ${
              i < current ? 'bg-emerald-50 text-emerald-700' : i === current ? 'bg-brand-600 text-white' : 'bg-navy-50 text-navy-400'
            }`}
          >
            {i < current && <Check className="mr-1 inline h-3 w-3" />}
            {label}
          </li>
        ))}
      </ol>
      {reviewedBy && current >= 1 && <p className="text-xs text-navy-400">Reviewed by {reviewedBy}</p>}
      {approvedBy && current >= 2 && <p className="text-xs text-navy-400">Approved by {approvedBy}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {current === 0 && (
          <PrimaryButton type="button" size="sm" disabled={busy !== null} onClick={() => void markReviewed()}>
            {spin('review') || <Check className="h-4 w-4" />} Mark as reviewed
          </PrimaryButton>
        )}
        {current === 1 && (
          <PrimaryButton type="button" size="sm" disabled={busy !== null} onClick={() => void approve()}>
            {spin('approve') || <Check className="h-4 w-4" />} Approve
          </PrimaryButton>
        )}
        {current >= 2 && current <= 3 && (
          <>
            <input
              type="date"
              value={day}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDay(e.target.value)}
              className="rounded-lg border border-navy-100 px-3 py-1.5 text-sm text-navy-900"
            />
            <Button type="button" size="sm" disabled={busy !== null || !day} onClick={() => void schedule(dayToIso(day))}>
              {spin('schedule') || <CalendarClock className="h-4 w-4" />} {scheduledAt ? 'Change date' : 'Schedule'}
            </Button>
            {scheduledAt && (
              <Button type="button" size="sm" disabled={busy !== null} onClick={() => void schedule(null)}>
                Remove date
              </Button>
            )}
            <PrimaryButton type="button" size="sm" disabled={busy !== null} onClick={() => void publishNow()}>
              {spin('publish') || <Rocket className="h-4 w-4" />} Publish now
            </PrimaryButton>
          </>
        )}
        {current >= 1 && current <= 3 && (
          <Button type="button" size="sm" disabled={busy !== null} onClick={() => void backToDraft()}>
            {spin('draft') || <Undo2 className="h-4 w-4" />} Back to draft
          </Button>
        )}
      </div>
      {current === 0 && <p className="mt-2 text-[11px] text-navy-300">Needs a cover, a short description, a price (or free) and at least one file.</p>}
      {current >= 1 && current <= 3 && (
        <p className="mt-2 text-[11px] text-navy-300">Saving changes in this page sends it back to Draft, to be reviewed again.</p>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </section>
  );
}
