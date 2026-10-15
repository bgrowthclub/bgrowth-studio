import type { ProductGallery } from '../../lib/productGallery';

/** One file of a Download — a File Library row (Portal migration 0049). */
export interface DownloadFile {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
}

export interface DownloadLink {
  label: string;
  url: string;
}

/** products.content for content_type 'pdf' (checked by the Portal's publish endpoint). */
export interface DownloadContent {
  kind: 'download';
  files: DownloadFile[];
  links: DownloadLink[];
  instructions: string;
}

/** Where an imported product came from (products.metadata.wix). */
export interface WixSource {
  id: string;
  file: string | null;
}

/** A Download product as Studio → Downloads lists it (drafts included). */
export interface DownloadProduct {
  id: string;
  studio_product_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  status: string;
  content: DownloadContent | null;
  metadata: {
    wix?: WixSource;
    longDescription?: string;
    included?: string[];
    /** Set by hand in the editor (else "included" is the file list). */
    includedCustom?: boolean;
    features?: { title: string; description?: string }[];
  } | null;
  is_free: boolean;
  price_cents: number | null;
  cover_image_url: string | null;
  category_slug: string | null;
  tags: string[];
  gallery: ProductGallery | null;
  last_published_at: string | null;
  created_at: string;
  /** Release flow (Portal migration 0051). */
  scheduled_publish_at?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
}

/** What the editor works on — a new Download or an existing one. */
export interface DownloadDraft {
  studioProductId: string;
  name: string;
  shortDescription: string;
  categorySlug: string;
  tags: string[];
  coverImageUrl: string;
  isFree: boolean;
  price: string;
  files: DownloadFile[];
  links: DownloadLink[];
  instructions: string;
  gallery: ProductGallery;
  /** Product page text (products.metadata — read by the site's product page). */
  longDescription: string;
  /** "What's included" — empty = list the files. */
  included: string[];
  benefits: string[];
  status: string | null;
  /** Set on products imported from the Wix store — kept when re-saved. */
  wix?: WixSource;
  /** The saved product (portal.products.id) — null until first saved. */
  productId?: string | null;
  scheduledPublishAt?: string | null;
  reviewedBy?: string | null;
  approvedBy?: string | null;
}
