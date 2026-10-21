import { apiFetch } from '../../lib/apiClient';
import { toSavedContent } from './model';
import type { JourneyCheck, JourneyDraft, JourneyListItem, JourneyResources, JourneyRow } from './types';

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

/** Every Journey, drafts included (Studio server, ?resource=journeys). */
export async function listJourneys(): Promise<JourneyListItem[]> {
  const { journeys } = await parse<{ journeys: JourneyListItem[] }>(await apiFetch('/api/access-management?resource=journeys'));
  return journeys;
}

/** One Journey with the server's review check. */
export async function getJourney(id: string): Promise<{ journey: JourneyRow; check: JourneyCheck }> {
  return parse(await apiFetch(`/api/access-management?resource=journeys&id=${encodeURIComponent(id)}`));
}

/** The products and articles an action can point to, with their real status. */
export async function listJourneyResources(): Promise<JourneyResources> {
  return parse(await apiFetch('/api/access-management?resource=journeys&resources=1'));
}

/**
 * Saves the Journey as a DRAFT through the publishing endpoint (the only
 * status it accepts for a Journey). Review, approval and publishing are the
 * release steps (ReleasePanel), which run the full check first. A Journey is
 * always free and has no trial.
 */
export async function saveJourneyDraft(draft: JourneyDraft, publishedBy: string) {
  const response = await apiFetch('/api/publishing-engine?action=publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studioProductId: draft.studioProductId,
      slug: draft.slug,
      name: draft.name.trim(),
      shortDescription: draft.shortDescription.trim(),
      contentType: 'journey',
      categorySlug: draft.categorySlug || undefined,
      content: toSavedContent(draft.content),
      metadata: {},
      status: 'draft',
      destinationKey: 'portal',
      publishedBy,
      coverImage: draft.coverImageUrl ? { url: draft.coverImageUrl } : undefined,
      isTrialEligible: false,
      trialDuration: null,
      trialUnit: 'days',
      isFree: true,
      priceCents: null,
      currency: 'usd',
    }),
  });
  return parse<{ ok: boolean; product?: { id: string; slug: string; status: string } }>(response);
}
