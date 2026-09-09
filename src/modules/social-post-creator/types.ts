export type PostObjective =
  | 'sell_product'
  | 'present_product'
  | 'product_story'
  | 'educational'
  | 'engagement'
  | 'launch'
  | 'behind_the_scenes'
  | 'other';

export const POST_OBJECTIVE_LABELS: Record<PostObjective, string> = {
  sell_product: 'Sell a Product',
  present_product: 'Present a Product',
  product_story: 'Product Story',
  educational: 'Educational',
  engagement: 'Engagement',
  launch: 'Launch',
  behind_the_scenes: 'Behind the Scenes',
  other: 'Other',
};

export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'linkedin';

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

/** The language all AI-generated user-facing text is written in — a generation-language setting, not a translation system (see promptBuilder.js). */
export type ContentLanguage = 'en' | 'pt-BR' | 'es' | 'fr' | 'it' | 'de';

export const DEFAULT_CONTENT_LANGUAGE: ContentLanguage = 'en';

export const CONTENT_LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
};

export type SlideRole =
  | 'cover'
  | 'product_detail'
  | 'context_lifestyle'
  | 'feature'
  | 'benefit'
  | 'story'
  | 'proof'
  | 'closing_cta';

export const SLIDE_ROLE_LABELS: Record<SlideRole, string> = {
  cover: 'Cover / Primary',
  product_detail: 'Product / Detail',
  context_lifestyle: 'Context / Lifestyle',
  feature: 'Feature',
  benefit: 'Benefit',
  story: 'Story',
  proof: 'Proof',
  closing_cta: 'Closing / CTA',
};

/** A photo the user uploaded, held only in browser memory for this session. */
export interface UploadedPhoto {
  _key: string;
  name: string;
  /** Full data: URL (data:image/jpeg;base64,...) from compressImage() — used directly as <img src> and as the payload sent for analysis. */
  dataUrl: string;
  sizeKB: number;
}

export interface PhotoAnalysisEntry {
  index: number;
  description: string;
  tags: string[];
}

export interface PhotoAnalysis {
  overallDescription: string;
  productOrService: string;
  visualCharacteristics: string[];
  colors: string[];
  environment: string;
  relevantDetails: string[];
  possibleUseContext: string;
  photos: PhotoAnalysisEntry[];
}

/** One carousel slide. photoIndex refers to `analyzedPhotos[photoIndex]` (the photo set as it was at analysis time), never the live, possibly-since-reordered `photos` array. */
export interface CarouselSlide {
  _key: string;
  photoIndex: number;
  role: SlideRole;
  /** Whether this slide currently shows text — user-controlled; seeded from whether the AI suggested any, never forced. */
  hasText: boolean;
  /** Editable text content — seeded from the AI's suggestedText (or empty if none was suggested). */
  text: string;
}

export type CopyTarget = 'all' | 'phrase' | 'caption' | 'cta';

export interface GeneratedCopy {
  phrase: string;
  caption: string;
  cta: string;
}

export interface HashtagGroups {
  niche: string[];
  product: string[];
  audience: string[];
  location: string[];
  brand: string[];
}

export const HASHTAG_GROUP_LABELS: Record<keyof HashtagGroups, string> = {
  niche: 'Niche',
  product: 'Product / Service',
  audience: 'Audience',
  location: 'Location',
  brand: 'Brand',
};

export type WizardStep = 'photos' | 'objective' | 'carousel' | 'copy' | 'hashtags' | 'preview';

export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'photos', label: 'Photos' },
  { id: 'objective', label: 'Objective & Platform' },
  { id: 'carousel', label: 'Carousel' },
  { id: 'copy', label: 'Copy' },
  { id: 'hashtags', label: 'Hashtags' },
  { id: 'preview', label: 'Preview & Export' },
];

export type PreviewTab = 'carousel' | 'caption' | 'hashtags' | 'cta';
