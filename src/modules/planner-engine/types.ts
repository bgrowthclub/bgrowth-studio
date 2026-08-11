/**
 * BGrowth Planner Engine™ — Complete Type System
 */

// -----------------------------------------------------------------------
// Block types
// -----------------------------------------------------------------------
export type BlockType =
  | 'calendar'
  | 'checklist'
  | 'notes'
  | 'goals'
  | 'progress'
  | 'worksheet'
  | 'milestones'
  | 'timeline'
  | 'image'
  | 'resources'
  | 'form_fields';

// -----------------------------------------------------------------------
// Block configs (how each block is configured in the builder)
// -----------------------------------------------------------------------
export interface CalendarBlockConfig {
  type: 'calendar';
  view: 'monthly' | 'weekly';
  showWeekNumbers: boolean;
}

export interface ChecklistBlockConfig {
  type: 'checklist';
  items: { id: string; label: string; required: boolean }[];
  allowAddItems: boolean;
}

export interface NotesBlockConfig {
  type: 'notes';
  placeholder: string;
  maxLength: number;
  lineRuled: boolean;
}

export interface GoalsBlockConfig {
  type: 'goals';
  goals: { id: string; label: string; placeholder: string }[];
  showProgress: boolean;
  showDeadline: boolean;
}

export interface ProgressBlockConfig {
  type: 'progress';
  habits: { id: string; label: string; color: string }[];
  trackingPeriod: 'daily' | 'weekly';
  days: number;
}

export interface WorksheetBlockConfig {
  type: 'worksheet';
  questions: { id: string; question: string; type: 'text' | 'textarea' | 'number'; placeholder?: string }[];
}

export interface MilestonesBlockConfig {
  type: 'milestones';
  milestones: { id: string; label: string; placeholder: string }[];
  showDate: boolean;
  showStatus: boolean;
}

export interface TimelineBlockConfig {
  type: 'timeline';
  events: { id: string; label: string; placeholder: string }[];
  orientation: 'vertical' | 'horizontal';
}

export interface ImageBlockConfig {
  type: 'image';
  prompt: string;
  allowUpload: boolean;
  caption: string;
  preImage?: any;
  preCaption?: string;
}

export interface ResourcesBlockConfig {
  type: 'resources';
  resources: { id: string; label: string; url?: string }[];
  allowAddItems: boolean;
}

export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'time'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'title'
  | 'static_text';

export interface FormFieldsBlockConfig {
  type: 'form_fields';
  fields: {
    id: string;
    label: string;
    type: FormFieldType;
    placeholder?: string;
    required: boolean;
    options?: string[]; // for select type
  }[];
  sectionTitle?: string;
  description?: string;
  icon?: string;
  whyItMatters?: string;
  tip?: string;
  optional?: boolean;
}

export type BlockConfig =
  | CalendarBlockConfig
  | ChecklistBlockConfig
  | NotesBlockConfig
  | GoalsBlockConfig
  | ProgressBlockConfig
  | WorksheetBlockConfig
  | MilestonesBlockConfig
  | TimelineBlockConfig
  | ImageBlockConfig
  | ResourcesBlockConfig
  | FormFieldsBlockConfig;

// -----------------------------------------------------------------------
// Planner block (one configurable unit inside a section)
// -----------------------------------------------------------------------
export interface PlannerBlock {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  config: BlockConfig;
}

// -----------------------------------------------------------------------
// Planner section — Phase 1: formalizes the section concept the Builder
// already used locally (PlannerBuilder.tsx's own PlannerSection interface,
// bolted onto saved data via an `as any` cast) into the canonical type
// system. This is now the ONE section shape every consumer — Builder,
// Preview, Fill — reads and writes.
// -----------------------------------------------------------------------
export interface PlannerSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  collapsed: boolean;
  blocks: PlannerBlock[];
  /**
   * Phase 2 (BGrowth Planner Builder™ — Visual Canvas) forward-compat
   * only. Optional and unused in Phase 1 — every section renders in
   * normal vertical document flow regardless of whether this is set.
   * Never read or written until the free-position canvas is activated.
   */
  layout?: SectionLayout;
}

