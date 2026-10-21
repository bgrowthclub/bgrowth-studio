import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ExternalLink, ImagePlus, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { CATEGORY_ADMIN_URL, useWorkspaceCategories } from '../../lib/workspaceCategories';
import { uploadGalleryFile } from '../../lib/productGallery';
import { releaseAction } from '../downloads/api';
import { ReleasePanel } from '../downloads/ReleasePanel';
import { getJourney, saveJourneyDraft } from './api';
import {
  ACTION_KINDS,
  addAction,
  addStage,
  draftProblems,
  moveAction,
  moveStage,
  removeAction,
  removeStage,
  setActionKind,
  toSlug,
  updateAction,
  updateStage,
} from './model';
import { ArticlePicker, ProductPicker } from './ResourcePicker';
import type { JourneyAction, JourneyActionKind, JourneyCheck, JourneyContent, JourneyDraft, JourneyResources, JourneyStage } from './types';

interface Props {
  initial: JourneyDraft;
  initialCheck: JourneyCheck | null;
  resources: JourneyResources | null;
  ownerEmail: string;
  onBack: () => void;
  onSaved: () => void;
}

const INPUT = 'w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-brand';
const LABEL = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-navy-400';
const CARD = 'rounded-xl border border-navy-100 bg-white p-5';
const ICON_BTN = 'rounded-md p-1 text-navy-400 hover:bg-navy-50 hover:text-navy-700 disabled:opacity-30 disabled:hover:bg-transparent';

const SITE_JOURNEYS = 'https://bgrowth.app/journeys/';

