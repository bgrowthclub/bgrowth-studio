import { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronRight, Plus, Upload, X } from 'lucide-react';
import { PrimaryButton } from '../../components/ui/Button';
import { ReleasePanel } from '../downloads/ReleasePanel';
import { getCourse, saveCourseDraft } from './api';
import { BLOCK_TYPES, MAX_LESSON_MINUTES, emptyBlock, emptyLesson, emptyModule, formatMinutes, move, parseCourseJson, slugFrom, totalMinutes } from './model';
import type { CourseBlock, CourseBlockType, CourseCheck, CourseDraft, CourseLesson, CourseModule } from './types';

interface Props {
  initial: CourseDraft;
  initialCheck: CourseCheck | null;
  ownerEmail: string;
  onBack: () => void;
  onSaved: () => void;
}

const INPUT = 'w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-brand';
const LABEL = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400';
const SMALL = 'rounded-md px-2 py-1 text-xs font-semibold';

/**
 * Studio → Academy → one course: its basics, its modules and lessons, and
 * the release steps. Saving always writes a DRAFT; review, approval and
 * publishing are the release flow, the same every product takes.
 */
export function CourseEditor({ initial, initialCheck, ownerEmail, onBack, onSaved }: Props) {
  const [draft, setDraft] = useState<CourseDraft>(initial);
  const [check, setCheck] = useState<CourseCheck | null>(initialCheck);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [openModule, setOpenModule] = useState<string | null>(initial.content.modules[0]?.id ?? null);
  const [importing, setImporting] = useState(false);
  const [json, setJson] = useState('');

  const edit = (patch: Partial<CourseDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const setModules = (modules: CourseModule[]) => setDraft((d) => ({ ...d, content: { ...d.content, modules } }));
  const patchModule = (mi: number, patch: Partial<CourseModule>) =>
    setModules(draft.content.modules.map((m, i) => (i === mi ? { ...m, ...patch } : m)));
  const patchLesson = (mi: number, li: number, patch: Partial<CourseLesson>) =>
    patchModule(mi, { lessons: draft.content.modules[mi].lessons.map((l, i) => (i === li ? { ...l, ...patch } : l)) });
  const patchBlock = (mi: number, li: number, bi: number, block: CourseBlock) =>
    patchLesson(mi, li, { blocks: draft.content.modules[mi].lessons[li].blocks.map((b, i) => (i === bi ? block : b)) });

  // The name writes the address until someone types one of their own.
  function setName(name: string) {
    edit({ name, ...(draft.slugEdited ? {} : { slug: slugFrom(name) }) });
  }

  function problems(): string[] {
    const out: string[] = [];
    if (!draft.name.trim()) out.push('The course needs a name.');
    if (!draft.slug.trim()) out.push('The course needs an address.');
    if (!draft.shortDescription.trim()) out.push('The course needs a short description.');
    if (!draft.content.modules.length) out.push('The course needs at least one module.');
    if (!draft.isFree && !draft.priceCents) out.push('Set a price, or mark the course as free.');
    return out;
  }

  async function refreshCheck(productId?: string) {
    if (!productId) return;
    try {
      setCheck((await getCourse(productId)).check);
    } catch {
      // The check is a help, never a gate on saving.
    }
  }

  async function save(): Promise<boolean> {
    setError(null);
    setNotice(null);
    const found = problems();
    if (found.length) {
      setError(found.join(' '));
      return false;
    }
    if (
      draft.status === 'published' &&
      !window.confirm('Saving takes this course off the site until it is reviewed, approved and published again. Students keep their progress and their notes. Continue?')
    )
      return false;
    setBusy('save');
    try {
      const result = await saveCourseDraft(draft, ownerEmail);
      const productId = result.product?.id ?? draft.productId;
      setDraft((d) => ({ ...d, productId, slugEdited: true, status: 'draft', scheduledPublishAt: null, reviewedBy: null, approvedBy: null }));
      setNotice('Draft saved.');
      onSaved();
      await refreshCheck(productId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  function importJson() {
    setError(null);
    try {
      const { content, name, shortDescription } = parseCourseJson(json);
      setDraft((d) => ({
        ...d,
        content,
        ...(name && !d.name.trim() ? { name, slug: d.slugEdited ? d.slug : slugFrom(name) } : {}),
        ...(shortDescription && !d.shortDescription.trim() ? { shortDescription } : {}),
      }));
      setOpenModule(content.modules[0]?.id ?? null);
      setImporting(false);
      setJson('');
      setNotice(`Loaded: ${content.modules.length} modules, ${content.modules.reduce((n, m) => n + m.lessons.length, 0)} lessons. Nothing is saved until you save.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read this JSON.');
    }
  }

  const minutes = totalMinutes(draft.content);
  const lessonCount = draft.content.modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800">
          <ArrowLeft className="h-4 w-4" /> All courses
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setImporting((v) => !v)} className={`${SMALL} flex items-center gap-1.5 text-navy-500 ring-1 ring-navy-100 hover:bg-navy-50`}>
            <Upload className="h-3.5 w-3.5" /> Import JSON
          </button>
          <PrimaryButton type="button" size="sm" disabled={busy !== null} onClick={() => void save()}>
            {busy === 'save' ? 'Saving…' : 'Save draft'}
          </PrimaryButton>
        </div>
      </div>

      {importing && (
        <section className="rounded-xl border border-navy-100 bg-white p-4">
          <p className="text-sm font-bold text-navy-800">Paste a course as JSON</p>
          <p className="mt-1 text-xs text-navy-400">
            Either the content on its own or a whole course. Missing ids are filled in. This replaces the modules below; nothing is saved until you save.
          </p>
          <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={8} className={`${INPUT} mt-2 font-mono text-xs`} placeholder='{ "kind": "course", "version": 1, "modules": [ … ] }' />
          <div className="mt-2 flex gap-2">
            <PrimaryButton type="button" size="sm" disabled={!json.trim()} onClick={importJson}>
              Load
            </PrimaryButton>
            <button type="button" onClick={() => setImporting(false)} className={`${SMALL} text-navy-500 ring-1 ring-navy-100`}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-navy-100 bg-white p-4 sm:p-5">
        <p className="mb-3 text-sm font-bold text-navy-800">The course</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Name</label>
            <input value={draft.name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="Notary Basics" />
          </div>
          <div>
            <label className={LABEL}>Address</label>
            <input value={draft.slug} onChange={(e) => edit({ slug: slugFrom(e.target.value), slugEdited: true })} className={INPUT} placeholder="notary-basics" />
          </div>
        </div>
        <div className="mt-3">
          <label className={LABEL}>Short description</label>
          <input value={draft.shortDescription} onChange={(e) => edit({ shortDescription: e.target.value })} className={INPUT} placeholder="What the student will be able to do." />
        </div>
        <div className="mt-3">
          <label className={LABEL}>Intro (optional)</label>
          <textarea
            value={draft.content.intro ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, content: { ...d.content, intro: e.target.value } }))}
            rows={3}
            className={INPUT}
            placeholder="A few lines before the first module."
          />
        </div>
        <div className="mt-3">
          <label className={LABEL}>Cover image (optional)</label>
          <input value={draft.coverImageUrl} onChange={(e) => edit({ coverImageUrl: e.target.value })} className={INPUT} placeholder="https://…" />
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={draft.isFree} onChange={(e) => edit({ isFree: e.target.checked, priceCents: e.target.checked ? null : draft.priceCents })} />
            Free
          </label>
          {!draft.isFree && (
            <div>
              <label className={LABEL}>Price (cents)</label>
              <input
                type="number"
                min={50}
                value={draft.priceCents ?? ''}
                onChange={(e) => edit({ priceCents: e.target.value ? Number(e.target.value) : null })}
                className={`${INPUT} w-40`}
                placeholder="4900"
              />
            </div>
          )}
          <p className="text-xs text-navy-400">
            {draft.content.modules.length} {draft.content.modules.length === 1 ? 'module' : 'modules'} · {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
            {minutes > 0 && ` · ${formatMinutes(minutes)}`}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-navy-100 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-navy-800">Modules and lessons</p>
          <button type="button" onClick={() => setModules([...draft.content.modules, emptyModule()])} className={`${SMALL} flex items-center gap-1 text-brand-600 hover:bg-brand-50`}>
            <Plus className="h-3.5 w-3.5" /> Module
          </button>
        </div>

        <div className="space-y-2">
          {draft.content.modules.map((module, mi) => {
            const open = openModule === module.id;
            return (
              <div key={module.id} className="rounded-lg border border-navy-100">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button type="button" onClick={() => setOpenModule(open ? null : module.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {open ? <ChevronDown className="h-4 w-4 shrink-0 text-navy-300" /> : <ChevronRight className="h-4 w-4 shrink-0 text-navy-300" />}
                    <span className="truncate text-sm font-semibold text-navy-900">{module.title || `Module ${mi + 1}`}</span>
                    <span className="shrink-0 text-xs text-navy-400">
                      {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                    </span>
                  </button>
                  <button type="button" aria-label="Move up" disabled={mi === 0} onClick={() => setModules(move(draft.content.modules, mi, -1))} className={`${SMALL} text-navy-400 hover:bg-navy-50 disabled:opacity-30`}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={mi === draft.content.modules.length - 1}
                    onClick={() => setModules(move(draft.content.modules, mi, 1))}
                    className={`${SMALL} text-navy-400 hover:bg-navy-50 disabled:opacity-30`}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove module"
                    onClick={() => window.confirm(`Remove “${module.title || `Module ${mi + 1}`}” and its lessons?`) && setModules(draft.content.modules.filter((_, i) => i !== mi))}
                    className={`${SMALL} text-red-500 hover:bg-red-50`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {open && (
                  <div className="space-y-3 border-t border-navy-50 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input value={module.title} onChange={(e) => patchModule(mi, { title: e.target.value })} className={INPUT} placeholder="Module title" />
                      <input value={module.summary ?? ''} onChange={(e) => patchModule(mi, { summary: e.target.value })} className={INPUT} placeholder="One line about it (optional)" />
                    </div>

                    {module.lessons.map((lesson, li) => (
                      <div key={lesson.id} className="rounded-lg bg-navy-50/40 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <input value={lesson.title} onChange={(e) => patchLesson(mi, li, { title: e.target.value })} className={`${INPUT} flex-1`} placeholder={`Lesson ${li + 1} title`} />
                          <input
                            type="number"
                            min={1}
                            max={MAX_LESSON_MINUTES}
                            value={lesson.minutes ?? ''}
                            onChange={(e) => patchLesson(mi, li, { minutes: e.target.value ? Number(e.target.value) : undefined })}
                            className={`${INPUT} w-24`}
                            placeholder="min"
                            aria-label="Minutes"
                          />
                          <button type="button" aria-label="Move lesson up" disabled={li === 0} onClick={() => patchModule(mi, { lessons: move(module.lessons, li, -1) })} className={`${SMALL} text-navy-400 hover:bg-navy-100 disabled:opacity-30`}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Move lesson down"
                            disabled={li === module.lessons.length - 1}
                            onClick={() => patchModule(mi, { lessons: move(module.lessons, li, 1) })}
                            className={`${SMALL} text-navy-400 hover:bg-navy-100 disabled:opacity-30`}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove lesson"
                            onClick={() => patchModule(mi, { lessons: module.lessons.filter((_, i) => i !== li) })}
                            className={`${SMALL} text-red-500 hover:bg-red-50`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mt-2 space-y-2">
                          {lesson.blocks.map((block, bi) => (
                            <BlockFields
                              key={bi}
                              block={block}
                              onChange={(next) => patchBlock(mi, li, bi, next)}
                              onRemove={() => patchLesson(mi, li, { blocks: lesson.blocks.filter((_, i) => i !== bi) })}
                              onMove={(by) => patchLesson(mi, li, { blocks: move(lesson.blocks, bi, by) })}
                              first={bi === 0}
                              last={bi === lesson.blocks.length - 1}
                            />
                          ))}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {BLOCK_TYPES.map((t) => (
                            <button
                              key={t.type}
                              type="button"
                              title={t.hint}
                              onClick={() => patchLesson(mi, li, { blocks: [...lesson.blocks, emptyBlock(t.type)] })}
                              className={`${SMALL} text-navy-500 ring-1 ring-navy-100 hover:bg-white`}
                            >
                              + {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button type="button" onClick={() => patchModule(mi, { lessons: [...module.lessons, emptyLesson()] })} className={`${SMALL} flex items-center gap-1 text-brand-600 hover:bg-brand-50`}>
                      <Plus className="h-3.5 w-3.5" /> Lesson
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {check && (check.problems.length > 0 || check.warnings.length > 0) && (
        <section className="rounded-xl border border-navy-100 bg-white p-4 sm:p-5">
          <p className="text-sm font-bold text-navy-800">Before this course can be released</p>
          {check.problems.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-red-600">
              {check.problems.map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
            </ul>
          )}
          {check.warnings.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-amber-600">
              {check.warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {notice && <p className="text-sm font-medium text-emerald-600">{notice}</p>}

      {draft.productId && draft.status !== 'published' && draft.status !== 'archived' && (
        <ReleasePanel
          key={`${draft.status}-${draft.scheduledPublishAt ?? ''}`}
          productId={draft.productId}
          status={draft.status}
          scheduledAt={draft.scheduledPublishAt}
          reviewedBy={draft.reviewedBy}
          approvedBy={draft.approvedBy}
          ownerEmail={ownerEmail}
          requirements="Needs a name, an address, a short description, a price (or free), and every module with at least one lesson. See the check above."
          publishConfirm="Publish this course now? It goes on sale on bgrowth.app."
          saveFirst={save}
          onChanged={(next) =>
            setDraft((d) => ({
              ...d,
              status: next.status,
              scheduledPublishAt: next.scheduledAt,
              ...(next.reviewedBy !== undefined ? { reviewedBy: next.reviewedBy } : {}),
              ...(next.approvedBy !== undefined ? { approvedBy: next.approvedBy } : {}),
            }))
          }
        />
      )}
    </main>
  );
}

/** The fields of one block — only the ones its type actually has. */
function BlockFields({
  block,
  onChange,
  onRemove,
  onMove,
  first,
  last,
}: {
  block: CourseBlock;
  onChange: (next: CourseBlock) => void;
  onRemove: () => void;
  onMove: (by: number) => void;
  first: boolean;
  last: boolean;
}) {
  const label = BLOCK_TYPES.find((t) => t.type === block.type)?.label ?? block.type;
  const set = (patch: Record<string, unknown>) => onChange({ ...block, ...patch } as CourseBlock);
  return (
    <div className="rounded-md border border-navy-100 bg-white p-2">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-navy-400">{label}</span>
        <span className="flex-1" />
        <button type="button" aria-label="Move up" disabled={first} onClick={() => onMove(-1)} className={`${SMALL} text-navy-400 hover:bg-navy-50 disabled:opacity-30`}>
          <ArrowUp className="h-3 w-3" />
        </button>
        <button type="button" aria-label="Move down" disabled={last} onClick={() => onMove(1)} className={`${SMALL} text-navy-400 hover:bg-navy-50 disabled:opacity-30`}>
          <ArrowDown className="h-3 w-3" />
        </button>
        <button type="button" aria-label="Remove block" onClick={onRemove} className={`${SMALL} text-red-500 hover:bg-red-50`}>
          <X className="h-3 w-3" />
        </button>
      </div>

      {block.type === 'text' && <textarea value={block.body} onChange={(e) => set({ body: e.target.value })} rows={4} className={INPUT} placeholder="Write the lesson. Line breaks are kept." />}

      {(block.type === 'image' || block.type === 'video' || block.type === 'file' || block.type === 'link') && (
        <div className="space-y-2">
          <input value={block.url} onChange={(e) => set({ url: e.target.value.trim() })} className={INPUT} placeholder="https://…" />
          {block.url.trim() && !block.url.trim().startsWith('https://') && <p className="text-xs text-red-500">The address has to start with https://</p>}
          {block.type === 'image' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={block.alt ?? ''} onChange={(e) => set({ alt: e.target.value })} className={INPUT} placeholder="What the image shows (for screen readers)" />
              <input value={block.caption ?? ''} onChange={(e) => set({ caption: e.target.value })} className={INPUT} placeholder="Caption (optional)" />
            </div>
          )}
          {block.type === 'video' && <input value={block.title ?? ''} onChange={(e) => set({ title: e.target.value })} className={INPUT} placeholder="Video title (optional)" />}
          {(block.type === 'file' || block.type === 'link') && (
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={block.label ?? ''} onChange={(e) => set({ label: e.target.value })} className={INPUT} placeholder="Button text (optional)" />
              <input value={block.note ?? ''} onChange={(e) => set({ note: e.target.value })} className={INPUT} placeholder="A line about it (optional)" />
            </div>
          )}
        </div>
      )}

      {block.type === 'product' && (
        <div className="space-y-2">
          <input value={block.slug} onChange={(e) => set({ slug: e.target.value.trim() })} className={INPUT} placeholder="The product's address, e.g. notary-starter-kit" />
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={block.label ?? ''} onChange={(e) => set({ label: e.target.value })} className={INPUT} placeholder="Button text (optional)" />
            <input value={block.note ?? ''} onChange={(e) => set({ note: e.target.value })} className={INPUT} placeholder="Why the student needs it (optional)" />
          </div>
          <p className="text-xs text-navy-400">The lesson points at the product — it never copies its content.</p>
        </div>
      )}
    </div>
  );
}
