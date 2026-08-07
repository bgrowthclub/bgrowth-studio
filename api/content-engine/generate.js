import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { runGeneration } from '../_lib/ai/runGeneration.js';
import { buildGenerationPrompt } from '../_lib/contentEngine/promptBuilder.js';
import { CONTENT_SPECS, PLATFORM_LABELS } from '../_lib/contentEngine/contentSpecs.js';

const VALID_PLATFORMS = Object.keys(PLATFORM_LABELS);
const VALID_CONTENT_TYPES = Object.keys(CONTENT_SPECS);

/**
 * Phase 2D — the fixed, admin-facing variation types and their authoritative
 * prompt instructions. This is the one place these instructions are
 * defined: the frontend (types.ts's VARIATION_TYPE_LABELS) only carries the
 * matching *labels* for the picker UI, never a second copy of the
 * instruction text, so there is exactly one source of truth for what each
 * variation type actually asks the model to do.
 */
const VARIATION_TYPES = {
  alternative_hook: {
    label: 'Alternative Hook',
    instruction:
      'Keep the same core message, product, and CTA, but write a distinctly different opening hook than the source content — a genuinely different way to capture attention, not a light rephrasing of the same hook.',
  },
  alternative_angle: {
    label: 'Alternative Angle',
    instruction:
      'Keep the same product and campaign context, but approach the message from a different angle or perspective than the source content — a different way into the same underlying value proposition.',
  },
  shorter: {
    label: 'Shorter Version',
    instruction:
      'Produce a noticeably shorter, more concise version than the source content that keeps only the most essential message and CTA — trim supporting detail rather than compressing every line by the same amount.',
  },
  more_educational: {
    label: 'More Educational',
    instruction:
      'Lead with more genuinely useful, educational value before any promotional framing than the source content did — teach something concrete first, then connect it to the product.',
  },
  more_direct: {
    label: 'More Direct',
    instruction:
      'Be more direct and to-the-point than the source content — state the value proposition and CTA plainly, with less build-up or narrative framing.',
  },
  alternative_cta: {
    label: 'Alternative CTA',
    instruction:
      'Keep the rest of the content close to the source, but write a distinctly different call to action — a different angle on what the reader should do next.',
  },
};

/**
 * A content-aware, plain-text rendering of a content_item.body for prompt
 * input — mirrors ContentItemBody.tsx's buildContentCopy() per-content-type
 * formatting (that function is frontend-only, used for the Copy button;
 * this is its smallest server-side equivalent, not a blind
 * JSON.stringify). Read-only: never touches the stored source row.
 */
