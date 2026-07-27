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
  isFree: boolean;
  /** In cents — null when isFree is true. */
  priceCents: number | null;
  currency: string;
  /** No authoring UI for this yet — entered manually in builderTypes.ts once Commerce creates a real Stripe Price object. */
  stripePriceId?: string | null;
}

export interface PublishToPortalResult {
  ok: boolean;
  product?: {
    id: string;
    slug: string;
    status: string;
    version: number;
    coverImageUrl: string | null;
    isFree?: boolean;
    priceCents?: number | null;
    currency?: string;
  };
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
        isFree: input.isFree,
        priceCents: input.priceCents,
        currency: input.currency,
        stripePriceId: input.stripePriceId,
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

export interface ArchiveProductInput {
  /** The saved template's stable id — must have been published at least once; the Portal rejects archiving a product it has no record of. */
  studioProductId: string;
  publishedBy: string;
}

export interface ArchiveProductResult {
  ok: boolean;
  product?: { id: string; slug: string; status: string; version: number };
  error?: string;
}

/**
 * Unpublish — removes the Workspace from the public catalog and blocks new
 * purchases/trials, while preserving every existing customer's access,
 * license, review, and the full version history (see
 * portal.archive_product() in bgrowth-portal's
 * supabase/migrations/0015_asset_lifecycle.sql). Deliberately a separate
 * call from publishToPortal() — archiving only ever needs the product's id,
 * never its full content/pricing/trial payload.
 */
export async function archiveProduct(input: ArchiveProductInput): Promise<ArchiveProductResult> {
  try {
    const response = await fetch('/api/archive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studioProductId: input.studioProductId,
        publishedBy: input.publishedBy,
      }),
    });

    const json = (await response.json()) as ArchiveProductResult;
    if (!response.ok) {
      return { ok: false, error: json.error ?? `Archive failed (${response.status})` };
    }
    return json;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
