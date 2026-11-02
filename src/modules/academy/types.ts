// BGrowth Academy™ — a course, as the Studio edits it.
//
// A course is a portal.products row with content_type 'course', so it is a
// product like any other: price, bundles, plans, coupons, reviews and the
// release flow all come for free. Its modules and lessons live in `content`.
//
// This shape mirrors the Portal's publishing schema
// (bgrowth-portal/src/schemas/courseContent.schema.ts) and the Website's
// reader (src/modules/academy/types.ts) — the three must stay in step.

export type CourseBlock =
  | { type: 'text'; body: string }
  | { type: 'image'; url: string; alt?: string; caption?: string }
  | { type: 'video'; url: string; title?: string }
  | { type: 'file'; url: string; label?: string; note?: string }
  | { type: 'link'; url: string; label?: string; note?: string }
  | { type: 'product'; slug: string; label?: string; note?: string }
  /**
   * A self-check inside a lesson (02/11/2026). Never a gate: the student
   * answers, is told at once whether they got it right and why, and the
   * next lesson is open either way — no passing grade, no limit on tries.
   */
  | { type: 'quiz'; title?: string; questions: CourseQuestion[] };

export interface CourseQuestionBase {
  /** Stable: the student's answer is saved against it. */
  id: string;
  prompt: string;
  /** Shown after answering, right or wrong. */
  explanation?: string;
}

export interface CourseQuizOption {
  id: string;
  text: string;
}

export type CourseQuestionKind = 'single' | 'multi' | 'typed';

/**
 * The three kinds of question (multi and typed added 02/11/2026, when the
 * Wix courses turned out to be only about half single-choice). `kind` is
 * absent on a single-choice question, so quizzes written before the others
 * existed stay valid.
 */
export type CourseQuestion =
  | (CourseQuestionBase & { kind?: 'single'; options: CourseQuizOption[]; answer: string })
  | (CourseQuestionBase & { kind: 'multi'; options: CourseQuizOption[]; answers: string[] })
  /** A typed answer; `accept` holds every wording counted as right. */
  | (CourseQuestionBase & { kind: 'typed'; accept: string[] });

export function questionKind(question: CourseQuestion): CourseQuestionKind {
  return question.kind ?? 'single';
}

export type CourseBlockType = CourseBlock['type'];

export interface CourseLesson {
  id: string;
  title: string;
  /** 1–1440; the Website adds them up per module and course. */
  minutes?: number;
  blocks: CourseBlock[];
}

export interface CourseModule {
  id: string;
  title: string;
  summary?: string;
  lessons: CourseLesson[];
}

export interface CourseContent {
  kind: 'course';
  version: 1;
  intro?: string;
  outcomes?: string[];
  modules: CourseModule[];
}

/** A course being edited, before it is sent to the publishing endpoint. */
export interface CourseDraft {
  /** The portal.products row, once it exists. */
  productId?: string;
  studioProductId: string;
  /** Release flow (Portal migration 0051), as the ReleasePanel reads it. */
  status: string;
  scheduledPublishAt: string | null;
  reviewedBy: string | null;
  approvedBy: string | null;
  /** The address is made from the name until someone types one. */
  slugEdited: boolean;
  slug: string;
  name: string;
  shortDescription: string;
  categorySlug: string;
  coverImageUrl: string;
  isFree: boolean;
  priceCents: number | null;
  currency: string;
  content: CourseContent;
}

/** One line of the Academy list. */
export interface CourseListItem {
  id: string;
  studio_product_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  status: string;
  is_free: boolean;
  price_cents: number | null;
  currency: string | null;
  cover_image_url: string | null;
  category_id: string | null;
  last_published_at: string | null;
  created_at: string;
  scheduled_publish_at?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  moduleCount: number;
  lessonCount: number;
  minutes: number;
}

/** One course as the server returns it. */
export interface CourseRow extends Omit<CourseListItem, 'moduleCount' | 'lessonCount' | 'minutes'> {
  content: CourseContent | null;
  metadata?: Record<string, unknown> | null;
}

/** What the server says is still missing before a course can be released. */
export interface CourseCheck {
  ok: boolean;
  problems: string[];
  warnings: string[];
  moduleCount: number;
  lessonCount: number;
  minutes: number;
}
