import type { JourneyAction, JourneyActionKind, JourneyContent, JourneyDraft, JourneyRow, JourneyStage, JourneyStageLevel } from './types';

/**
 * The Journey editor's pure helpers (no React, no network) — ids, empty
 * Journeys, list edits, what may be saved as a draft, and the content sent
 * to the publishing endpoint. Nothing here knows about a particular Journey:
 * every name, slug, stage and action comes from the editor.
 */

export const DEFAULT_NOTICE =
  'This Journey shares general information. It does not replace the laws, rules or official requirements that apply where you live — always confirm them with the official source.';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ACTION_KINDS: { kind: JourneyActionKind; label: string }[] = [
  { kind: 'manual', label: 'Task' },
  { kind: 'product', label: 'Product' },
  { kind: 'article', label: 'Article' },
  { kind: 'video', label: 'Video' },
  { kind: 'link', label: 'Link' },
];

export const STAGE_LEVELS: { level: JourneyStageLevel; label: string }[] = [
  { level: 'beginner', label: 'Getting started' },
  { level: 'best_practices', label: 'Good practices' },
  { level: 'expansion', label: 'Growing' },
];

export const MAX_OUTCOMES = 10;
export const MAX_ACTION_MINUTES = 1440;

/** A typed-in minutes value → whole minutes, or undefined when empty/invalid. */
export function readMinutes(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.min(Math.round(n), MAX_ACTION_MINUTES);
}

/** The Journey's total estimated minutes (every action with a time). */
export function totalMinutes(content: JourneyContent): number {
  return content.stages.reduce((sum, s) => sum + stageMinutes(s), 0);
}

export function stageMinutes(stage: JourneyStage): number {
  return stage.actions.reduce((sum, a) => sum + (a.estimatedMinutes ?? 0), 0);
}

