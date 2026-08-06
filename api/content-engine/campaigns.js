import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { PLATFORM_LABELS } from '../_lib/contentEngine/contentSpecs.js';

const VALID_PLATFORMS = Object.keys(PLATFORM_LABELS);

function slugifyForUtm(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * campaigns is the Content Engine's own record of "a marketing push for one
 * published product" — product_id/product_slug are a snapshot taken at
 * creation time (see the migration's note on why there's no cross-schema FK
 * into portal.products). GET lists every campaign with its strategy name
 * joined in; POST creates one against an already-published product the
 * caller looked up client-side from the public portal.catalog_index.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    // ?resource=catalog&q=... — published Workspace search for the New
    // Campaign picker. Was a direct browser-side anon-key call to
    // portal.catalog_index (src/modules/content-engine/api/catalogProducts.ts);
    // moved server-side onto the same service-role client every other
    // Content Engine read already uses, since that path is proven working
    // while the browser anon client depends on separately-configured
    // VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY build-time variables. Same
    // query shape as before — no change to what's selected or how it's
    // filtered/ordered/limited.
    if (req.query.resource === 'catalog') {
      const q = (req.query.q ?? '').trim();
      let query = supabase
        .schema('portal')
        .from('catalog_index')
        .select('product_id, slug, name, short_description, cover_image_url')
        .order('published_at', { ascending: false })
        .limit(25);
      if (q) query = query.ilike('name', `%${q}%`);

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ products: data });
    }

    const { data, error } = await supabase
      .schema('content_engine')
      .from('campaigns')
      .select('*, content_strategies(id, key, name), content_items(id, status)')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ campaigns: data });
  }

  if (req.method === 'POST') {
    const { productId, productSlug, strategyId, name, goal, utmCampaign, audience, language, channels } = req.body ?? {};
    if (!productId || !productSlug || !strategyId || !name) {
      return res.status(400).json({ error: 'productId, productSlug, strategyId, and name are required.' });
    }

    // Channels is a hard requirement for new campaigns (explicit channel
    // planning) — distinct from legacy campaigns created before this field
    // existed, whose channels='{}' fallback means "no restriction" instead
    // (see CampaignDetailView.tsx). Never trust arbitrary values here.
    if (!Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({ error: 'channels must include at least one supported platform.' });
    }
    const invalidChannels = channels.filter((c) => !VALID_PLATFORMS.includes(c));
    if (invalidChannels.length > 0) {
      return res.status(400).json({
        error: `channels contains unsupported platform(s): ${invalidChannels.join(', ')}. Must be one of: ${VALID_PLATFORMS.join(', ')}.`,
      });
    }

    const { data, error } = await supabase
      .schema('content_engine')
      .from('campaigns')
      .insert({
        product_id: productId,
        product_slug: productSlug,
        strategy_id: strategyId,
        name,
        goal: goal || null,
        audience: typeof audience === 'string' && audience.trim() ? audience.trim() : null,
        language: typeof language === 'string' && language.trim() ? language.trim() : null,
        channels,
        utm_campaign: utmCampaign || slugifyForUtm(name),
      })
      .select('*, content_strategies(id, key, name)')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ campaign: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
