import { CONTENT_SPECS, PLATFORM_LABELS } from './contentSpecs.js';

/**
 * Composes one generation prompt from the centralized Brand Profile (so no
 * individual prompt has to redefine BGrowth's voice), the selected Content
 * Strategy's guidance, the campaign's own Goal and Audience, the platform's
 * generation guidance, and the product being promoted. This is the one
 * place those come together — api/content-engine/generate.js never builds
 * prompt text itself, it only gathers the rows and calls this.
 *
 * These concepts are deliberately kept as separate sections, never merged:
 *  - Strategy: HOW the message is framed (a fixed, reusable narrative
 *    approach from content_strategies).
 *  - Goal: WHAT this specific campaign is trying to achieve (free text on
 *    campaigns.goal, optional).
 *  - Campaign Audience: WHO this specific campaign targets (free text on
 *    campaigns.audience, optional) — distinct from Brand Profile's own
 *    target_audience below, which is BGrowth's broad audience across every
 *    campaign. Both may be present; neither replaces the other.
 *  - Language: resolved to exactly ONE value before it reaches the prompt
 *    (campaign.language when set, else brand_profile.default_language) —
 *    never two competing language instructions.
 *  - Platform Guidance: HOW the message should be adapted to the selected
 *    platform's format/tone conventions (free text from
 *    content_engine.platform_rules, optional — a platform with no rule row
 *    yet simply omits this section, never blocks generation). Distinct
 *    from Strategy, which still decides how the message is framed
 *    regardless of platform.
 *  - Source Content / Variation Instruction (Phase 2D, both optional and
 *    only ever supplied together by generate.js): the existing content_item
 *    being varied, and the selected fixed variation type's instruction
 *    (see generate.js's VARIATION_TYPES — the one authoritative source for
 *    that instruction text). Omitted entirely for a normal, non-variation
 *    generation — every other section above is composed identically either
 *    way, so a variation prompt is the same prompt plus these two extra
 *    sections, never a competing/parallel prompt.
 */
export function buildGenerationPrompt({
  brandProfile,
  strategy,
  product,
  platform,
  contentType,
  goal,
  audience,
  language,
  platformGuidance,
  sourceContent,
  variationInstruction,
}) {
  const spec = CONTENT_SPECS[contentType];
  if (!spec) {
    throw new Error(`Unknown content type "${contentType}".`);
  }

  const platformLabel = PLATFORM_LABELS[platform] ?? platform;
  const trimmedLanguage = typeof language === 'string' ? language.trim() : '';
  const resolvedLanguage = trimmedLanguage || brandProfile.default_language;

  const brandLines = [
    `Brand: ${brandProfile.name}${brandProfile.tagline ? ` — "${brandProfile.tagline}"` : ''}`,
    `Write in: ${resolvedLanguage}`,
    'Do not translate product names, BGrowth trademarks, or branded product terminology (e.g. "Business System™", "Planner™", "Workflow™") unless a translation is genuinely more natural for a native speaker of that language — when in doubt, keep the branded term as-is.',
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
      ? `Brand Audience (BGrowth's broad audience across every campaign): ${JSON.stringify(brandProfile.target_audience)}`
      : null,
    brandProfile.social_content_rules && Object.keys(brandProfile.social_content_rules).length
      ? `Social content rules: ${JSON.stringify(brandProfile.social_content_rules)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const trimmedGoal = typeof goal === 'string' ? goal.trim() : '';
  const trimmedAudience = typeof audience === 'string' ? audience.trim() : '';
  const trimmedPlatformGuidance = typeof platformGuidance === 'string' ? platformGuidance.trim() : '';
  const trimmedSourceContent = typeof sourceContent === 'string' ? sourceContent.trim() : '';
  const trimmedVariationInstruction = typeof variationInstruction === 'string' ? variationInstruction.trim() : '';
  // Both must be present — a partial/inconsistent call (only one supplied)
  // falls back to normal-generation prompt behavior rather than emitting a
  // half-instructed variation section.
  const isVariation = Boolean(trimmedSourceContent && trimmedVariationInstruction);

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
    trimmedAudience ? `--- CAMPAIGN AUDIENCE (this specific campaign's target) ---\n\n${trimmedAudience}` : null,
    '--- PRODUCT TO PROMOTE ---',
    productLines,
    isVariation ? `--- SOURCE CONTENT (create a distinct variation of this — do not copy it verbatim) ---\n\n${trimmedSourceContent}` : null,
    isVariation ? `--- VARIATION INSTRUCTION ---\n\n${trimmedVariationInstruction}` : null,
    '--- TASK ---',
    `Platform: ${platformLabel}`,
    trimmedPlatformGuidance ? `--- PLATFORM GUIDANCE (${platformLabel}) ---\n\n${trimmedPlatformGuidance}` : null,
    isVariation
      ? 'This is a variation task, not a first-time generation. Create a genuinely distinct alternate version of the source content above, following the variation instruction above. Preserve the accurate factual/product meaning of the source — do not introduce new claims or change what the product actually does. Do not simply copy or lightly rephrase the source content; make a meaningfully different execution as instructed. The output must still conform exactly to the JSON schema below.'
      : null,
    spec.instruction,
    'Return ONLY valid JSON matching exactly this shape, no commentary:',
    spec.schema,
  ]
    .filter(Boolean)
    .join('\n\n');
}
