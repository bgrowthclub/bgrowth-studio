import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { requireAdmin } from '../_lib/requireAdmin.js';

const VALID_STATUSES = ['draft', 'review', 'approved', 'scheduled', 'published'];

/**
 * content_items — one row per generated piece of content. GET lists (all,
 * or scoped to one campaign via ?campaignId=). PATCH is the only mutation
 * route for the approval/scheduling lifecycle (draft -> review -> approved
 * -> scheduled -> published) and for admin edits to the generated body —
 * Phase 1 never flips a row to 'published' on its own; that's always this
 * route, called by an admin, after they've posted the content externally
 * by hand. DELETE removes a draft an admin decides not to use.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { campaignId } = req.query;
    let query = supabase
      .schema('content_engine')
      .from('content_items')
      .select('*, campaigns(id, name, product_slug, utm_campaign)')
      .order('created_at', { ascending: false });
    if (campaignId) query = query.eq('campaign_id', campaignId);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ contentItems: data });
  }

  if (req.method === 'PATCH') {
    const { id, status, body, scheduledAt, publishedAt } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id is required.' });
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const update = { updated_at: new Date().toISOString() };
    if (status !== undefined) update.status = status;
    if (body !== undefined) update.body = body;
    if (scheduledAt !== undefined) update.scheduled_at = scheduledAt;
    if (publishedAt !== undefined) update.published_at = publishedAt;
    // Marking Published without an explicit timestamp stamps "now" — the
    // one Phase 1 case where the manual action itself is the record.
    if (status === 'published' && publishedAt === undefined) {
      update.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .schema('content_engine')
      .from('content_items')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ contentItem: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id is required.' });
    const { error } = await supabase.schema('content_engine').from('content_items').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
