import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { PrimaryButton } from '../../components/ui/Button';
import { importWixCourses, listWixPrograms } from './wixImport';
import type { WixImportProgress, WixProgram } from './wixImport';

// Studio → Academy → "Import from Wix" (02/11/2026).
//
// The 72 courses on the old Wix site are Online Programs: modules, lessons
// and quizzes, all readable. They come across as DRAFTS — nothing is
// published, nothing is priced differently, and bringing a course again
// updates the same product instead of making a second one.
//
// Wix stores no answer key for its typed and numeric questions, so those
// arrive blank: kept here to be written, and hidden from students until
// they are. The panel says so, with the count, rather than letting it be a
// surprise later.
export function WixCoursesPanel({ ownerEmail, onDone, onClose }: { ownerEmail: string; onDone: () => void; onClose: () => void }) {
  const [programs, setPrograms] = useState<WixProgram[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<WixImportProgress | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(() => {
    setError(null);
    setPrograms(null);
    listWixPrograms()
      .then((list) => {
        setPrograms(list);
        // Everything not here yet starts ticked — the usual intent.
        setPicked(new Set(list.filter((p) => !p.imported).map((p) => p.programId)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not read the Wix courses.'));
  }, []);
  useEffect(load, [load]);

  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function run() {
    if (!programs) return;
    const chosen = programs.filter((p) => picked.has(p.programId));
    if (!chosen.length) return;
    setRunning(true);
    setError(null);
    try {
      const result = await importWixCourses(chosen, ownerEmail, setProgress);
      setProgress(result);
      onDone();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The import stopped.');
    } finally {
      setRunning(false);
    }
  }

  const pending = (progress?.imported ?? []).reduce((n, c) => n + c.counts.pendingQuestions, 0);
  const lessons = (progress?.imported ?? []).reduce((n, c) => n + c.counts.lessons, 0);

  return (
    <div className="mb-5 rounded-xl border border-navy-100 bg-white p-4">
      <div className="mb-2 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-navy-900">Import from Wix</h2>
          <p className="mt-0.5 text-xs text-navy-500">
            The courses on the old site, with their modules, lessons and quizzes. They arrive as drafts — nothing is published.
            Questions Wix has no answer for arrive blank and stay hidden from students until you write the answer.
          </p>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-navy-400 hover:bg-navy-50">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
          <button type="button" onClick={load} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:underline">
            <RefreshCw className="h-3 w-3" /> Try again
          </button>
        </div>
      )}

      {!programs && !error && <p className="text-xs text-navy-400">Reading the Wix courses…</p>}

      {programs && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <PrimaryButton type="button" size="sm" disabled={running || picked.size === 0} onClick={run}>
              <Download className="h-4 w-4" />
              {running ? 'Bringing them across…' : `Bring ${picked.size} course${picked.size === 1 ? '' : 's'} across`}
            </PrimaryButton>
            <button
              type="button"
              disabled={running}
              onClick={() => setPicked(new Set(programs.filter((p) => !p.imported).map((p) => p.programId)))}
              className="text-xs font-semibold text-brand hover:underline disabled:opacity-40"
            >
              Only the ones not here yet
            </button>
            <button type="button" disabled={running} onClick={() => setPicked(new Set())} className="text-xs font-semibold text-navy-400 hover:underline disabled:opacity-40">
              Clear
            </button>
          </div>

          {progress && (
            <div className="mb-3 rounded-lg bg-navy-50 px-3 py-2">
              <p className="text-xs font-semibold text-navy-700">
                {progress.done} of {progress.total}
                {progress.current && ` · ${progress.current}`}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-100">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                />
              </div>
              {!running && progress.done === progress.total && (
                <p className="mt-1.5 text-xs text-navy-500">
                  {progress.imported.length} course{progress.imported.length === 1 ? '' : 's'}, {lessons} lessons.
                  {pending > 0 && ` ${pending} question${pending === 1 ? '' : 's'} still need an answer — students don’t see those.`}
                </p>
              )}
              {progress.failed.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {progress.failed.map((f) => (
                    <li key={f.name} className="text-xs text-red-600">
                      {f.name}: {f.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {programs.map((p) => (
              <label key={p.programId} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-navy-50">
                <input
                  type="checkbox"
                  checked={picked.has(p.programId)}
                  disabled={running}
                  onChange={() => toggle(p.programId)}
                  className="h-3.5 w-3.5 shrink-0"
                />
                <span className="min-w-0 flex-1 truncate text-xs text-navy-700">{p.name || p.programId}</span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-navy-400">{p.wixStatus}</span>
                {p.imported && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">already here</span>
                )}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-navy-400">
            Ticking one that is already here brings it again and overwrites that draft.
          </p>
        </>
      )}
    </div>
  );
}
