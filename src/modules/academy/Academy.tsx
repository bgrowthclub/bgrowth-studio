import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, GraduationCap, Plus } from 'lucide-react';
import { PrimaryButton } from '../../components/ui/Button';
import { releaseLabel } from '../downloads/ReleasePanel';
import { getCourse, listCourses } from './api';
import { CourseEditor } from './CourseEditor';
import { emptyDraft, formatMinutes, toDraft } from './model';
import type { CourseCheck, CourseDraft, CourseListItem } from './types';

interface Props {
  ownerEmail: string;
  onHome?: () => void;
}

const STAGE_FILTERS: [string, string][] = [
  ['all', 'All'],
  ['draft', 'Draft'],
  ['ready_for_review', 'Waiting for approval'],
  ['approved', 'Approved / scheduled'],
  ['published', 'Published'],
];

/**
 * Studio → Academy: the courses of BGrowth Academy™ (modules → lessons),
 * worked through in BGrowth Workspace. A course is a product like any other,
 * so it goes through the same release flow and inherits price, bundles,
 * plans, coupons and reviews — see the Website's ARCHITECTURE.md §10.
 */
export function Academy({ ownerEmail, onHome }: Props) {
  const [items, setItems] = useState<CourseListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ draft: CourseDraft; check: CourseCheck | null } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [stage, setStage] = useState('all');

  const load = useCallback(() => {
    listCourses()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the courses.'));
  }, []);
  useEffect(load, [load]);

  async function open(id: string) {
    setOpening(id);
    setError(null);
    try {
      const { course, check } = await getCourse(id);
      setEditing({ draft: toDraft(course), check });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the course.');
    } finally {
      setOpening(null);
    }
  }

  const visible = items?.filter((c) => stage === 'all' || c.status === stage || (stage === 'draft' && c.status === 'archived'));

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans">
      <header className="flex items-center gap-3 border-b border-navy-100 bg-white px-4 py-4 sm:px-6">
        <button type="button" onClick={onHome} className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
          <ArrowLeft className="h-4 w-4" /> Home
        </button>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-brand-600" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">BGrowth Studio</p>
            <h1 className="text-sm font-extrabold text-navy-900">Academy</h1>
          </div>
        </div>
      </header>

      {editing ? (
        <CourseEditor
          key={editing.draft.studioProductId}
          initial={editing.draft}
          initialCheck={editing.check}
          ownerEmail={ownerEmail}
          onBack={() => setEditing(null)}
          onSaved={load}
        />
      ) : (
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-sm text-navy-500">
              Courses the member works through in their Workspace: modules, lessons and the tools each lesson hands over. A course sells like any other
              product — it can be free, paid, in a bundle or included in a plan.
            </p>
            <PrimaryButton type="button" size="sm" onClick={() => setEditing({ draft: emptyDraft(), check: null })}>
              <Plus className="h-4 w-4" /> New course
            </PrimaryButton>
          </div>
          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          {items && items.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {STAGE_FILTERS.map(([key, label]) => {
                const count = key === 'all' ? items.length : items.filter((c) => c.status === key).length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStage(key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      stage === key ? 'bg-navy-900 text-white' : 'bg-white text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-navy-100 bg-white">
            {items === null && !error && <p className="p-6 text-sm text-navy-400">Loading…</p>}
            {items?.length === 0 && <p className="p-6 text-sm text-navy-400">No courses yet.</p>}
            {visible?.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={opening !== null}
                onClick={() => void open(c.id)}
                className="flex w-full items-center gap-3 border-t border-navy-50 px-4 py-3 text-left first:border-t-0 hover:bg-navy-50/50 disabled:opacity-60"
              >
                {c.cover_image_url ? (
                  <img src={c.cover_image_url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                ) : (
                  <BookOpen className="h-5 w-5 shrink-0 text-brand-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy-900">{c.name}</p>
                  <p className="truncate text-xs text-navy-400">
                    /product/{c.slug} · {c.moduleCount} {c.moduleCount === 1 ? 'module' : 'modules'} · {c.lessonCount}{' '}
                    {c.lessonCount === 1 ? 'lesson' : 'lessons'}
                    {c.minutes > 0 && ` · ${formatMinutes(c.minutes)}`}
                    {c.is_free ? ' · Free' : c.price_cents ? ` · ${(c.price_cents / 100).toFixed(2)} ${(c.currency ?? 'usd').toUpperCase()}` : ''}
                  </p>
                </div>
                {opening === c.id && <span className="text-xs text-navy-400">Opening…</span>}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    c.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700'
                      : c.status === 'approved'
                        ? 'bg-brand-50 text-brand-700'
                        : c.status === 'ready_for_review'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-navy-50 text-navy-500'
                  }`}
                >
                  {releaseLabel(c.status, c.scheduled_publish_at)}
                </span>
              </button>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
