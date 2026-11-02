import { apiFetch } from '../../lib/apiClient';
import { saveCourseDraft } from './api';
import { emptyDraft } from './model';
import type { CourseContent, CourseDraft } from './types';

// BGrowth Academy™ — bringing the Wix courses across (02/11/2026).
//
// The Studio drives the loop, one course per request: a course is ~10
// modules, ~30 lessons of up to 22,000 characters and ~10 quizzes, so
// reading all 72 in one call would time out and return megabytes. The
// server only reads and converts; saving goes through saveCourseDraft, the
// same door a hand-written course uses — there is no second way into the
// catalog.

export interface WixProgram {
  programId: string;
  name: string;
  wixStatus: string;
  sections: number | null;
  /** The course already here, if this program was imported before. */
  imported: { id: string; slug: string; status: string } | null;
}

export interface WixCourseCounts {
  modules: number;
  lessons: number;
  questions: number;
  /** Questions Wix has no answer for — kept, hidden from students. */
  pendingQuestions: number;
}

interface WixCourse {
  wixProgramId: string;
  wixStatus: string;
  name: string;
  slug: string;
  shortDescription: string;
  coverImageUrl: string;
  isFree: boolean;
  priceCents: number | null;
  currency: string;
  content: CourseContent;
  counts: WixCourseCounts;
}

export interface WixImportProgress {
  done: number;
  total: number;
  current: string;
  imported: { name: string; counts: WixCourseCounts }[];
  failed: { name: string; error: string }[];
}

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

/** Every course on the Wix site, and whether it is already here. */
export async function listWixPrograms(): Promise<WixProgram[]> {
  const { programs } = await parse<{ programs: WixProgram[] }>(
    await apiFetch('/api/access-management?resource=wix-courses'),
  );
  return programs;
}

async function readWixCourse(programId: string): Promise<WixCourse> {
  const { course } = await parse<{ course: WixCourse }>(
    await apiFetch('/api/access-management?resource=wix-courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId }),
    }),
  );
  return course;
}

function toDraftFrom(course: WixCourse): CourseDraft {
  return {
    ...emptyDraft(),
    // Stable across re-imports, so bringing a course again updates the same
    // product instead of creating a second one.
    studioProductId: `wix-course-${course.wixProgramId}`,
    slugEdited: true,
    slug: course.slug,
    name: course.name,
    shortDescription: course.shortDescription,
    coverImageUrl: course.coverImageUrl,
    isFree: course.isFree,
    priceCents: course.priceCents,
    currency: course.currency,
    content: course.content,
  };
}

/**
 * Brings the given programs across as drafts, one at a time, reporting after
 * each. A course that fails is recorded and the rest carry on — one bad
 * course must not stop the other 71.
 */
export async function importWixCourses(
  programs: WixProgram[],
  ownerEmail: string,
  onProgress: (p: WixImportProgress) => void,
): Promise<WixImportProgress> {
  const progress: WixImportProgress = {
    done: 0,
    total: programs.length,
    current: '',
    imported: [],
    failed: [],
  };

  for (const program of programs) {
    progress.current = program.name;
    onProgress({ ...progress });
    try {
      const course = await readWixCourse(program.programId);
      await saveCourseDraft(toDraftFrom(course), ownerEmail);
      progress.imported.push({ name: course.name, counts: course.counts });
    } catch (err) {
      progress.failed.push({
        name: program.name || program.programId,
        error: err instanceof Error ? err.message : 'Could not bring this course across.',
      });
    }
    progress.done += 1;
    onProgress({ ...progress });
  }

  progress.current = '';
  onProgress({ ...progress });
  return progress;
}
