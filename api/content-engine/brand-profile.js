import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

/**
 * Reads/updates the single content_engine.brand_profile row (id is pinned
 * to 1 by a DB check constraint — see 0020_content_engine_schema.sql — so
 * there is never a "which profile" question here, only GET/PUT).
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .schema('content_engine')
      .from('brand_profile')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ brandProfile: data });
  }

  if (req.method === 'PUT') {
    const {
      name,
      tagline,
      default_language,
      tone_voice,
      messaging_principles,
      prohibited_styles,
      preferred_cta_styles,
      target_audience,
      social_content_rules,
    } = req.body ?? {};

    const { data, error } = await supabase
      .schema('content_engine')
      .from('brand_profile')
      .update({
        name,
        tagline,
        default_language,
        tone_voice,
        messaging_principles,
        prohibited_styles,
        preferred_cta_styles,
        target_audience,
        social_content_rules,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ brandProfile: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
