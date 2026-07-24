/**
 * Studio-side client for the BGrowth Publishing Engine. Calls Studio's own
 * /api/publish serverless proxy (never the Portal directly, and never with
 * the shared secret in browser code) — see api/publish.js.
 */
import type { ChecklistConfig } from '../engine/types';
import type { StudioTrialUnit } from '../modules/checklist-builder/builderTypes';

export type PublicationStatus = 'draft' | 'ready_for_review' | 'approved' | 'published' | 'archived';

export interface PublishToPortalInput {
  /** The saved template's stable id (draft.templateId) — must exist; publish a template only after it's been saved at least once. */
  studioProductId: string;
  config: ChecklistConfig;
  slug: string;
  shortDescription: string;
  categorySlug?: string;
  status: PublicationStatus;
  publishedBy: string;
  changeNotes?: string;
  coverImage?: { base64: string; mimeType: string; fileExtension: string } | { url: string };
  isTrialEligible: boolean;
  /** null when isTrialEligible is false — no duration to configure. */
  trialDuration: number | null;
  trialUnit: StudioTrialUnit;
}

export interface PublishToPortalResult {
  ok: boolean;
  product?: { id: string; slug: string; status: string; version: number; coverImageUrl: string | null };
  error?: string;
  issues?: unknown;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugifyProductName(name: string): string {
  return slugify(name);
}

export async function publishToPortal(input: PublishToPortalInput): Promise<PublishToPortalResult> {
  try {
    const response = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studioProductId: input.studioProductId,
        slug: input.slug,
        name: input.config.brand.name,
        shortDescription: input.shortDescription,
        contentType: 'workspace',
        categorySlug: input.categorySlug ? slugify(input.categorySlug) : undefined,
        content: input.config,
        status: input.status,
        destinationKey: 'portal',
        publishedBy: input.publishedBy,
        changeNotes: input.changeNotes,
        coverImage: input.coverImage,
        isTrialEligible: input.isTrialEligible,
        trialDuration: input.trialDuration,
        trialUnit: input.trialUnit,
      }),
    });

    const json = (await response.json()) as PublishToPortalResult;
    if (!response.ok) {
      return { ok: false, error: json.error ?? `Publish failed (${response.status})`, issues: json.issues };
    }
    return json;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
