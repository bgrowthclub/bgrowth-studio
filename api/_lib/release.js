/**
 * Release flow (Portal migration 0051) — the stages a product goes through
 * before it is sold, served through api/access-management.js
 * (`?resource=release`). Every call already passed requireAdmin().
 *
 *   draft → ready_for_review ("reviewed") → approved → published
 *
 *   POST { action:'stage', productId, stage:'draft'|'ready_for_review'|'approved' }
 *        - ready_for_review needs a name, short description, cover, price
 *          (or free) and, for a Download, at least one file
 *        - approved only from ready_for_review (records who approved)
 *        - draft clears the review, the approval and the date
 *   POST { action:'schedule', productId, at: ISO date | null }  (approved only)
 *   POST { action:'publish-now', productId }                     (approved only)
 *
 * The daily job on the Website publishes approved products whose date has
 * come (portal.publish_scheduled()).
 */

const STAGES = new Set(['draft', 'ready_for_review', 'approved']);

function products(supabase) {
  return supabase.schema('portal').from('products');
}

function missingForReview(p) {
  const missing = [];
  if (!String(p.name ?? '').trim()) missing.push('name');
  if (!String(p.short_description ?? '').trim()) missing.push('short description');
  if (!p.cover_image_url) missing.push('cover image');
  if (!p.is_free && !(p.price_cents > 0)) missing.push('price');
  if (p.content_type === 'pdf' && !(p.content?.files?.length > 0)) missing.push('file');
  return missing;
}

export async function handleRelease(req, res, supabase, admin) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const productId = String(body.productId ?? '');
  if (!productId) return res.status(400).json({ error: 'productId is required.' });

  const { data: p, error } = await products(supabase)
    .select('id, name, short_description, cover_image_url, is_free, price_cents, content_type, content, status')
    .eq('id', productId)
    .maybeSingle();
  if (error) throw error;
  if (!p) return res.status(404).json({ error: 'Product not found.' });
  if (p.status === 'published') return res.status(409).json({ error: 'This product is already on sale.' });

  const now = new Date().toISOString();

  if (body.action === 'stage') {
    const stage = String(body.stage ?? '');
    if (!STAGES.has(stage)) return res.status(400).json({ error: 'Unknown stage.' });
    let patch;
    if (stage === 'ready_for_review') {
      const missing = missingForReview(p);
      if (missing.length) return res.status(422).json({ error: `Missing: ${missing.join(', ')}.` });
      patch = { status: stage, reviewed_by: admin.email, reviewed_at: now, approved_by: null, approved_at: null };
    } else if (stage === 'approved') {
      if (p.status !== 'ready_for_review') return res.status(409).json({ error: 'Mark it as reviewed first.' });
      patch = { status: stage, approved_by: admin.email, approved_at: now };
    } else {
      patch = { status: 'draft', reviewed_by: null, reviewed_at: null, approved_by: null, approved_at: null, scheduled_publish_at: null };
    }
    const { error: updateError } = await products(supabase).update(patch).eq('id', productId);
    if (updateError) throw updateError;
    return res.json({ ok: true, status: patch.status });
  }

  if (body.action === 'schedule') {
    if (p.status !== 'approved') return res.status(409).json({ error: 'Only approved products can be scheduled.' });
    let at = null;
    if (body.at) {
      const d = new Date(String(body.at));
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Pick a valid date.' });
      at = d.toISOString();
    }
    const { error: updateError } = await products(supabase).update({ scheduled_publish_at: at }).eq('id', productId);
    if (updateError) throw updateError;
    return res.json({ ok: true, scheduledPublishAt: at });
  }

  if (body.action === 'publish-now') {
    if (p.status !== 'approved') return res.status(409).json({ error: 'Approve it before publishing.' });
    const { error: rpcError } = await supabase
      .schema('portal')
      .rpc('publish_existing', { p_product_id: productId, p_published_by: admin.email });
    if (rpcError) return res.status(422).json({ error: rpcError.message });
    return res.json({ ok: true, status: 'published' });
  }

  return res.status(400).json({ error: 'Unknown action.' });
}
