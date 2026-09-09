import {
  ANALYSIS_SCHEMA,
  CAROUSEL_SCHEMA,
  CONTENT_LANGUAGE_LABELS,
  DEFAULT_CONTENT_LANGUAGE,
  HASHTAGS_SCHEMA,
  PLATFORM_LABELS,
  PLATFORM_NOTES,
  POST_OBJECTIVE_LABELS,
  SLIDE_ROLE_LABELS,
  copySchemaFor,
} from './contentSpecs.js';

function objectiveLine(objective, customObjective) {
  if (objective === 'other') return `Publication objective: ${customObjective?.trim() || 'not specified'}.`;
  return `Publication objective: ${POST_OBJECTIVE_LABELS[objective] ?? objective}.`;
}

function platformLine(platform) {
  return `Platform: ${PLATFORM_LABELS[platform] ?? platform}. ${PLATFORM_NOTES[platform] ?? ''}`;
}

// Explicit, not inferred — the model must not guess the language from the
// photos or from any other field. `language` is always one of the client's
// ContentLanguage keys; falls back to the default if missing/unrecognized.
function languageLine(language) {
  const label = CONTENT_LANGUAGE_LABELS[language] ?? CONTENT_LANGUAGE_LABELS[DEFAULT_CONTENT_LANGUAGE];
  return `Generate all user-facing text in ${label}. This applies to every piece of text you return — do not mix languages and do not default to a different language based on the photos or any other input.`;
}

/**
 * Analyzes the uploaded photo SET together — never independently — so the
 * model can find a visual story/sequence across them, not just describe
 * each photo in isolation.
 */
export function buildAnalysisPrompt({ photoCount, language }) {
  return [
    `You are analyzing a set of ${photoCount} photo${photoCount === 1 ? '' : 's'} a small business owner uploaded to build a social media post.`,
    'Analyze them together as a SET first — look for a visual story, natural sequence, and what they collectively show — then describe each individual photo briefly, in the exact order provided (the first photo is index 0).',
    'Identify: what is shown, the product/service, visual characteristics, colors, environment, relevant details, and the likely use/context for this content. You may reason internally in any language, but every text value you return must follow the language instruction below.',
    languageLine(language),
    `Return ONLY valid JSON matching this exact shape, no other text: ${ANALYSIS_SCHEMA}`,
  ].join('\n');
}

/**
 * Recommends slide order + role + optional short text overlay per slide.
 * Deliberately reuses the analysis JSON as context instead of re-sending
 * the photos — the images were already understood in buildAnalysisPrompt;
 * this step reasons about them, it doesn't need to re-see them.
 */
export function buildCarouselPrompt({ analysis, objective, customObjective, platform, photoCount, language }) {
  const roles = Object.entries(SLIDE_ROLE_LABELS)
    .map(([id, label]) => `"${id}" (${label})`)
    .join(', ');
  return [
    `You are recommending a social media carousel slide sequence from ${photoCount} already-analyzed photos.`,
    objectiveLine(objective, customObjective),
    platformLine(platform),
    `Photo set analysis: ${JSON.stringify(analysis)}`,
    `For each slide, recommend the best photoIndex (matching the analysis's photo indexes) and a role. Available roles: ${roles}.`,
    'You do not have to use every photo — use only the ones that genuinely serve the objective, in the order that tells the best visual story. Do not pad the sequence with slides that add nothing.',
    'For each slide, suggest a short text overlay (a few words, never a paragraph) ONLY when text genuinely adds value to that specific slide. Many strong slides should have suggestedText set to null and rely on the photo alone — do not force text onto every slide.',
    `Any suggestedText you do include must follow the language instruction below. ${languageLine(language)}`,
    `Return ONLY valid JSON matching this exact shape, no other text: ${CAROUSEL_SCHEMA}`,
  ].join('\n');
}

/**
 * target is 'all' on first generation, or exactly one of 'phrase'/
 * 'caption'/'cta' when the user asks to regenerate only that one field —
 * `existing` (whichever of the other two fields already exist) is passed
 * along so a single-field regeneration stays consistent with the rest of
 * the post instead of drifting from it.
 */
export function buildCopyPrompt({ analysis, objective, customObjective, platform, target, existing, language }) {
  const lines = [
    'You are writing social media copy based on real, specific photos — never generic motivational filler.',
    objectiveLine(objective, customObjective),
    platformLine(platform),
    `Photo set analysis: ${JSON.stringify(analysis)}`,
  ];

  if (target === 'all') {
    lines.push(
      'Write: A) a short, high-impact main phrase/headline; B) a full social caption; C) a call to action. All three must be grounded in what the photos actually show.',
    );
  } else {
    const fieldLabel = { phrase: 'main phrase/headline', caption: 'full social caption', cta: 'call to action' }[target];
    lines.push(`Write ONLY a new ${fieldLabel} — a different take than before, still grounded in the same photos and objective.`);
    if (existing && Object.keys(existing).length > 0) {
      lines.push(`Keep it consistent with the rest of this post, which already reads: ${JSON.stringify(existing)}`);
    }
  }

  lines.push(languageLine(language));
  lines.push(`Return ONLY valid JSON matching this exact shape, no other text: ${copySchemaFor(target)}`);
  return lines.join('\n');
}

export function buildHashtagsPrompt({ analysis, objective, customObjective, platform, language }) {
  return [
    'You are generating hashtags for a social media post based on real, specific photos — not a random generic list.',
    objectiveLine(objective, customObjective),
    platformLine(platform),
    `Photo set analysis: ${JSON.stringify(analysis)}`,
    'Base the hashtags on the visual content, product/service, niche, likely audience, and the publication objective. Organize them into groups: niche, product/service, audience, location (only if a location is genuinely implied by the photos — otherwise leave empty), and brand (only if a brand name/handle is evident — otherwise leave empty).',
    `${languageLine(language)} Keep the hashtags natural and idiomatic for that language, platform, audience, and niche — do not mechanically translate hashtags word-for-word when that would produce unnatural or irrelevant tags; a widely-used tag in its original form (e.g. an English or brand-standard tag) is fine when that is genuinely how people tag this content in that language/market.`,
    `Return ONLY valid JSON matching this exact shape, no other text: ${HASHTAGS_SCHEMA}`,
  ].join('\n');
}