export interface SectionLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Canvas stacking order only — never affects `sections[]` array order,
   * which stays the single source of truth for Fill's step order and the
   * PDF's section order. Missing = stack by array index. */
  z?: number;
  /** Canvas-only: disables drag/resize for this section in the Builder. */
  locked?: boolean;
}

// -----------------------------------------------------------------------
// Planner settings
// -----------------------------------------------------------------------
export type PageSize = 'A4' | 'Letter' | 'A5';
export type PageOrientation = 'portrait' | 'landscape';
export type PlannerDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type PlannerLanguage = 'English' | 'Portuguese' | 'Spanish';
export type PlannerCategory =
  | 'Business' | 'Personal' | 'Health & Fitness' | 'Finance'
  | 'Education' | 'Creative' | 'Productivity' | 'Lifestyle' | 'Other';

/**
 * Controls what the customer is allowed to use on the public Fill route —
 * a creator-facing publishing decision, not a data model. 'choose' shows
 * the mode-select screen on first visit and remembers the pick per
 * planner (see MODE_PREFERENCE_STORAGE_KEY below); 'visual'/'guided' lock
 * the customer into that one experience with no switcher shown. Visual
 * and Guided always read/write the exact same PlannerFillData — this
 * setting only decides which renderer(s) the customer can reach, never a
 * second copy of their data.
 */
export type CustomerExperience = 'visual' | 'guided' | 'choose';

export interface PlannerSettings {
  name: string;
  description: string;
  coverImage: string | null;
  icon: string;
  primaryColor: string;
  accentColor: string;
  category: PlannerCategory;
  difficulty: PlannerDifficulty;
  language: PlannerLanguage;
  author: string;
  tags: string[];
  estimatedDuration: string;
  pageSize: PageSize;
  pageOrientation: PageOrientation;
  exportPdf: boolean;
  exportPrint: boolean;
  allowShare: boolean;
  version: string;
  /** Optional — legacy planners (templates authored before this setting
   * existed, hand-edited JSON imports) may not have it. Every read site
   * treats a missing value as 'choose' (see loadPlannerFillMode /
   * PlannerFill's mode resolution), never as an error. */
  customerExperience?: CustomerExperience;
}

// -----------------------------------------------------------------------
// Full planner config
// -----------------------------------------------------------------------
export interface PlannerConfig {
  id: string;
  settings: PlannerSettings;
  /** Canonical content structure — Builder, Preview, and Fill all read this. */
  sections: PlannerSection[];
  isTemplate?: boolean;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
  publishStatus: 'draft' | 'published';
  uses: number;
}

/**
 * The shape planner templates (configs/*.ts) were authored in before
 * Phase 1 — flat blocks[], no sections. Kept as its own distinct, typed
 * shape (not deleted, not silently `any`-coerced) so it's explicit which
 * files still use the legacy structure. normalizePlanner() accepts this
 * shape (among others) and always produces a canonical PlannerConfig.
 * Do not add new fields here — extend PlannerConfig, and normalize
 * legacy data through normalizePlanner() instead.
 */
export interface LegacyFlatPlannerConfig extends Omit<PlannerConfig, 'sections'> {
  blocks: PlannerBlock[];
}

// -----------------------------------------------------------------------
// Fill data (what the user fills in)
// -----------------------------------------------------------------------
export type BlockFillData = Record<string, unknown>;
export type PlannerFillData = Record<string, BlockFillData>;

