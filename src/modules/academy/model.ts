import type { CourseBlock, CourseBlockType, CourseContent, CourseDraft, CourseLesson, CourseModule, CourseRow } from './types';

// Pure helpers for a course: no network, no React. The rules here mirror the
// Portal's publishing schema (courseContent.schema.ts) and the server's
// checkCourse() — a course that passes here should pass there.

export const BLOCK_TYPES: { type: CourseBlockType; label: string; hint: string }[] = [
  { type: 'text', label: 'Text', hint: 'A paragraph. Line breaks are kept.' },
  { type: 'image', label: 'Image', hint: 'An address (https) with an optional caption.' },
  { type: 'video', label: 'Video', hint: 'YouTube, TikTok or Instagram. Nothing is hosted by us.' },
  { type: 'file', label: 'File', hint: 'A file from the File Library, by its address.' },
  { type: 'link', label: 'Link', hint: 'An outside page — a source, a form.' },
  { type: 'product', label: 'Product', hint: 'The Growth System, Journey or download this lesson hands over.' },
];

export const MAX_LESSON_MINUTES = 1440;

let seq = 0;
/** An id for a new module or lesson — stable, readable and unique enough. */
export function newId(prefix: 'm' | 'l'): string {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`;
}

export function emptyBlock(type: CourseBlockType): CourseBlock {
  switch (type) {
    case 'image':
      return { type: 'image', url: '' };
    case 'video':
      return { type: 'video', url: '' };
    case 'file':
      return { type: 'file', url: '' };
    case 'link':
      return { type: 'link', url: '' };
    case 'product':
      return { type: 'product', slug: '' };
    default:
      return { type: 'text', body: '' };
  }
}

export function emptyLesson(): CourseLesson {
  return { id: newId('l'), title: '', blocks: [] };
}

export function emptyModule(): CourseModule {
  return { id: newId('m'), title: '', lessons: [emptyLesson()] };
}

export function emptyCourse(): CourseContent {
  return { kind: 'course', version: 1, modules: [emptyModule()] };
}

export function emptyDraft(): CourseDraft {
  return {
    studioProductId: `course-${Date.now().toString(36)}`,
    status: 'draft',
    scheduledPublishAt: null,
    reviewedBy: null,
    approvedBy: null,
    slugEdited: false,
    slug: '',
    name: '',
    shortDescription: '',
    categorySlug: '',
    coverImageUrl: '',
    isFree: true,
    priceCents: null,
    currency: 'usd',
    content: emptyCourse(),
  };
}

export function toDraft(row: CourseRow): CourseDraft {
  return {
    productId: row.id,
    studioProductId: row.studio_product_id ?? `course-${Date.now().toString(36)}`,
    status: row.status ?? 'draft',
    scheduledPublishAt: row.scheduled_publish_at ?? null,
    reviewedBy: row.reviewed_by ?? null,
    approvedBy: row.approved_by ?? null,
    slugEdited: true,
    slug: row.slug ?? '',
    name: row.name ?? '',
    shortDescription: row.short_description ?? '',
    categorySlug: '',
    coverImageUrl: row.cover_image_url ?? '',
    isFree: row.is_free !== false,
    priceCents: row.price_cents ?? null,
    currency: row.currency ?? 'usd',
    content: row.content && Array.isArray(row.content.modules) ? row.content : emptyCourse(),
  };
}

/** The content as it is sent to the publishing endpoint — trimmed, no empties. */
export function toSavedContent(content: CourseContent): CourseContent {
  const outcomes = (content.outcomes ?? []).map((o) => o.trim()).filter(Boolean);
  return {
    kind: 'course',
    version: 1,
    ...(content.intro?.trim() ? { intro: content.intro.trim() } : {}),
    ...(outcomes.length ? { outcomes } : {}),
    modules: content.modules.map((module) => ({
      id: module.id,
      title: module.title.trim(),
      ...(module.summary?.trim() ? { summary: module.summary.trim() } : {}),
      lessons: module.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title.trim(),
        ...(lesson.minutes ? { minutes: lesson.minutes } : {}),
        blocks: lesson.blocks.map(cleanBlock).filter(Boolean) as CourseBlock[],
      })),
    })),
  };
}

function cleanBlock(block: CourseBlock): CourseBlock | null {
  switch (block.type) {
    case 'text':
      return block.body.trim() ? { type: 'text', body: block.body.trim() } : null;
    case 'image':
      return block.url.trim()
        ? { type: 'image', url: block.url.trim(), ...(block.alt?.trim() ? { alt: block.alt.trim() } : {}), ...(block.caption?.trim() ? { caption: block.caption.trim() } : {}) }
        : null;
    case 'video':
      return block.url.trim() ? { type: 'video', url: block.url.trim(), ...(block.title?.trim() ? { title: block.title.trim() } : {}) } : null;
    case 'file':
    case 'link':
      return block.url.trim()
        ? { type: block.type, url: block.url.trim(), ...(block.label?.trim() ? { label: block.label.trim() } : {}), ...(block.note?.trim() ? { note: block.note.trim() } : {}) }
        : null;
    case 'product':
      return block.slug.trim()
        ? { type: 'product', slug: block.slug.trim(), ...(block.label?.trim() ? { label: block.label.trim() } : {}), ...(block.note?.trim() ? { note: block.note.trim() } : {}) }
        : null;
    default:
      return null;
  }
}

export function allLessons(content: CourseContent): CourseLesson[] {
  return content.modules.flatMap((m) => m.lessons);
}

export function totalMinutes(content: CourseContent): number {
  return allLessons(content).reduce((sum, l) => sum + (l.minutes && l.minutes > 0 ? Math.min(l.minutes, MAX_LESSON_MINUTES) : 0), 0);
}

/** "25 min", "1 h 30 min", "2 h" — the same wording the Website uses. */
export function formatMinutes(total: number): string {
  if (total <= 0) return '';
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** An address from the course name, for a first save. */
export function slugFrom(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function move<T>(list: T[], from: number, by: number): T[] {
  const to = from + by;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Reads a course pasted as JSON. Accepts either the content on its own or a
 * whole draft, and repairs what it safely can (missing ids, missing blocks)
 * so a course written by hand or by an assistant still opens.
 */
export function parseCourseJson(text: string): { content: CourseContent; name?: string; shortDescription?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('This isn’t valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('This JSON isn’t a course.');
  const root = parsed as Record<string, unknown>;
  const raw = (root.content && typeof root.content === 'object' ? root.content : root) as Record<string, unknown>;
  const modules = Array.isArray(raw.modules) ? raw.modules : null;
  if (!modules?.length) throw new Error('This JSON has no module — a course needs “modules”.');

  const content: CourseContent = {
    kind: 'course',
    version: 1,
    ...(typeof raw.intro === 'string' ? { intro: raw.intro } : {}),
    ...(Array.isArray(raw.outcomes) ? { outcomes: raw.outcomes.filter((o): o is string => typeof o === 'string') } : {}),
    modules: modules.map((m) => {
      const module = (m ?? {}) as Record<string, unknown>;
      const lessons = Array.isArray(module.lessons) ? module.lessons : [];
      return {
        id: typeof module.id === 'string' && module.id ? module.id : newId('m'),
        title: typeof module.title === 'string' ? module.title : '',
        ...(typeof module.summary === 'string' ? { summary: module.summary } : {}),
        lessons: lessons.map((l) => {
          const lesson = (l ?? {}) as Record<string, unknown>;
          const blocks = Array.isArray(lesson.blocks) ? lesson.blocks : [];
          return {
            id: typeof lesson.id === 'string' && lesson.id ? lesson.id : newId('l'),
            title: typeof lesson.title === 'string' ? lesson.title : '',
            ...(Number.isInteger(lesson.minutes) ? { minutes: lesson.minutes as number } : {}),
            blocks: blocks.filter((b): b is CourseBlock => Boolean(b) && BLOCK_TYPES.some((t) => t.type === (b as CourseBlock).type)),
          };
        }),
      };
    }),
  };

  return {
    content,
    ...(typeof root.name === 'string' ? { name: root.name } : {}),
    ...(typeof root.shortDescription === 'string' ? { shortDescription: root.shortDescription } : {}),
  };
}