/** One Journey: page details, stages and actions (any number, any names), check and release. */
export function JourneyEditor({ initial, initialCheck, resources, ownerEmail, onBack, onSaved }: Props) {
  const [draft, setDraft] = useState<JourneyDraft>(initial);
  const [check, setCheck] = useState<JourneyCheck | null>(initialCheck);
  const [checking, setChecking] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | 'cover' | 'draft'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { rows: categoryRows, areas, status: categoryStatus } = useWorkspaceCategories();

  const edit = (patch: Partial<JourneyDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  const editContent = (fn: (c: JourneyContent) => JourneyContent) => {
    setDraft((d) => ({ ...d, content: fn(d.content) }));
    setDirty(true);
  };

  // The saved category arrives as an id; show it once the list has loaded.
  useEffect(() => {
    if (categoryStatus !== 'ready' || !draft.categoryId || draft.categorySlug) return;
    const slug = categoryRows.find((c) => c.id === draft.categoryId)?.slug;
    if (slug) setDraft((d) => ({ ...d, categorySlug: slug }));
  }, [categoryStatus, categoryRows, draft.categoryId, draft.categorySlug]);

  const refreshCheck = useCallback(async (productId: string | null) => {
    if (!productId) return;
    setChecking(true);
    try {
      const { check: next } = await getJourney(productId);
      setCheck(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run the check.');
    } finally {
      setChecking(false);
    }
  }, []);

  function setName(name: string) {
    edit(draft.slugEdited ? { name } : { name, slug: toSlug(name) });
  }

  async function uploadCover(file: File | undefined) {
    if (!file) return;
    setBusy('cover');
    setError(null);
    try {
      edit({ coverImageUrl: await uploadGalleryFile(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(null);
    }
  }

  async function save(): Promise<boolean> {
    setError(null);
    setNotice(null);
    const problems = draftProblems(draft);
    if (problems.length) {
      setError(problems.join(' '));
      return false;
    }
    if (draft.status === 'published' && !window.confirm('Saving takes this Journey off bgrowth.app until it is reviewed, approved and published again. Members keep their progress. Continue?')) {
      return false;
    }
    setBusy('draft');
    try {
      const result = await saveJourneyDraft(draft, ownerEmail);
      const productId = result.product?.id ?? draft.productId;
      setDraft((d) => ({ ...d, productId, slugEdited: true, status: 'draft', scheduledPublishAt: null, reviewedBy: null, approvedBy: null }));
      setDirty(false);
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

  async function remove() {
    if (!draft.productId) return;
    if (!window.confirm(`Delete “${draft.name}”? This can’t be undone. The products and articles it points to are not touched.`)) return;
    setError(null);
    try {
      await releaseAction(draft.productId, { action: 'delete' });
      onSaved();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.');
    }
  }

  const c = draft.content;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="text-xs font-semibold text-brand-600 hover:underline">
          ← All journeys
        </button>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">Journey · Free</span>
        {draft.status && <span className="text-xs text-navy-400">Status: {draft.status}</span>}
        {dirty && <span className="text-xs font-semibold text-amber-600">Unsaved changes</span>}
      </div>

      <section className={`${CARD} space-y-4`}>
        <h2 className="text-sm font-extrabold text-navy-900">Journey</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Name</span>
            <input value={draft.name} onChange={(e) => setName(e.target.value)} className={INPUT} placeholder="e.g. Start your own business" />
          </label>
          <label className="block">
            <span className={LABEL}>Address (slug)</span>
            <input value={draft.slug} onChange={(e) => edit({ slug: toSlug(e.target.value), slugEdited: true })} className={INPUT} />
            <span className="mt-1 block truncate text-[11px] text-navy-300">
              {SITE_JOURNEYS}
              {draft.slug || '…'}
              {draft.status === 'published' && ' · changing it breaks links already shared'}
            </span>
          </label>
        </div>
        <label className="block">
          <span className={LABEL}>Short description</span>
          <textarea value={draft.shortDescription} onChange={(e) => edit({ shortDescription: e.target.value })} rows={2} className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>Goal</span>
          <input
            value={c.goal}
            onChange={(e) => editContent((x) => ({ ...x, goal: e.target.value }))}
            className={INPUT}
            placeholder="What the member will have achieved at the end"
          />
        </label>
        <label className="block">
          <span className={LABEL}>Introduction</span>
          <textarea value={c.intro} onChange={(e) => editContent((x) => ({ ...x, intro: e.target.value }))} rows={4} className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>Completion message</span>
          <textarea
            value={c.completionMessage}
            onChange={(e) => editContent((x) => ({ ...x, completionMessage: e.target.value }))}
            rows={3}
            className={INPUT}
            placeholder="Shown when the member finishes"
          />
        </label>
        <label className="block">
          <span className={LABEL}>Notice (always shown)</span>
          <textarea value={c.notice} onChange={(e) => editContent((x) => ({ ...x, notice: e.target.value }))} rows={3} className={INPUT} />
          <span className="mt-1 block text-[11px] text-navy-300">General information never replaces the official rules where the member lives.</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Category (Life World)</span>
            <select value={draft.categorySlug} onChange={(e) => edit({ categorySlug: e.target.value })} className={INPUT} disabled={categoryStatus !== 'ready'}>
              <option value="">{categoryStatus === 'loading' ? 'Loading…' : 'No category'}</option>
              {areas.map((area) => (
                <optgroup key={area.id} label={area.name}>
                  <option value={area.slug}>{area.name} (whole area)</option>
                  {area.children.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <a href={CATEGORY_ADMIN_URL} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-navy-400 hover:text-brand">
              Manage categories <ExternalLink className="h-3 w-3" />
            </a>
          </label>
          <div>
            <span className={LABEL}>Cover image</span>
            <div className="flex items-center gap-3">
              {draft.coverImageUrl ? (
                <img src={draft.coverImageUrl} alt="" className="h-16 w-16 rounded-lg border border-navy-100 object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-navy-200 text-navy-300">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
              <label className="cursor-pointer rounded-lg border border-navy-100 bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 shadow-sm hover:bg-navy-50">
                {busy === 'cover' ? 'Uploading…' : draft.coverImageUrl ? 'Replace image' : 'Upload image'}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void uploadCover(e.target.files?.[0])} />
              </label>
            </div>
          </div>
        </div>
        {c.validatedStates.length > 0 && (
          <p className="text-xs text-navy-400">Validated states (kept as saved): {c.validatedStates.join(', ')}</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-navy-900">Stages</h2>
          <span className="text-xs text-navy-400">Name and order them as this Journey needs.</span>
        </div>
        {c.stages.length === 0 && <p className={`${CARD} text-sm text-navy-400`}>No stages yet.</p>}
        {c.stages.map((stage, i) => (
          <StageCard
            key={stage.id}
            stage={stage}
            index={i}
            count={c.stages.length}
            resources={resources}
            onChange={(patch) => editContent((x) => updateStage(x, stage.id, patch))}
            onMove={(delta) => editContent((x) => moveStage(x, stage.id, delta))}
            onRemove={() => {
              if (stage.actions.length === 0 || window.confirm(`Remove the stage “${stage.title || `Stage ${i + 1}`}” and its ${stage.actions.length} actions?`)) {
                editContent((x) => removeStage(x, stage.id));
              }
            }}
            onAddAction={() => editContent((x) => addAction(x, stage.id))}
            onAction={(actionId, patch) => editContent((x) => updateAction(x, stage.id, actionId, patch))}
            onActionKind={(actionId, kind) => editContent((x) => setActionKind(x, stage.id, actionId, kind))}
            onMoveAction={(actionId, delta) => editContent((x) => moveAction(x, stage.id, actionId, delta))}
            onRemoveAction={(actionId) => editContent((x) => removeAction(x, stage.id, actionId))}
          />
        ))}
        <Button type="button" size="sm" disabled={c.stages.length >= 12} onClick={() => editContent(addStage)}>
          <Plus className="h-4 w-4" /> Add stage
        </Button>
      </section>

      <CheckPanel check={check} saved={Boolean(draft.productId)} dirty={dirty} checking={checking} onRefresh={() => void refreshCheck(draft.productId)} />

      {error && <p className="text-sm text-red-500">{error}</p>}
      {notice && <p className="text-sm font-medium text-emerald-600">{notice}</p>}
      {draft.productId && draft.status !== 'published' && draft.status !== 'archived' ? (
        <ReleasePanel
          key={`${draft.status}-${draft.scheduledPublishAt ?? ''}`}
          productId={draft.productId}
          status={draft.status}
          scheduledAt={draft.scheduledPublishAt}
          reviewedBy={draft.reviewedBy}
          approvedBy={draft.approvedBy}
          ownerEmail={ownerEmail}
          requirements="Needs a cover, a short description, a goal, the notice, and every stage with at least one complete action. See the check above."
          publishConfirm="Publish this Journey now? It goes live on bgrowth.app."
          saveFirst={save}
          onChanged={(next) => {
            setDraft((d) => ({
              ...d,
              status: next.status,
              scheduledPublishAt: next.scheduledAt,
              ...(next.reviewedBy !== undefined ? { reviewedBy: next.reviewedBy } : {}),
              ...(next.approvedBy !== undefined ? { approvedBy: next.approvedBy } : {}),
            }));
            onSaved();
          }}
        />
      ) : (
        !draft.productId && <p className="text-xs text-navy-400">Save a draft to start the release steps (review, approval, date).</p>
      )}
      {draft.status === 'published' && (
        <p className="text-xs text-navy-400">Published. To change it, save your edits — it goes back to Draft and through review again.</p>
      )}
      <div className="flex flex-wrap gap-2 pb-10">
        <Button type="button" disabled={busy !== null} onClick={() => void save()}>
          {busy === 'draft' ? 'Saving…' : draft.status === 'published' ? 'Save as draft (takes it off the site)' : 'Save draft'}
        </Button>
        {draft.productId && draft.status !== 'published' && (
          <Button type="button" disabled={busy !== null} onClick={() => void remove()} className="text-red-500 hover:border-red-200 hover:bg-red-50">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>
    </div>
  );
}

function CheckPanel({ check, saved, dirty, checking, onRefresh }: { check: JourneyCheck | null; saved: boolean; dirty: boolean; checking: boolean; onRefresh: () => void }) {
  return (
    <section className={CARD}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Ready for review?</p>
        {saved && (
          <Button type="button" size="sm" variant="ghost" disabled={checking} onClick={onRefresh}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Check again
          </Button>
        )}
      </div>
      {!saved && <p className="text-sm text-navy-400">Save a draft to check it.</p>}
      {saved && dirty && <p className="mb-2 text-xs font-medium text-amber-600">The check below is for the last saved version.</p>}
      {saved && check && check.ready && (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Nothing blocks review.
        </p>
      )}
      {check && check.errors.length > 0 && (
        <ul className="space-y-1 text-sm text-red-600">
          {check.errors.map((e, i) => (
            <li key={`e${i}`} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {e.message}
            </li>
          ))}
        </ul>
      )}
      {check && check.warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-amber-700">
          {check.warnings.map((w, i) => (
            <li key={`w${i}`}>• {w.message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface StageProps {
  stage: JourneyStage;
  index: number;
  count: number;
  resources: JourneyResources | null;
  onChange: (patch: Partial<Pick<JourneyStage, 'title' | 'summary'>>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onAddAction: () => void;
  onAction: (actionId: string, patch: Partial<Omit<JourneyAction, 'id'>>) => void;
  onActionKind: (actionId: string, kind: JourneyActionKind) => void;
  onMoveAction: (actionId: string, delta: -1 | 1) => void;
  onRemoveAction: (actionId: string) => void;
}

function StageCard({ stage, index, count, resources, onChange, onMove, onRemove, onAddAction, onAction, onActionKind, onMoveAction, onRemoveAction }: StageProps) {
  return (
    <div className={`${CARD} space-y-3`}>
      <div className="flex items-start gap-2">
        <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{index + 1}</span>
        <div className="min-w-0 flex-1 space-y-2">
          <input value={stage.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Stage title" className={`${INPUT} font-semibold`} />
          <textarea value={stage.summary} onChange={(e) => onChange({ summary: e.target.value })} rows={2} placeholder="What happens in this stage (optional)" className={INPUT} />
        </div>
        <div className="flex shrink-0 flex-col">
          <button type="button" className={ICON_BTN} disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move stage up">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" className={ICON_BTN} disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Move stage down">
            <ArrowDown className="h-4 w-4" />
          </button>
          <button type="button" className={`${ICON_BTN} hover:text-red-500`} onClick={onRemove} aria-label="Remove stage">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 pl-8">
        {stage.actions.length === 0 && <p className="text-xs text-navy-400">No actions yet.</p>}
        {stage.actions.map((action, j) => (
          <ActionRow
            key={action.id}
            action={action}
            index={j}
            count={stage.actions.length}
            resources={resources}
            onChange={(patch) => onAction(action.id, patch)}
            onKind={(kind) => onActionKind(action.id, kind)}
            onMove={(delta) => onMoveAction(action.id, delta)}
            onRemove={() => onRemoveAction(action.id)}
          />
        ))}
        <Button type="button" size="sm" disabled={stage.actions.length >= 50} onClick={onAddAction}>
          <Plus className="h-4 w-4" /> Add action
        </Button>
      </div>
    </div>
  );
}

interface ActionProps {
  action: JourneyAction;
  index: number;
  count: number;
  resources: JourneyResources | null;
  onChange: (patch: Partial<Omit<JourneyAction, 'id'>>) => void;
  onKind: (kind: JourneyActionKind) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}

function ActionRow({ action, index, count, resources, onChange, onKind, onMove, onRemove }: ActionProps) {
  const refKind = action.kind === 'product' || action.kind === 'article';
  const urlOk = !action.url || /^https:\/\/\S+$/.test(action.url.trim());
  return (
    <div className="rounded-lg border border-navy-100 bg-navy-50/30 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <select value={action.kind} onChange={(e) => onKind(e.target.value as JourneyActionKind)} className={`${INPUT} w-32`} aria-label="Action type">
              {ACTION_KINDS.map((k) => (
                <option key={k.kind} value={k.kind}>
                  {k.label}
                </option>
              ))}
            </select>
            <input value={action.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="What the member does" className={`${INPUT} min-w-[200px] flex-1`} />
          </div>
          {action.kind === 'product' && (
            <ProductPicker products={resources?.products ?? null} value={action.productId} onChange={(productId) => onChange({ productId })} />
          )}
          {action.kind === 'article' && (
            <ArticlePicker articles={resources?.articles ?? null} value={action.articleSlug} onChange={(articleSlug) => onChange({ articleSlug })} />
          )}
          {(action.kind === 'video' || action.kind === 'link') && (
            <div>
              <input
                value={action.url ?? ''}
                onChange={(e) => onChange({ url: e.target.value })}
                placeholder={action.kind === 'video' ? 'https://www.youtube.com/watch?v=…' : 'https://…'}
                className={INPUT}
              />
              {!urlOk && <p className="mt-1 text-[11px] text-red-500">The address must start with https://</p>}
            </div>
          )}
          <textarea
            value={action.instructions}
            onChange={(e) => onChange({ instructions: e.target.value })}
            rows={2}
            placeholder={action.kind === 'manual' ? 'What to do, step by step' : 'Why this step matters (optional)'}
            className={INPUT}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-600">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={action.optional} onChange={(e) => onChange({ optional: e.target.checked })} /> Optional
            </label>
            {refKind && (
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={action.whenUnavailable === 'hide'} onChange={(e) => onChange({ whenUnavailable: e.target.checked ? 'hide' : 'coming_soon' })} />
                Hide from members while not published (otherwise “Coming soon”)
              </label>
            )}
            {action.states && action.states.length > 0 && <span className="text-navy-400">Only for: {action.states.join(', ')}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col">
          <button type="button" className={ICON_BTN} disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move action up">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" className={ICON_BTN} disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Move action down">
            <ArrowDown className="h-4 w-4" />
          </button>
          <button type="button" className={`${ICON_BTN} hover:text-red-500`} onClick={onRemove} aria-label="Remove action">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