// -----------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------
export const BLOCK_TYPE_INFO: Record<BlockType, { label: string; icon: string; description: string; color: string }> = {
  calendar: { label: 'Calendar', icon: '📅', description: 'Track dates and events', color: '#1061EC' },
  checklist: { label: 'Checklist', icon: '✅', description: 'Tasks and to-dos', color: '#059669' },
  notes: { label: 'Notes', icon: '📝', description: 'Free-form writing space', color: '#7C3AED' },
  goals: { label: 'Goals', icon: '🎯', description: 'Set and track goals', color: '#DC2626' },
  progress: { label: 'Progress Tracker', icon: '📊', description: 'Habit and progress tracking', color: '#D97706' },
  worksheet: { label: 'Worksheet', icon: '📄', description: 'Questions and exercises', color: '#0EA5A0' },
  milestones: { label: 'Milestones', icon: '📌', description: 'Key achievement markers', color: '#7C3AED' },
  timeline: { label: 'Timeline', icon: '⏰', description: 'Visual timeline of events', color: '#475569' },
  image: { label: 'Image', icon: '📷', description: 'Vision board or inspiration', color: '#E11D48' },
  resources: { label: 'Resources', icon: '📎', description: 'Links and references', color: '#CA8A04' },
  form_fields: { label: 'Form Fields', icon: '📋', description: 'Custom form with various field types', color: '#1061EC' },
};

export const PLANNER_CATEGORIES: PlannerCategory[] = [
  'Business', 'Personal', 'Health & Fitness', 'Finance',
  'Education', 'Creative', 'Productivity', 'Lifestyle', 'Other',
];

