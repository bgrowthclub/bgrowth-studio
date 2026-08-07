export type Platform = 'instagram' | 'facebook' | 'tiktok';
export type ContentType = 'caption' | 'carousel' | 'script' | 'hook_cta';
export type ContentItemStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published';
/** Phase 2E — a publication OCCURRENCE's own status, deliberately a
 * separate, smaller vocabulary from ContentItemStatus above: a content_item
 * describes its own authoring lifecycle (draft/review/approved/scheduled/
 * published), while a ContentPublication describes one publish/republish
 * EVENT (scheduled or published). Keeping these distinct avoids the
 * ambiguity of a published content_item that later gets a newly-scheduled
 * republish — the content_item's own status stays 'published', unaffected. */
export type PublicationStatus = 'scheduled' | 'published';
export type PublicationType = 'original' | 'republish';
/** campaigns.language is a plain, unconstrained text column — this union is
 * only the app-layer set of choices the New Campaign select currently
 * offers; adding a language later is a new union member + label, no schema
 * change (see api/_lib/contentEngine/promptBuilder.js's resolution logic). */
export type Language = 'en-US' | 'pt-BR' | 'es';
/** Phase 2D — the fixed set of variation types the Generate Variation picker
 * offers. Labels only: the actual prompt instruction text for each type is
 * authoritative server-side, in api/content-engine/generate.js's
 * VARIATION_TYPES — never duplicated here. */
export type VariationType = 'alternative_hook' | 'alternative_angle' | 'shorter' | 'more_educational' | 'more_direct' | 'alternative_cta';
/** Phase 2F-A — the MEDIA layer for a content_item, entirely separate from
 * ContentItemStatus/PublicationStatus above: this describes only the
 * generated-file lifecycle. Only 'image' is generatable in Phase 2F-A;
 * carousel/video are future asset types, added as new union members, never
 * a schema change (asset_type has no DB check constraint — see
 * 0027_content_engine_creative_assets.sql). */
export type AssetType = 'image';
export type AssetStatus = 'ready' | 'failed';

export interface BrandProfile {
  id: number;
  name: string;
  tagline: string | null;
  default_language: string;
  tone_voice: Record<string, unknown>;
  messaging_principles: string[];
  prohibited_styles: string[];
  preferred_cta_styles: string[];
  target_audience: Record<string, unknown>;
  social_content_rules: Record<string, unknown>;
  updated_at: string;
}

export interface ContentStrategy {
  id: string;
  key: string;
  name: string;
  description: string | null;
  prompt_guidance: string;
  is_active: boolean;
}

export interface Campaign {
  id: string;
  product_id: string;
  product_slug: string;
  strategy_id: string;
  name: string;
  goal: string | null;
  /** Who this specific campaign targets — distinct from BrandProfile.target_audience (BGrowth's broad audience across every campaign). */
  audience: string | null;
  /** Overrides BrandProfile.default_language for this campaign's generation when set; null falls back to the brand default. */
  language: string | null;
  /** Empty array means "no campaign-level channel restriction" (legacy campaigns, or missing pre-migration) — never "cannot generate." */
  channels: Platform[];
  utm_campaign: string;
  created_at: string;
  content_strategies?: Pick<ContentStrategy, 'id' | 'key' | 'name'>;
  content_items?: { id: string; status: ContentItemStatus }[];
}

export interface ContentItem {
  id: string;
  campaign_id: string;
  platform: Platform;
  content_type: ContentType;
  status: ContentItemStatus;
  body: Record<string, unknown>;
  scheduled_at: string | null;
  published_at: string | null;
  generated_by_provider: string | null;
  generated_by_model: string | null;
  created_at: string;
  updated_at: string;
  /** Phase 2D — set only on a variation, pointing at the content_item it's an alternate execution of. Null for every original/first-time generation. */
  parent_content_item_id: string | null;
  /** Phase 2D — the display label of the variation type used (e.g. "Alternative Hook"), set alongside parent_content_item_id. Null otherwise. */
  variation_label: string | null;
  campaigns?: { id: string; name: string; product_slug: string; utm_campaign: string };
}

/**
 * Phase 2E — one publish/republish EVENT for a content_item. Never a
 * content_item itself: no body, no editable fields, nothing an admin
 * authors here — it only records that this content was (or will be)
 * published, when, and as which kind of occurrence. content_items is
 * optionally nested (the GET endpoint joins it) purely for display —
 * platform/content_type/campaign context to render a Calendar card without
 * a second round-trip; never a substitute for fetching the real content
 * item if it needs to be opened/edited.
 */
export interface ContentPublication {
  id: string;
  content_item_id: string;
  publication_type: PublicationType;
  status: PublicationStatus;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  content_items?: {
    id: string;
    campaign_id: string;
    platform: Platform;
    content_type: ContentType;
    campaigns?: { id: string; name: string; product_slug: string; utm_campaign: string };
  };
}

/**
 * Phase 2F-A — one generated media file for a content_item. A content_item
 * may accumulate any number of these (multiple images, later carousel
 * slides/video) without ever being duplicated itself — generating a
 * creative never creates a new content_items row. storage_path is the
 * permanent identifier server-side; public_url is always derived from it
 * (see api/_lib/uploadCreativeAsset.js) and is what the UI actually reads.
 */
export interface CreativeAsset {
  id: string;
  content_item_id: string;
  asset_type: AssetType;
  status: AssetStatus;
  provider: string | null;
  model: string | null;
  storage_path: string | null;
  public_url: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  checksum: string | null;
  generation_prompt: string | null;
  generation_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Mirrors portal.catalog_index's public-read columns Content Engine actually
// needs — read directly from Supabase, never a duplicate catalog (see
// catalogProducts.ts).
export interface PublishedProductSummary {
  product_id: string;
  slug: string;
  name: string;
  short_description: string;
  cover_image_url: string | null;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  'en-US': 'English',
  'pt-BR': 'Portuguese',
  es: 'Spanish',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  caption: 'Caption',
  carousel: 'Carousel',
  script: 'Short Video Script',
  hook_cta: 'Hooks & CTAs',
};

export const STATUS_LABELS: Record<ContentItemStatus, string> = {
  draft: 'Draft',
  review: 'Review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
};

export const VARIATION_TYPE_LABELS: Record<VariationType, string> = {
  alternative_hook: 'Alternative Hook',
  alternative_angle: 'Alternative Angle',
  shorter: 'Shorter Version',
  more_educational: 'More Educational',
  more_direct: 'More Direct',
  alternative_cta: 'Alternative CTA',
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  image: 'Image',
};
