import { CONTENT_SPECS, PLATFORM_LABELS } from './contentSpecs.js';

/**
 * Composes one generation prompt from four independent inputs: the
 * centralized Brand Profile (so no individual prompt has to redefine
 * BGrowth's voice), the selected Content Strategy's guidance, the campaign's
 * own Goal, and the product being promoted. This is the one place those
 * come together — api/content-engine/generate.js never builds prompt text
 * itself, it only gathers the rows and calls this.
 *
 * Strategy and Goal are deliberately kept as separate sections: Strategy is
 * HOW the message is framed (a fixed, reusable narrative approach from
 * content_strategies); Goal is WHAT this specific campaign is trying to
 * achieve (free text on campaigns.goal, optional — plenty of campaigns have
 * none). Never merge them into one section.
 */
export function buildGenerationPrompt({ brandProfile, strategy, product, platform, contentType, goal }) {
  const spec = CONTENT_SPECS[contentType];
  if (!spec) {
    throw new Error(`Unknown content type "${contentType}".`);
  }

  const platformLabel = PLATFORM_LABELS[platform] ?? platform;

  const brandLines = [
    `Brand: ${brandProfile.name}${brandProfile.tagline ? ` — "${brandProfile.tagline}"` : ''}`,
    `Write in: ${brandProfile.default_language}`,
    brandProfile.tone_voice && Object.keys(brandProfile.tone_voice).length
      ? `Tone/voice rules: ${JSON.stringify(brandProfile.tone_voice)}`
      : null,
    Array.isArray(brandProfile.messaging_principles) && brandProfile.messaging_principles.length
      ? `Messaging principles: ${brandProfile.messaging_principles.join('; ')}`
      : null,
    Array.isArray(brandProfile.prohibited_styles) && brandProfile.prohibited_styles.length
      ? `Never do this: ${brandProfile.prohibited_styles.join('; ')}`
      : null,
    Array.isArray(brandProfile.preferred_cta_styles) && brandProfile.preferred_cta_styles.length
      ? `Preferred CTA styles: ${brandProfile.preferred_cta_styles.join('; ')}`
      : null,
    brandProfile.target_audience && Object.keys(brandProfile.target_audience).length
      ? `Target audience: ${JSON.stringify(brandProfile.target_audience)}`
      : null,
    brandProfile.social_content_rules && Object.keys(brandProfile.social_content_rules).length
      ? `Social content rules: ${JSON.stringify(brandProfile.social_content_rules)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const trimmedGoal = typeof goal === 'string' ? goal.trim() : '';

  const productLines = [
    `Product name: ${product.name}`,
    `Product summary: ${product.short_description}`,
    product.tags?.length ? `Tags: ${product.tags.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    'You are the social media copywriter for BGrowth, an operating system for personal and professional growth.',
    '--- BRAND RULES (always apply) ---',
    brandLines,
    '--- CONTENT STRATEGY: ' + strategy.name + ' ---',
    strategy.prompt_guidance,
    trimmedGoal ? `--- CAMPAIGN GOAL ---\n\n${trimmedGoal}` : null,
    '--- PRODUCT TO PROMOTE ---',
    productLines,
    '--- TASK ---',
    `Platform: ${platformLabel}`,
    spec.instruction,
    'Return ONLY valid JSON matching exactly this shape, no commentary:',
    spec.schema,
  ]
    .filter(Boolean)
    .join('\n\n');
}
