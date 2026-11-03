import { questionKind } from './types';
import type { CertificateKind, CourseBlock, CourseBlockType, CourseContent, CourseDraft, CourseLesson, CourseModule, CourseQuestion, CourseQuestionKind, CourseQuizOption, CourseRow } from './types';

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
  { type: 'quiz', label: 'Quiz', hint: 'A self-check. The student sees the answer and why — it never blocks the lesson.' },
];

export const MAX_QUIZ_QUESTIONS = 30;
export const MAX_QUIZ_OPTIONS = 8;
export const MAX_TYPED_ANSWERS = 10;

// The certificate a course issues. 'achievement' means passing an assessment,
// which does not exist yet: it is offered disabled so nothing can issue one by
// accident, while the value already exists everywhere it will be needed.
export const CERTIFICATE_KINDS: { kind: CertificateKind; label: string; hint: string; available: boolean }[] = [
  { kind: 'completion', label: 'Completion', hint: 'The student went through the whole course.', available: true },
  { kind: 'participation', label: 'Participation', hint: 'For a workshop or a short experience with nothing to complete.', available: true },
  { kind: 'achievement', label: 'Achievement', hint: 'Needs a passing grade, which the quiz does not have yet.', available: false },
];

export const QUESTION_KINDS: { kind: CourseQuestionKind; label: string; hint: string }[] = [
  { kind: 'single', label: 'One right answer', hint: 'The student picks one option.' },
  { kind: 'multi', label: 'Several right answers', hint: 'Tick all that apply; right only as a whole set.' },
  { kind: 'typed', label: 'Typed answer', hint: 'The student writes it; case and spacing are ignored.' },
];

export const MAX_LESSON_MINUTES = 1440;

let seq = 0;
/** An id for a new module, lesson, question or option — unique enough. */
export function newId(prefix: 'm' | 'l' | 'q' | 'o'): string {
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
    case 'quiz':
      return { type: 'quiz', questions: [emptyQuestion()] };
    default:
      return { type: 'text', body: '' };
  }
}

/** A new question starts with two empty options and no right answer yet. */
export function emptyQuestion(kind: CourseQuestionKind = 'single'): CourseQuestion {
  const id = newId('q');
  if (kind === 'typed') return { id, kind: 'typed', prompt: '', accept: [''] };
  const options: CourseQuizOption[] = [{ id: newId('o'), text: '' }, { id: newId('o'), text: '' }];
  if (kind === 'multi') return { id, kind: 'multi', prompt: '', options, answers: [] };
  return { id, prompt: '', options, answer: '' };
}

/**
 * Changes a question's kind, keeping what still means the same: the prompt,
 * the explanation and the options. What cannot carry over (which option is
 * right, the typed answers) is dropped rather than guessed, so the editor
 * asks again instead of publishing a wrong key.
 */
export function switchQuestionKind(question: CourseQuestion, kind: CourseQuestionKind): CourseQuestion {
  if (questionKind(question) === kind) return question;
  const base = { id: question.id, prompt: question.prompt, ...(question.explanation ? { explanation: question.explanation } : {}) };
  const options: CourseQuizOption[] =
    'options' in question && question.options.length >= 2
      ? question.options
      : [{ id: newId('o'), text: '' }, { id: newId('o'), text: '' }];
  if (kind === 'typed') return { ...base, kind: 'typed', accept: [''] };
  if (kind === 'multi') return { ...base, kind: 'multi', options, answers: [] };
  return { ...base, options, answer: '' };
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
    ...(content.hours && content.hours > 0 ? { hours: Math.min(999, Math.round(content.hours)) } : {}),
    ...(content.certificate ? { certificate: content.certificate } : {}),
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
    case 'quiz': {
      // A half-written question is dropped rather than published: the schema
      // would reject the whole course for it, and a question with no right
      // answer can't teach anything. This is what lets a course imported
      // from Wix publish while its answer-less questions wait to be filled
      // in — they simply don't go out.
      const questions = (block.questions ?? []).map(cleanQuestion).filter(Boolean) as CourseQuestion[];
      if (!questions.length) return null;
      return { type: 'quiz', ...(block.title?.trim() ? { title: block.title.trim() } : {}), questions: questions.slice(0, MAX_QUIZ_QUESTIONS) };
    }
    default:
      return null;
  }
}

