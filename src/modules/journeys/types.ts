/**
 * Journeys (Portal migration 0068) — guided paths to a goal, shown only on
 * the BGrowth Website. Each Journey is its own portal.products row
 * (content_type 'journey'); this is the shape of its `content`, checked by
 * the Portal's publishing endpoint (src/schemas/journeyContent.schema.ts
 * there) and by Studio's server (api/_lib/journeys.js).
 */

export type JourneyActionKind = 'product' | 'article' | 'video' | 'link' | 'manual';

/** A referenced resource as members will see it (same rule as the database). */
export type ResourceState = 'available' | 'coming_soon' | 'unavailable';

/** Where a stage sits: getting started, good practices, or growing. */
export type JourneyStageLevel = 'beginner' | 'best_practices' | 'expansion';

export interface JourneyAction {
  id: string;
  title: string;
  instructions: string;
  optional: boolean;
  /** Estimated time in whole minutes (1–1440); the Website adds them up. */
  estimatedMinutes?: number;
  kind: JourneyActionKind;
  productId?: string;
  articleSlug?: string;
  url?: string;
  /** Only for these states (shown once they are in validatedStates). Kept as saved. */
  states?: string[];
  /** While the resource isn't published: "Coming soon", or hidden (internal steps). */
  whenUnavailable: 'coming_soon' | 'hide';
}

export interface JourneyStage {
  id: string;
  title: string;
  summary: string;
  level?: JourneyStageLevel;
  actions: JourneyAction[];
}

export interface JourneyContent {
  kind: 'journey';
  version: 1;
  goal: string;
  intro: string;
  completionMessage: string;
  notice: string;
  /** Who the Journey is for. */
  audience: string;
  /** What the member should have at the end (at most 10). */
  outcomes: string[];
  validatedStates: string[];
  stages: JourneyStage[];
}

/** A Journey as Studio → Journeys lists it (drafts included). */
export interface JourneyListItem {
  id: string;
  studio_product_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  status: string;
  is_free: boolean;
  cover_image_url: string | null;
  category_id: string | null;
  last_published_at: string | null;
  created_at: string;
  scheduled_publish_at?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  stageCount: number;
  actionCount: number;
}

/** One Journey with its content (GET ?resource=journeys&id=). */
export interface JourneyRow extends Omit<JourneyListItem, 'stageCount' | 'actionCount'> {
  content: Partial<JourneyContent> | null;
}

export interface JourneyIssue {
  path: string;
  message: string;
}

/** The server's check: errors block review/approval/publishing; warnings don't. */
export interface JourneyCheck {
  ready: boolean;
  errors: JourneyIssue[];
  warnings: JourneyIssue[];
  resolved: { stageId: string; actionId: string; kind: string; state: ResourceState }[];
}

export interface ResourceProduct {
  id: string;
  name: string;
  slug: string;
  content_type: string;
  status: string;
  is_free: boolean;
  price_cents: number | null;
  state: ResourceState;
}

export interface ResourceArticle {
  slug: string;
  title: string;
  status: string;
  language: string | null;
  access: string;
  visibility: string;
  state: ResourceState;
}

export interface JourneyResources {
  products: ResourceProduct[];
  articles: ResourceArticle[];
}

/** What the editor works on — a new Journey or an existing one. */
export interface JourneyDraft {
  studioProductId: string;
  /** portal.products.id — null until first saved. */
  productId: string | null;
  name: string;
  slug: string;
  /** false while the slug still follows the name. */
  slugEdited: boolean;
  shortDescription: string;
  categorySlug: string;
  /** The saved category (portal id) until the category list has loaded. */
  categoryId: string | null;
  coverImageUrl: string;
  content: JourneyContent;
  status: string | null;
  scheduledPublishAt: string | null;
  reviewedBy: string | null;
  approvedBy: string | null;
}