/** "45 min", "2 h", "3 h 20 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const LEVELS = STAGE_LEVELS.map((l) => l.level);
const isLevel = (v: unknown): v is JourneyStageLevel => LEVELS.includes(v as JourneyStageLevel);

/** Lower case, no accents, words joined by "-" (same rule as product slugs). */
export function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** A short id not used yet in this Journey ("s-1a2b3c4d" / "a-…"). */
export function newId(prefix: 's' | 'a', taken: Set<string>): string {
  for (;;) {
    const id = `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
    if (!taken.has(id)) return id;
  }
}

export function idsIn(content: JourneyContent): Set<string> {
  return new Set(content.stages.flatMap((s) => [s.id, ...s.actions.map((a) => a.id)]));
}

export function emptyContent(): JourneyContent {
  return {
    kind: 'journey',
    version: 1,
    goal: '',
    intro: '',
    completionMessage: '',
    notice: DEFAULT_NOTICE,
    audience: '',
    outcomes: [],
    validatedStates: [],
    stages: [],
  };
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Reads saved content defensively (older or partial drafts still open). */
export function readContent(raw: Partial<JourneyContent> | null | undefined): JourneyContent {
  const base = emptyContent();
  if (!raw || typeof raw !== 'object') return base;
  const stages = Array.isArray(raw.stages) ? raw.stages : [];
  return {
    ...base,
    goal: str(raw.goal),
    intro: str(raw.intro),
    completionMessage: str(raw.completionMessage),
    notice: typeof raw.notice === 'string' ? raw.notice : base.notice,
    audience: str(raw.audience),
    outcomes: Array.isArray(raw.outcomes) ? raw.outcomes.filter((o): o is string => typeof o === 'string') : [],
    validatedStates: Array.isArray(raw.validatedStates) ? raw.validatedStates.map(String) : [],
    stages: stages.map((s) => ({
      id: str(s?.id),
      title: str(s?.title),
      summary: str(s?.summary),
      ...(isLevel(s?.level) ? { level: s.level } : {}),
      actions: (Array.isArray(s?.actions) ? s.actions : []).map((a) => ({
        id: str(a?.id),
        title: str(a?.title),
        instructions: str(a?.instructions),
        optional: a?.optional === true,
        ...(readMinutes(a?.estimatedMinutes) ? { estimatedMinutes: readMinutes(a?.estimatedMinutes) } : {}),
        kind: (['product', 'article', 'video', 'link', 'manual'] as const).includes(a?.kind) ? a.kind : 'manual',
        ...(a?.productId ? { productId: String(a.productId) } : {}),
        ...(a?.articleSlug ? { articleSlug: String(a.articleSlug) } : {}),
        ...(a?.url ? { url: String(a.url) } : {}),
        ...(Array.isArray(a?.states) && a.states.length ? { states: a.states.map(String) } : {}),
        whenUnavailable: a?.whenUnavailable === 'hide' ? 'hide' : 'coming_soon',
      })),
    })),
  };
}

export function toDraft(row: JourneyRow | null): JourneyDraft {
  return {
    studioProductId: row?.studio_product_id ?? crypto.randomUUID(),
    productId: row?.id ?? null,
    name: row?.name ?? '',
    slug: row?.slug ?? '',
    slugEdited: Boolean(row),
    shortDescription: row?.short_description ?? '',
    categorySlug: '',
    categoryId: row?.category_id ?? null,
    coverImageUrl: row?.cover_image_url ?? '',
    content: readContent(row?.content),
    status: row?.status ?? null,
    scheduledPublishAt: row?.scheduled_publish_at ?? null,
    reviewedBy: row?.reviewed_by ?? null,
    approvedBy: row?.approved_by ?? null,
  };
}

// --- list edits (all return a new content) ---------------------------------

export function move<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

export function addStage(content: JourneyContent): JourneyContent {
  const stage: JourneyStage = { id: newId('s', idsIn(content)), title: '', summary: '', actions: [] };
  return { ...content, stages: [...content.stages, stage] };
}

export function updateStage(content: JourneyContent, stageId: string, patch: Partial<Omit<JourneyStage, 'id' | 'actions'>>): JourneyContent {
  return { ...content, stages: content.stages.map((s) => (s.id === stageId ? withoutUndefined({ ...s, ...patch }) : s)) };
}

/** A patch with `level: undefined` / `estimatedMinutes: undefined` clears the field. */
function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

// --- expected outcomes -------------------------------------------------------

export function addOutcome(content: JourneyContent): JourneyContent {
  if (content.outcomes.length >= MAX_OUTCOMES) return content;
  return { ...content, outcomes: [...content.outcomes, ''] };
}

export function updateOutcome(content: JourneyContent, index: number, text: string): JourneyContent {
  return { ...content, outcomes: content.outcomes.map((o, i) => (i === index ? text : o)) };
}

export function removeOutcome(content: JourneyContent, index: number): JourneyContent {
  return { ...content, outcomes: content.outcomes.filter((_, i) => i !== index) };
}

export function moveOutcome(content: JourneyContent, index: number, delta: -1 | 1): JourneyContent {
  return { ...content, outcomes: move(content.outcomes, index, delta) };
}

export function removeStage(content: JourneyContent, stageId: string): JourneyContent {
  return { ...content, stages: content.stages.filter((s) => s.id !== stageId) };
}

export function moveStage(content: JourneyContent, stageId: string, delta: -1 | 1): JourneyContent {
  return { ...content, stages: move(content.stages, content.stages.findIndex((s) => s.id === stageId), delta) };
}

export function addAction(content: JourneyContent, stageId: string, kind: JourneyActionKind = 'manual'): JourneyContent {
  const action: JourneyAction = { id: newId('a', idsIn(content)), title: '', instructions: '', optional: false, kind, whenUnavailable: 'coming_soon' };
  return { ...content, stages: content.stages.map((s) => (s.id === stageId ? { ...s, actions: [...s.actions, action] } : s)) };
}

export function updateAction(content: JourneyContent, stageId: string, actionId: string, patch: Partial<Omit<JourneyAction, 'id'>>): JourneyContent {
  return {
    ...content,
    stages: content.stages.map((s) =>
      s.id === stageId ? { ...s, actions: s.actions.map((a) => (a.id === actionId ? withoutUndefined({ ...a, ...patch }) : a)) } : s,
    ),
  };
}

/** Changing what an action is clears the other kinds' reference. */
export function setActionKind(content: JourneyContent, stageId: string, actionId: string, kind: JourneyActionKind): JourneyContent {
  return {
    ...content,
    stages: content.stages.map((s) =>
      s.id !== stageId
        ? s
        : {
            ...s,
            actions: s.actions.map((a) => {
              if (a.id !== actionId) return a;
              const { productId: _p, articleSlug: _s, url: _u, ...rest } = a;
              void _p;
              void _s;
              void _u;
              return { ...rest, kind };
            }),
          },
    ),
  };
}

export function removeAction(content: JourneyContent, stageId: string, actionId: string): JourneyContent {
  return { ...content, stages: content.stages.map((s) => (s.id === stageId ? { ...s, actions: s.actions.filter((a) => a.id !== actionId) } : s)) };
}

export function moveAction(content: JourneyContent, stageId: string, actionId: string, delta: -1 | 1): JourneyContent {
  return {
    ...content,
    stages: content.stages.map((s) => (s.id === stageId ? { ...s, actions: move(s.actions, s.actions.findIndex((a) => a.id === actionId), delta) } : s)),
  };
}

// --- saving ------------------------------------------------------------------

function isHttpsUrl(value: string) {
  if (!value.startsWith('https://') || value.length > 2000) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * What stops even a DRAFT from being saved (the publishing endpoint would
 * refuse it). An unfinished Journey is fine — only wrong values block.
 */
export function draftProblems(draft: JourneyDraft): string[] {
  const out: string[] = [];
  if (!draft.name.trim()) out.push('Give the Journey a name.');
  if (!draft.shortDescription.trim()) out.push('Write a short description.');
  if (!SLUG_RE.test(draft.slug)) out.push('The address (slug) can only have lower-case letters, numbers and dashes.');
  const c = draft.content;
  if (c.goal.trim().length > 300) out.push('The goal is longer than 300 characters.');
  if (c.notice.trim().length > 1000) out.push('The notice is longer than 1,000 characters.');
  if (c.intro.length > 4000) out.push('The introduction is longer than 4,000 characters.');
  if (c.completionMessage.length > 2000) out.push('The completion message is longer than 2,000 characters.');
  if (c.audience.trim().length > 500) out.push('"Who it is for" is longer than 500 characters.');
  if (c.outcomes.length > MAX_OUTCOMES) out.push(`At most ${MAX_OUTCOMES} expected outcomes.`);
  c.outcomes.forEach((o, i) => {
    if (o.trim().length > 200) out.push(`Expected outcome ${i + 1} is longer than 200 characters.`);
  });
  if (c.stages.length > 12) out.push('A Journey has at most 12 stages.');
  c.stages.forEach((s, i) => {
    const stageName = s.title.trim() || `Stage ${i + 1}`;
    if (!ID_RE.test(s.id)) out.push(`${stageName}: invalid id.`);
    if (s.title.trim().length > 120) out.push(`${stageName}: the title is longer than 120 characters.`);
    if (s.summary.length > 1000) out.push(`${stageName}: the summary is longer than 1,000 characters.`);
    if (s.actions.length > 50) out.push(`${stageName}: at most 50 actions.`);
    s.actions.forEach((a, j) => {
      const label = `${stageName} → ${a.title.trim() || `action ${j + 1}`}`;
      if (!ID_RE.test(a.id)) out.push(`${label}: invalid id.`);
      if (a.title.trim().length > 160) out.push(`${label}: the title is longer than 160 characters.`);
      if (a.instructions.length > 4000) out.push(`${label}: the instructions are longer than 4,000 characters.`);
      if (a.estimatedMinutes !== undefined && (!Number.isInteger(a.estimatedMinutes) || a.estimatedMinutes < 1 || a.estimatedMinutes > MAX_ACTION_MINUTES)) {
        out.push(`${label}: the time must be between 1 and ${MAX_ACTION_MINUTES} minutes.`);
      }
      const url = (a.url ?? '').trim();
      if ((a.kind === 'video' || a.kind === 'link') && url && !isHttpsUrl(url)) out.push(`${label}: the address must start with https:// (or leave it empty for now).`);
      if (a.kind === 'product' && a.productId && !UUID_RE.test(a.productId)) out.push(`${label}: choose the product again.`);
    });
  });
  return out;
}

