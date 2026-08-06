import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { runGeneration } from '../_lib/ai/runGeneration.js';
import { buildGenerationPrompt } from '../_lib/contentEngine/promptBuilder.js';
import { CONTENT_SPECS, PLATFORM_LABELS } from '../_lib/contentEngine/contentSpecs.js';

const VALID_PLATFORMS = Object.keys(PLATFORM_LABELS);
const VALID_CONTENT_TYPES = Object.keys(CONTENT_SPECS);

/**
 * The Content Engine's one generation endpoint: given an existing campaign
 * plus a platform + content type, gathers the Brand Profile, the campaign's
 * Content Strategy, and the campaign's product (read from the existing
 * public portal.catalog_index — no duplicate catalog), composes one prompt,
 * runs it through the AI Provider abstraction, and inserts the result as a
 * new draft content_item. Every generation is a fresh draft, never an
 * in-place overwrite — an admin who wants a different take generates again
 * and discards the one they don't want.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { campaignId, platform, contentType } = req.body ?? {};
  if (!campaignId || !platform || !contentType) {
    return res.status(400).json({ error: 'campaignId, platform, and contentType are required.' });
  }
  if (!VALID_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` });
  }
  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    return res.status(400).json({ error: `contentType must be one of: ${VALID_CONTENT_TYPES.join(', ')}` });
  }

  const supabase = getSupabaseAdmin();

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

  const prompt = buildGenerationPrompt({
    brandProfile,
    strategy: campaign.content_strategies,
    product,
    platform,
    contentType,
    goal: campaign.goal,
  });

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
    })
    .select('*')
    .single();
  if (insertError) return res.status(500).json({ error: insertError.message });

  return res.status(201).json({ contentItem });
}