export const THEME_COLORS = [
  '#1061EC', '#7C3AED', '#059669', '#DC2626',
  '#D97706', '#0EA5A0', '#475569', '#E11D48',
  '#CA8A04', '#16A34A', '#1E3A5F', '#9333EA',
];

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
export function newId(): string {
  return `id-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultSettings(): PlannerSettings {
  return {
    name: '',
    description: '',
    coverImage: null,
    icon: '📋',
    primaryColor: '#1061EC',
    accentColor: '#0B1D3A',
    category: 'Business',
    difficulty: 'Beginner',
    language: 'English',
    author: '',
    tags: [],
    estimatedDuration: '30 minutes/day',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    exportPdf: true,
    exportPrint: true,
    allowShare: true,
    version: '1.0',
    customerExperience: 'choose',
  };
}

export function defaultBlock(type: BlockType): PlannerBlock {
  const info = BLOCK_TYPE_INFO[type];
  const configs: Record<BlockType, BlockConfig> = {
    calendar: { type: 'calendar', view: 'monthly', showWeekNumbers: false },
    checklist: { type: 'checklist', items: [{ id: newId(), label: 'Task 1', required: false }], allowAddItems: true },
    notes: { type: 'notes', placeholder: 'Write your thoughts here...', maxLength: 2000, lineRuled: true },
    goals: { type: 'goals', goals: [{ id: newId(), label: 'Goal 1', placeholder: 'Describe your goal...' }], showProgress: true, showDeadline: true },
    progress: { type: 'progress', habits: [{ id: newId(), label: 'Habit 1', color: '#1061EC' }], trackingPeriod: 'daily', days: 30 },
    worksheet: { type: 'worksheet', questions: [{ id: newId(), question: 'Question 1', type: 'textarea', placeholder: 'Your answer...' }] },
    milestones: { type: 'milestones', milestones: [{ id: newId(), label: 'Milestone 1', placeholder: 'Describe this milestone...' }], showDate: true, showStatus: true },
    timeline: { type: 'timeline', events: [{ id: newId(), label: 'Event 1', placeholder: 'Describe this event...' }], orientation: 'vertical' },
    image: { type: 'image', prompt: 'Upload your vision board or inspiration image', allowUpload: true, caption: '', preImage: null, preCaption: '' },
    resources: { type: 'resources', resources: [{ id: newId(), label: 'Resource 1', url: '' }], allowAddItems: true },
    form_fields: { type: 'form_fields', sectionTitle: 'Section 1', description: '', icon: '📋', whyItMatters: '', tip: '', optional: false, fields: [
      { id: newId(), label: 'Full Name', type: 'text', placeholder: 'Enter your name', required: true },
      { id: newId(), label: 'Email', type: 'email', placeholder: 'your@email.com', required: true },
    ]},
  };

  return {
    id: newId(),
    title: info.label,
    description: info.description,
    icon: info.icon,
    color: info.color,
    enabled: true,
    config: configs[type],
  };
}

export function emptyPlanner(): PlannerConfig {
  return {
    id: newId(),
    settings: defaultSettings(),
    sections: [],
    publishStatus: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    uses: 0,
  };
}

export function newSection(title = 'New Section'): PlannerSection {
  return { id: newId(), title, description: '', icon: '📋', collapsed: false, blocks: [] };
}

// -----------------------------------------------------------------------
// Canvas layout defaults — Planner Builder™ Visual Canvas.
//
// Any section entering the canvas without a `layout` (a legacy template,
// a flat-blocks import, a hand-edited JSON import) needs one real
// position, not a null-checked special case sprinkled through the canvas
// renderer. This is the one place that position is invented — a simple
// left-to-right, top-to-bottom grid keyed off the section's index — so
// the canvas, Fill's step order (which stays driven by `sections[]`
// array order, untouched by this), and the PDF never need a second
// "what if layout is missing" branch.
// -----------------------------------------------------------------------
export const DEFAULT_SECTION_WIDTH = 360;
export const DEFAULT_SECTION_HEIGHT = 280;
const CANVAS_GRID_COLS = 3;
const CANVAS_GRID_GAP = 32;
const CANVAS_GRID_PADDING = 40;

export function computeDefaultSectionLayout(index: number): SectionLayout {
  const col = index % CANVAS_GRID_COLS;
  const row = Math.floor(index / CANVAS_GRID_COLS);
  return {
    x: CANVAS_GRID_PADDING + col * (DEFAULT_SECTION_WIDTH + CANVAS_GRID_GAP),
    y: CANVAS_GRID_PADDING + row * (DEFAULT_SECTION_HEIGHT + CANVAS_GRID_GAP),
    w: DEFAULT_SECTION_WIDTH,
    h: DEFAULT_SECTION_HEIGHT,
  };
}

/**
 * The ONE fallback for "this section has no layout yet" — used by the
 * Builder canvas, customer-facing Visual Mode, and the PDF's positioned
 * rendering alike, so a legacy/imported section without `layout` always
 * resolves to the exact same computed position everywhere it's read,
 * never three drifting inline fallbacks.
 */
export function getEffectiveSectionLayout(section: PlannerSection, index: number): SectionLayout {
  return section.layout ?? computeDefaultSectionLayout(index);
}

/**
 * Bounding box of the full canvas composition — the one shared computation
 * behind "how wide/tall does the positioned canvas need to be," used by
 * both customer-facing Visual Mode and the PDF's positioned rendering, so
 * neither can compute a different content size than the other.
 */
export function computeCanvasBounds(sections: PlannerSection[]): { width: number; height: number } {
  let maxX = 800;
  let maxY = 400;
  sections.forEach((section, idx) => {
    const layout = getEffectiveSectionLayout(section, idx);
    maxX = Math.max(maxX, layout.x + layout.w);
    maxY = Math.max(maxY, layout.y + layout.h);
  });
  return { width: maxX, height: maxY };
}

// -----------------------------------------------------------------------
// Duplication — the ONE place a section or block is cloned, so "never
// duplicate IDs" (§6) is guaranteed by construction rather than by every
// call site remembering to call newId() correctly.
// -----------------------------------------------------------------------
export function cloneBlockWithNewIds(block: PlannerBlock): PlannerBlock {
  return { ...block, id: newId(), title: `${block.title} (Copy)` };
}

export function cloneSectionWithNewIds(section: PlannerSection): PlannerSection {
  return {
    ...section,
    id: newId(),
    title: `${section.title} (Copy)`,
    blocks: section.blocks.map(b => ({ ...b, id: newId() })),
    // Nudge the copy so it doesn't land exactly on top of the original on
    // the canvas — purely cosmetic, never affects Fill/PDF section order.
    layout: section.layout ? { ...section.layout, x: section.layout.x + 24, y: section.layout.y + 24 } : undefined,
  };
}

// -----------------------------------------------------------------------
// Normalization — Phase 1 compatibility layer.
//
// A planner arriving from any existing source (localStorage, GAS sync,
// JSON import, or the four starter templates) may currently be shaped as:
//   1. Already canonical: { sections: PlannerSection[], ... }
//   2. The Builder's own unofficial bolt-on: { blocks: [], sections: [...] }
//      (blocks was the flattened copy kept for old readers; sections was
//      attached via an `as any` cast, never part of PlannerConfig's real
//      type) — sections here is the real, intended content and must win.
//   3. Legacy flat: { blocks: PlannerBlock[] } — pre-Section-concept data,
//      migrated into one default section, exactly as
//      PlannerBuilder.tsx's own (now removed) local migrateToSections()
//      used to do, so existing single-section planners look identical
//      after normalization.
// Called at every boundary where a planner enters the app, so every
// PlannerConfig flowing through Builder/Preview/Fill is already
// normalized — no consumer needs its own compatibility logic.
// -----------------------------------------------------------------------
export function normalizePlanner(raw: unknown): PlannerConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;

  const sections: PlannerSection[] =
    Array.isArray(r.sections) && r.sections.length > 0
      ? r.sections.map(normalizeSection)
      : Array.isArray(r.blocks) && r.blocks.length > 0
        ? [{ id: newId(), title: 'Main Content', description: '', icon: '📋', collapsed: false, blocks: r.blocks }]
        : [];

  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    settings: { ...defaultSettings(), ...(r.settings && typeof r.settings === 'object' ? r.settings : {}) },
    sections,
    isTemplate: typeof r.isTemplate === 'boolean' ? r.isTemplate : undefined,
    templateName: typeof r.templateName === 'string' ? r.templateName : undefined,
    createdAt: typeof r.createdAt === 'string' && r.createdAt ? r.createdAt : new Date().toISOString(),
    updatedAt: typeof r.updatedAt === 'string' && r.updatedAt ? r.updatedAt : new Date().toISOString(),
    publishStatus: r.publishStatus === 'published' ? 'published' : 'draft',
    uses: typeof r.uses === 'number' ? r.uses : 0,
  };
}

function normalizeSection(raw: unknown): PlannerSection {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const section: PlannerSection = {
    id: typeof r.id === 'string' && r.id ? r.id : newId(),
    title: typeof r.title === 'string' ? r.title : '',
    description: typeof r.description === 'string' ? r.description : '',
    icon: typeof r.icon === 'string' ? r.icon : '📋',
    collapsed: !!r.collapsed,
    blocks: Array.isArray(r.blocks) ? r.blocks : [],
  };
  if (r.layout && typeof r.layout === 'object'
    && typeof r.layout.x === 'number' && typeof r.layout.y === 'number'
    && typeof r.layout.w === 'number' && typeof r.layout.h === 'number') {
    section.layout = { x: r.layout.x, y: r.layout.y, w: r.layout.w, h: r.layout.h };
    if (typeof r.layout.z === 'number') section.layout.z = r.layout.z;
    if (typeof r.layout.locked === 'boolean') section.layout.locked = r.layout.locked;
  }
  return section;
}

// -----------------------------------------------------------------------
// Per-block-type shape check — backs validatePlanner's "no malformed
// block configuration" gate. Deliberately shallow (array-field presence,
// not deep per-item validation): the Builder's own editors always
// produce well-formed configs, this exists to catch a corrupted or
// hand-edited JSON import before it reaches Fill/PDF.
// -----------------------------------------------------------------------
function blockConfigIssue(block: PlannerBlock): string | null {
  const c = block.config as unknown as Record<string, unknown> | undefined;
  if (!c) return 'missing configuration';
  switch (c.type) {
    case 'checklist': return Array.isArray(c.items) ? null : 'missing items list';
    case 'goals': return Array.isArray(c.goals) ? null : 'missing goals list';
    case 'progress': return Array.isArray(c.habits) ? null : 'missing habits list';
    case 'worksheet': return Array.isArray(c.questions) ? null : 'missing questions list';
    case 'milestones': return Array.isArray(c.milestones) ? null : 'missing milestones list';
    case 'timeline': return Array.isArray(c.events) ? null : 'missing events list';
    case 'resources': return Array.isArray(c.resources) ? null : 'missing resources list';
    case 'form_fields': return Array.isArray(c.fields) ? null : 'missing fields list';
    default: return null;
  }
}

// -----------------------------------------------------------------------
// Validation — a small, reliable pre-publish gate. Never blocks Save
// Draft, only the transition to publishStatus: 'published' — an
// incomplete planner must always be saveable as a draft.
// -----------------------------------------------------------------------
export function validatePlanner(planner: PlannerConfig): string[] {
  const errors: string[] = [];

  if (!planner.settings.name || !planner.settings.name.trim()) {
    errors.push('Planner needs a title before publishing.');
  }

  if (planner.sections.length === 0) {
    errors.push('Planner needs at least one section before publishing.');
  }

  const sectionIds = new Set<string>();
  const blockIds = new Set<string>();
  const validBlockTypes = new Set(Object.keys(BLOCK_TYPE_INFO));

  for (const section of planner.sections) {
    if (!section.id) {
      errors.push('A section is missing a valid ID.');
    } else if (sectionIds.has(section.id)) {
      errors.push(`Duplicate section ID: "${section.id}".`);
    } else {
      sectionIds.add(section.id);
    }

    if (section.layout) {
      const { w, h } = section.layout;
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        errors.push(`Section "${section.title || 'Untitled Section'}" has invalid canvas dimensions.`);
      }
    }

    for (const block of section.blocks) {
      if (!block.id) {
        errors.push(`A block in "${section.title || 'Untitled Section'}" is missing a valid ID.`);
        continue;
      }
      if (blockIds.has(block.id)) {
        errors.push(`Duplicate block ID: "${block.id}".`);
      } else {
        blockIds.add(block.id);
      }
      if (!validBlockTypes.has(block.config?.type)) {
        errors.push(`Block "${block.title || block.id}" has an unrecognized type: "${block.config?.type}".`);
        continue;
      }
      const issue = blockConfigIssue(block);
      if (issue) {
        errors.push(`Block "${block.title || block.id}" has malformed configuration: ${issue}.`);
      }
    }
  }

  return errors;
}

// -----------------------------------------------------------------------
// Customer fill-mode preference — deliberately its OWN localStorage key,
// separate from PlannerFillData (`bgrowth.planner.fill.<id>`). This is a
// UI preference ("which screen do I land on"), never planner content —
// mixing it into fillData would risk it being read/written as if it were
// customer-entered data. Only meaningful when
// settings.customerExperience === 'choose'; ignored otherwise.
// -----------------------------------------------------------------------
export function getPlannerFillModeKey(plannerId: string): string {
  return `bgrowth.planner.fill.mode.${plannerId}`;
}

export function loadPlannerFillMode(plannerId: string): 'visual' | 'guided' | null {
  try {
    const raw = localStorage.getItem(getPlannerFillModeKey(plannerId));
    return raw === 'visual' || raw === 'guided' ? raw : null;
  } catch { return null; }
}

export function savePlannerFillMode(plannerId: string, mode: 'visual' | 'guided'): void {
  try { localStorage.setItem(getPlannerFillModeKey(plannerId), mode); } catch { /* ignore */ }
}

// Storage
const STORAGE_KEY = 'bgrowth.planners';

export function loadPlanners(): PlannerConfig[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.map(normalizePlanner) : [];
  } catch { return []; }
}

export function savePlanners(planners: PlannerConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planners));
  } catch (e) {
    // If storage quota exceeded, save without cover images
    try {
      const stripped = planners.map(p => ({
        ...p,
        settings: { ...p.settings, coverImage: null }
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
      console.warn('Cover images stripped due to storage limits');
    } catch { /* ignore */ }
  }
}