function serializeSourceContent(contentType, body) {
  const b = body ?? {};
  const withHashtags = (tags) => (tags ?? []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');

  if (contentType === 'caption') {
    return `${b.caption ?? ''}\n\n${withHashtags(b.hashtags)}`;
  }
  if (contentType === 'carousel') {
    const slides = b.slides ?? [];
    const slidesText = slides.map((s, i) => `Slide ${i + 1}\n${s.heading}\n${s.body}`).join('\n\n');
    return [slidesText, `Caption\n${b.caption ?? ''}`, `Hashtags\n${withHashtags(b.hashtags)}`].filter(Boolean).join('\n\n');
  }
  if (contentType === 'script') {
    const scenes = b.scenes ?? [];
    const scenesText = scenes.map((s, i) => `Scene ${i + 1}\n${s.visual}\n${s.voiceover}`).join('\n\n');
    return [`Hook\n${b.hook ?? ''}`, scenesText, `CTA\n${b.cta ?? ''}`].filter(Boolean).join('\n\n');
  }
  if (contentType === 'hook_cta') {
    const numbered = (items) => (items ?? []).map((v, i) => `${i + 1}. ${v}`).join('\n');
    return [`Hooks\n\n${numbered(b.hooks)}`, `CTAs\n\n${numbered(b.ctas)}`].join('\n\n');
  }
  return JSON.stringify(b, null, 2);
}

/**
 * The Content Engine's one generation endpoint: given an existing campaign
 * plus a platform + content type, gathers the Brand Profile, the campaign's
 * Content Strategy, and the campaign's product (read from the existing
 * public portal.catalog_index — no duplicate catalog), composes one prompt,
 * runs it through the AI Provider abstraction, and inserts the result as a
 * new draft content_item. Every generation is a fresh draft, never an
 * in-place overwrite — an admin who wants a different take generates again
 * and discards the one they don't want.
 *
 * Phase 2D — Variations: when sourceContentItemId is supplied, this same
 * endpoint generates an alternate execution of an existing content_item
 * instead of a first-time piece of content. platform/contentType are always
 * derived from the source item itself in that case — a client-supplied
 * platform/contentType can never redefine what's being varied (Variations
 * never crosses platform or content type; that's a distinct, unbuilt
 * "Repurpose Content" feature). The source row is only ever read here,
 * never written to.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { campaignId, sourceContentItemId, variationType } = req.body ?? {};
  let { platform, contentType } = req.body ?? {};
  const isVariation = Boolean(sourceContentItemId);

  if (!campaignId) {
    return res.status(400).json({ error: 'campaignId is required.' });
  }

  if (isVariation) {
    if (!variationType || !VARIATION_TYPES[variationType]) {
      return res.status(400).json({ error: `variationType must be one of: ${Object.keys(VARIATION_TYPES).join(', ')}` });
    }
  } else {
    if (!platform || !contentType) {
      return res.status(400).json({ error: 'campaignId, platform, and contentType are required.' });
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      return res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` });
    }
    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      return res.status(400).json({ error: `contentType must be one of: ${VALID_CONTENT_TYPES.join(', ')}` });
    }
  }

  const supabase = getSupabaseAdmin();

  let sourceItem = null;
  if (isVariation) {
    const { data: source, error: sourceError } = await supabase
      .schema('content_engine')
      .from('content_items')
      .select('*')
      .eq('id', sourceContentItemId)
      .single();
    if (sourceError || !source) return res.status(404).json({ error: 'Source content item not found.' });
    if (source.campaign_id !== campaignId) {
      return res.status(400).json({ error: "sourceContentItemId does not belong to the supplied campaignId." });
    }
    sourceItem = source;
    // Never trust a client-supplied platform/contentType once a source item
    // is involved — always derive both from the row being varied.
    platform = source.platform;
    contentType = source.content_type;
  }

  const { data: campaign, error: campaignError } = await supabase
    .schema('content_engine')
    .from('campaigns')
    .select('*, content_strategies(*)')
    .eq('id', campaignId)
    .single();
  if (campaignError || !campaign) return res.status(404).json({ error: 'Campaign not found.' });

  const { data: brandProfile, error: brandError } = await supabase
    .schema('content_engine')
    .from('brand_profile')
    .select('*')
    .eq('id', 1)
    .single();
  if (brandError || !brandProfile) return res.status(500).json({ error: 'Brand profile not configured.' });

  const { data: product, error: productError } = await supabase
    .schema('portal')
    .from('catalog_index')
    .select('product_id, slug, name, short_description, tags')
    .eq('product_id', campaign.product_id)
    .single();
  if (productError || !product) {
    return res.status(404).json({ error: 'This campaign\'s product is no longer published.' });
  }

  // Platform guidance is optional — a platform with no row here yet (or a
  // lookup error) must never block generation, only omit that section of
  // the prompt. See platform_rules migration's note on this fallback.
  const { data: platformRule } = await supabase
    .schema('content_engine')
    .from('platform_rules')
    .select('guidance')
    .eq('platform', platform)
    .eq('is_active', true)
    .maybeSingle();

  const prompt = buildGenerationPrompt({
    brandProfile,
    strategy: campaign.content_strategies,
    product,
    platform,
    contentType,
    goal: campaign.goal,
    audience: campaign.audience,
    language: campaign.language,
    platformGuidance: platformRule?.guidance ?? null,
    sourceContent: isVariation ? serializeSourceContent(sourceItem.content_type, sourceItem.body) : null,
    variationInstruction: isVariation ? VARIATION_TYPES[variationType].instruction : null,
  });

  // AI routing decision (Phase 2D): variation generation reuses the SAME
  // taskType as normal generation for this content_type (e.g. 'caption'),
  // not a 'variation' taskType — even though provider_task_config already
  // has a seeded 'variation' row (0020_content_engine_schema.sql). A
  // variation of a caption is still, functionally, a caption-generation
  // task; nothing in this feature's approved architecture calls for a
  // different provider/model than normal generation for the same
  // content_type. Reusing contentType also makes this feature's routing
  // correct on day one regardless of whether/when the 'variation' row's
  // stale gemini-2.0-flash value (see this migration's own note) has been
  // corrected — it never depends on that row at all.
  let generation;
  try {
    generation = await runGeneration({ taskType: contentType, prompt });
  } catch (err) {
    return res.status(502).json({ error: `AI generation failed: ${err.message}` });
  }

  const { data: contentItem, error: insertError } = await supabase
    .schema('content_engine')
    .from('content_items')
    .insert({
      campaign_id: campaignId,
      platform,
      content_type: contentType,
      status: 'draft',
      body: generation.output,
      generated_by_provider: generation.provider,
      generated_by_model: generation.model,
      parent_content_item_id: isVariation ? sourceContentItemId : null,
      variation_label: isVariation ? VARIATION_TYPES[variationType].label : null,
    })
    .select('*')
    .single();
  if (insertError) return res.status(500).json({ error: insertError.message });

  return res.status(201).json({ contentItem });
}
