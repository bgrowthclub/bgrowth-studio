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

/** A Download product as Studio → Downloads lists it (drafts included). */
export interface DownloadProduct {
  id: string;
  studio_product_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  status: string;
  content: DownloadContent | null;
  is_free: boolean;
  price_cents: number | null;
  cover_image_url: string | null;
  category_slug: string | null;
  tags: string[];
  gallery: ProductGallery | null;
  last_published_at: string | null;
  updated_at: string;
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
  status: string | null;
}
