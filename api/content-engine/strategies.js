import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

/** Read-only list of active content strategies — seeded in the migration, editable later straight in Supabase if needed. */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .schema('content_engine')
    .from('content_strategies')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ strategies: data });
}