function cleanQuestion(q: CourseQuestion): CourseQuestion | null {
  const prompt = q.prompt.trim();
  if (!prompt) return null;
  const base = { id: q.id, prompt, ...(q.explanation?.trim() ? { explanation: q.explanation.trim() } : {}) };

  if (q.kind === 'typed') {
    // A typed question with no accepted answer is KEPT, not dropped: that is
    // how a course imported from Wix arrives (Wix stores no key for its
    // typed and numeric questions), and dropping it at save would lose the
    // question for good. The student never sees it — the reader skips a
    // question it cannot mark — and the check warns it is still pending.
    const accept = q.accept.map((a) => a.trim()).filter(Boolean).slice(0, MAX_TYPED_ANSWERS);
    return { ...base, kind: 'typed', accept };
  }

  const options = q.options.map((o) => ({ id: o.id, text: o.text.trim() })).filter((o) => o.text).slice(0, MAX_QUIZ_OPTIONS);
  if (options.length < 2) return null;

  if (q.kind === 'multi') {
    const answers = q.answers.filter((a, i) => options.some((o) => o.id === a) && q.answers.indexOf(a) === i);
    // Every option marked right teaches nothing and the schema refuses it.
    if (!answers.length || answers.length >= options.length) return null;
    return { ...base, kind: 'multi', options, answers };
  }

  return options.some((o) => o.id === q.answer) ? { ...base, options, answer: q.answer } : null;
}

/** Everything a question still needs before it can be published. */
export function questionGaps(q: CourseQuestion): string[] {
  const gaps: string[] = [];
  if (!q.prompt.trim()) gaps.push('no question written');
  if (q.kind === 'typed') {
    if (!q.accept.some((a) => a.trim())) gaps.push('no accepted answer yet');
    return gaps;
  }
  const options = q.options.filter((o) => o.text.trim());
  if (options.length < 2) gaps.push('needs at least two options');
  if (q.kind === 'multi') {
    const answers = q.answers.filter((a) => options.some((o) => o.id === a));
    if (!answers.length) gaps.push('no right answer ticked');
    else if (options.length && answers.length >= options.length) gaps.push('every option is marked right');
  } else if (options.length && !options.some((o) => o.id === q.answer)) {
    gaps.push('no right answer picked');
  }
  return gaps;
}

/**
 * How long a lesson takes, estimated from what is in it (02/11/2026). The
 * Wix courses carry no times, and filling ~2,200 lessons by hand was not an
 * option, so this gives a sensible starting number the author can correct.
 *
 * 200 words a minute is ordinary adult reading speed for this kind of text.
 * The rest are small, defensible allowances. A VIDEO counts as nothing: its
 * length is the one thing we genuinely cannot know from here, and guessing
 * it would make the total a fiction.
 *
 * THE SAME RULE IS COPIED in api/_lib/wixCourses.js, which stamps it during
 * the import (a function must not import from src/). Change both.
 */
export function estimateLessonMinutes(blocks: CourseBlock[]): number {
  let seconds = 0;
  for (const block of blocks ?? []) {
    if (block.type === 'text') {
      const words = block.body.trim().split(/\s+/).filter(Boolean).length;
      seconds += (words / 200) * 60;
    } else if (block.type === 'quiz') {
      seconds += (block.questions ?? []).length * 20;
    } else if (block.type === 'image') {
      seconds += 10;
    } else if (block.type === 'file' || block.type === 'link' || block.type === 'product') {
      seconds += 15;
    }
  }
  if (seconds <= 0) return 0;
  return Math.min(MAX_LESSON_MINUTES, Math.max(1, Math.round(seconds / 60)));
}

/**
 * Fills in the lessons that have no time yet, leaving every time already
 * typed alone — an estimate never overwrites a person's own number.
 */
