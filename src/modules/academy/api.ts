import { apiFetch } from '../../lib/apiClient';
import { toSavedContent } from './model';
import type { CourseCheck, CourseDraft, CourseListItem, CourseRow } from './types';

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // The publishing endpoint lists what's wrong as zod issues.
    const issues = Array.isArray(data.issues)
      ? data.issues
          .slice(0, 3)
          .map((i: { path?: (string | number)[]; message?: string }) => `${(i.path ?? []).join('.')}: ${i.message ?? ''}`)
          .join(' · ')
      : '';
    throw new Error([data.error || `Request failed (${response.status})`, issues].filter(Boolean).join(' — '));
  }
  return data as T;
}

/** Every course, drafts included (Studio server, ?resource=courses). */
export async function listCourses(): Promise<CourseListItem[]> {
  const { courses } = await parse<{ courses: CourseListItem[] }>(await apiFetch('/api/access-management?resource=courses'));
  return courses;
}

/** One course with the server's review check. */
export async function getCourse(id: string): Promise<{ course: CourseRow; check: CourseCheck }> {
  return parse(await apiFetch(`/api/access-management?resource=courses&id=${encodeURIComponent(id)}`));
}

/**
 * Saves the course as a DRAFT through the publishing endpoint. Review,
 * approval and publishing are the release steps (ReleasePanel), which run
 * the full check first — the same path every other product takes.
 */
export async function saveCourseDraft(draft: CourseDraft, publishedBy: string) {
  const response = await apiFetch('/api/publishing-engine?action=publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studioProductId: draft.studioProductId,
      slug: draft.slug,
      name: draft.name.trim(),
      shortDescription: draft.shortDescription.trim(),
      contentType: 'course',
      categorySlug: draft.categorySlug || undefined,
      content: toSavedContent(draft.content),
      metadata: {},
      status: 'draft',
      destinationKey: 'portal',
      publishedBy,
      coverImage: draft.coverImageUrl ? { url: draft.coverImageUrl } : undefined,
      // A course has no trial: a member buys it or it is free.
      isTrialEligible: false,
      trialDuration: null,
      trialUnit: 'days',
      isFree: draft.isFree,
      priceCents: draft.isFree ? null : draft.priceCents,
      currency: draft.currency || 'usd',
    }),
  });
  return parse<{ ok: boolean; product?: { id: string; slug: string; status: string } }>(response);
}
