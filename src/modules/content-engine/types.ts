export type Platform = 'instagram' | 'facebook' | 'tiktok';
export type ContentType = 'caption' | 'carousel' | 'script' | 'hook_cta';
export type ContentItemStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published';

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
  campaigns?: { id: string; name: string; product_slug: string; utm_campaign: string };
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