export function estimateMissingTimes(content: CourseContent): { content: CourseContent; filled: number } {
  let filled = 0;
  const modules = content.modules.map((module) => ({
    ...module,
    lessons: module.lessons.map((lesson) => {
      if (lesson.minutes && lesson.minutes > 0) return lesson;
      const minutes = estimateLessonMinutes(lesson.blocks);
      if (!minutes) return lesson;
      filled += 1;
      return { ...lesson, minutes };
    }),
  }));
  return { content: { ...content, modules }, filled };
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

/**
 * Fills in what a hand-written or assistant-written quiz usually leaves out:
 * ids for the questions and options, and the right answer given as its text
 * or its position ("2", "b") instead of an option id.
 */
function repairBlock(block: CourseBlock): CourseBlock {
  if (block.type !== 'quiz') return block;
  const questions = (Array.isArray(block.questions) ? block.questions : []).map(repairQuestion);
  return { type: 'quiz', ...(typeof block.title === 'string' ? { title: block.title } : {}), questions };
}

function repairQuestion(raw: unknown): CourseQuestion {
  const q = (raw ?? {}) as Record<string, unknown>;
  const base = {
    id: typeof q.id === 'string' && q.id ? q.id : newId('q'),
    prompt: typeof q.prompt === 'string' ? q.prompt : '',
    ...(typeof q.explanation === 'string' ? { explanation: q.explanation } : {}),
  };

  const kindGiven = typeof q.kind === 'string' ? q.kind : '';
  const options: CourseQuizOption[] = (Array.isArray(q.options) ? q.options : []).map((o) => {
    const option = (typeof o === 'string' ? { text: o } : (o ?? {})) as Record<string, unknown>;
    return {
      id: typeof option.id === 'string' && option.id ? option.id : newId('o'),
      text: typeof option.text === 'string' ? option.text : '',
    };
  });

  if (kindGiven === 'typed' || (!options.length && Array.isArray(q.accept))) {
    const accept = (Array.isArray(q.accept) ? q.accept : [q.answer])
      .filter((a): a is string => typeof a === 'string' && Boolean(a.trim()));
    return { ...base, kind: 'typed', accept: accept.length ? accept : [''] };
  }

  if (kindGiven === 'multi' || Array.isArray(q.answers)) {
    const given = Array.isArray(q.answers) ? q.answers : [];
    const answers = given.map((a) => resolveOption(a, options)).filter((a): a is string => Boolean(a));
    return { ...base, kind: 'multi', options, answers };
  }

  return { ...base, options, answer: resolveOption(q.answer, options) ?? '' };
}

/**
 * The right answer as an option id. A quiz written by hand or by an
 * assistant usually gives it as the option's text or its position ("2",
 * "b"), so those are accepted too — anything else is left blank for the
 * person to pick, never guessed.
 */
function resolveOption(given: unknown, options: CourseQuizOption[]): string | null {
  if (typeof given === 'number') return options[given]?.id ?? options[given - 1]?.id ?? null;
  if (typeof given !== 'string' || !given.trim()) return null;
  if (options.some((o) => o.id === given)) return given;
  const byText = options.find((o) => o.text.trim().toLowerCase() === given.trim().toLowerCase());
  if (byText) return byText.id;
  const letter = given.trim().toLowerCase();
  if (letter.length === 1 && letter >= 'a' && letter <= 'h') return options[letter.charCodeAt(0) - 97]?.id ?? null;
  const n = Number(letter);
  if (Number.isInteger(n)) return options[n]?.id ?? options[n - 1]?.id ?? null;
  return null;
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
    ...(Number.isInteger(raw.hours) ? { hours: raw.hours as number } : {}),
    ...(raw.certificate === 'completion' || raw.certificate === 'achievement' || raw.certificate === 'participation'
      ? { certificate: raw.certificate }
      : {}),
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
            blocks: blocks
              .filter((b): b is CourseBlock => Boolean(b) && BLOCK_TYPES.some((t) => t.type === (b as CourseBlock).type))
              .map(repairBlock),
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
