import { useState } from 'react';
import { CalendarClock, Check, EyeOff, Loader2, Rocket, Undo2 } from 'lucide-react';
import { Button, PrimaryButton } from '../../components/ui/Button';
import { knowledgeRelease, type KnowledgeReleaseAction } from './api/knowledgeEngineClient';
import type { KnowledgeItem } from './types';

const STEPS = ['Draft', 'Reviewed', 'Approved', 'Scheduled', 'Published'];

function stepIndex(status: string) {
  if (status === 'Published') return 4;
  if (status === 'Scheduled') return 3;
  if (status === 'Approved') return 2;
  if (status === 'In Review') return 1;
  return 0;
}

// A day picked as "YYYY-MM-DD" goes live that morning (the Website's daily
// job runs late morning, Brazil time).
function dayToIso(day: string) {
  return new Date(`${day}T08:00:00`).toISOString();
}

interface Props {
  item: KnowledgeItem;
  /** Saves the editor's current changes first. */
  saveFirst: () => Promise<boolean>;
  onChanged: (item: KnowledgeItem) => void;
}

/** The steps an article goes through before it is on the site: review, approval, date (Portal migration 0054). */
export function KnowledgeReleasePanel({ item, saveFirst, onChanged }: Props) {
  const { status, reviewedBy, approvedBy, scheduledAt, publishedAt } = item.publishing;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState(scheduledAt ? scheduledAt.slice(0, 10) : '');
  const current = stepIndex(status);

  async function run(key: string, body: KnowledgeReleaseAction, save = false) {
    setBusy(key);
    setError(null);
    try {
      if (save && !(await saveFirst())) return;
      onChanged(await knowledgeRelease(item.id, body));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  }

  const spin = (key: string) => busy === key && <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <section className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-navy-400">Release</p>
      <ol className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`rounded-full px-2.5 py-1 font-semibold ${
              status === 'Archived'
                ? 'bg-navy-50 text-navy-400'
                : i < current
                  ? 'bg-emerald-50 text-emerald-700'
                  : i === current
                    ? 'bg-brand-600 text-white'
                    : 'bg-navy-50 text-navy-400'
            }`}
          >
            {i < current && status !== 'Archived' && <Check className="mr-1 inline h-3 w-3" />}
            {label}
          </li>
        ))}
      </ol>
      {status === 'Archived' && <p className="text-xs font-semibold text-navy-500">Unpublished — not on the site.</p>}
      {reviewedBy && current >= 1 && <p className="text-xs text-navy-400">Reviewed by {reviewedBy}</p>}
      {approvedBy && current >= 2 && <p className="text-xs text-navy-400">Approved by {approvedBy}</p>}
      {scheduledAt && current === 3 && <p className="text-xs text-navy-400">Goes live on {new Date(scheduledAt).toLocaleDateString()}</p>}
      {publishedAt && current === 4 && <p className="text-xs text-navy-400">Published on {new Date(publishedAt).toLocaleDateString()}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {current === 0 && status !== 'Archived' && (
          <PrimaryButton type="button" size="sm" disabled={busy !== null} onClick={() => void run('review', { action: 'stage', stage: 'In Review' }, true)}>
            {spin('review') || <Check className="h-4 w-4" />} Mark as reviewed
          </PrimaryButton>
        )}
        {current === 1 && (
          <PrimaryButton type="button" size="sm" disabled={busy !== null} onClick={() => void run('approve', { action: 'stage', stage: 'Approved' })}>
            {spin('approve') || <Check className="h-4 w-4" />} Approve
          </PrimaryButton>
        )}
        {(current === 2 || current === 3) && (
          <>
            <input
              type="date"
              value={day}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDay(e.target.value)}
              className="rounded-lg border border-navy-100 px-3 py-1.5 text-sm text-navy-900"
            />
            <Button type="button" size="sm" disabled={busy !== null || !day} onClick={() => void run('schedule', { action: 'schedule', at: dayToIso(day) })}>
              {spin('schedule') || <CalendarClock className="h-4 w-4" />} {scheduledAt ? 'Change date' : 'Schedule'}
            </Button>
            {scheduledAt && (
              <Button type="button" size="sm" disabled={busy !== null} onClick={() => void run('unschedule', { action: 'schedule', at: null })}>
                Remove date
              </Button>
            )}
            <PrimaryButton
              type="button"
              size="sm"
              disabled={busy !== null}
              onClick={() => window.confirm('Publish it now? It goes on the site’s Knowledge hub.') && void run('publish', { action: 'publish-now' }, true)}
            >
              {spin('publish') || <Rocket className="h-4 w-4" />} Publish now
            </PrimaryButton>
          </>
        )}
        {current === 4 && (
          <Button
            type="button"
            size="sm"
            disabled={busy !== null}
            onClick={() => window.confirm('Take it off the site?') && void run('unpublish', { action: 'unpublish' })}
          >
            {spin('unpublish') || <EyeOff className="h-4 w-4" />} Unpublish
          </Button>
        )}
        {((current >= 1 && current <= 3) || status === 'Archived') && (
          <Button type="button" size="sm" disabled={busy !== null} onClick={() => void run('draft', { action: 'stage', stage: 'Draft' })}>
            {spin('draft') || <Undo2 className="h-4 w-4" />} Back to draft
          </Button>
        )}
      </div>
      {current === 0 && status !== 'Archived' && (
        <p className="mt-2 text-[11px] text-navy-300">Needs a title, address (slug), excerpt, featured image and content. Saving happens first.</p>
      )}
      {current === 4 && <p className="mt-2 text-[11px] text-navy-300">Changes you save now show on the site right away.</p>}
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </section>
  );
}