/** The content sent to the publishing endpoint: trimmed, only the fields each kind uses. */
export function toSavedContent(content: JourneyContent): JourneyContent {
  return {
    kind: 'journey',
    version: 1,
    goal: content.goal.trim(),
    intro: content.intro,
    completionMessage: content.completionMessage,
    notice: content.notice.trim(),
    audience: content.audience.trim(),
    // Empty lines are dropped (an unfinished one is not an outcome).
    outcomes: content.outcomes.map((o) => o.trim()).filter(Boolean),
    validatedStates: content.validatedStates,
    stages: content.stages.map((s) => ({
      id: s.id,
      title: s.title.trim(),
      summary: s.summary,
      ...(s.level ? { level: s.level } : {}),
      actions: s.actions.map((a) => {
        const url = (a.url ?? '').trim();
        const slug = (a.articleSlug ?? '').trim();
        return {
          id: a.id,
          title: a.title.trim(),
          instructions: a.instructions,
          optional: a.optional,
          ...(a.estimatedMinutes ? { estimatedMinutes: a.estimatedMinutes } : {}),
          kind: a.kind,
          ...(a.kind === 'product' && a.productId ? { productId: a.productId } : {}),
          ...(a.kind === 'article' && slug ? { articleSlug: slug } : {}),
          ...((a.kind === 'video' || a.kind === 'link') && url ? { url } : {}),
          ...(a.states?.length ? { states: a.states } : {}),
          whenUnavailable: a.whenUnavailable,
        };
      }),
    })),
  };
}
