/**
 * Social Post Creator's own content vocabulary — deliberately separate
 * from api/_lib/contentEngine/contentSpecs.js. Same *pattern* (label +
 * platform/objective notes + JSON schema string), different module, no
 * shared import — Content Engine's file is never touched or read by this
 * one.
 */

export const PLATFORM_LABELS = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

// Platform shapes tone/length/hashtag-density guidance injected into the
// prompt text — never the JSON output schema itself, so adding a platform
// later is a data change here, not a new schema anywhere.
export const PLATFORM_NOTES = {
  instagram:
    'Visual-first, concise, warm and approachable tone. Short paragraphs with line breaks; emoji used sparingly, never in every sentence. Hashtag strategy favors a mix of broad and niche tags, typically 8-15.',
  tiktok:
    'Casual, energetic, conversational tone written the way people actually talk out loud. Short, punchy sentences. Hashtag strategy favors fewer, highly-relevant tags, typically 3-6.',
  facebook:
    'Slightly longer-form, community and conversation-oriented tone — can ask a direct question to invite comments. Hashtags matter less here than the copy itself; typically 2-5 relevant tags.',
  linkedin:
    'Professional but human tone — no hype, minimal emoji. Frame around business value, expertise, or a concrete lesson. Hashtag strategy favors 3-5 professional/industry tags.',
};

export const POST_OBJECTIVE_LABELS = {
  sell_product: 'Sell a Product',
  present_product: 'Present a Product',
  product_story: 'Product Story',
  educational: 'Educational',
  engagement: 'Engagement',
  launch: 'Launch',
  behind_the_scenes: 'Behind the Scenes',
  other: 'Other',
};

export const SLIDE_ROLE_LABELS = {
  cover: 'Cover / Primary image',
  product_detail: 'Product / Detail',
  context_lifestyle: 'Context / Lifestyle',
  feature: 'Feature',
  benefit: 'Benefit',
  story: 'Story',
  proof: 'Proof',
  closing_cta: 'Closing / CTA',
};

export const ANALYSIS_SCHEMA =
  '{ "overallDescription": string, "productOrService": string, "visualCharacteristics": string[], "colors": string[], "environment": string, "relevantDetails": string[], "possibleUseContext": string, "photos": [{ "index": number, "description": string, "tags": string[] }] }';

export const CAROUSEL_SCHEMA =
  '{ "slides": [{ "photoIndex": number, "role": string, "suggestedText": string | null }] }';

export const HASHTAGS_SCHEMA =
  '{ "niche": string[], "product": string[], "audience": string[], "location": string[], "brand": string[] }';

export function copySchemaFor(target) {
  if (target === 'phrase') return '{ "phrase": string }';
  if (target === 'caption') return '{ "caption": string }';
  if (target === 'cta') return '{ "cta": string }';
  return '{ "phrase": string, "caption": string, "cta": string }';
}
