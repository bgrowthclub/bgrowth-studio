import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

const VALID_STATUSES = ['draft', 'review', 'approved', 'scheduled', 'published'];

/**
 * Attempts to record a content_item's ORIGINAL publication as one
 * content_engine.content_publications row (publication_type='original',
 * status='published', published_at taken from the content_item itself).
 * Idempotent by construction: content_publications_one_original_per_item_idx
 * (0026 migration) guarantees at most one such row per content_item, so a
 * repeat call — whether from the same content_item transitioning to
 * Published again, or from a legacy item's first Republish request lazily
 * catching up its history — simply fails with Postgres 23505
 * (unique_violation), which this function treats as "already recorded,"
 * not an error. Any other database error is rethrown.
 *
 * Never called with no published_at — a content_item that hasn't actually
 * been published yet has no "original" event to record.
 */
async function ensureOriginalPublication(supabase, contentItem) {
  if (!contentItem.published_at) return;
  const { error } = await supabase
    .schema('content_engine')
    .from('content_publications')
    .insert({
      content_item_id: contentItem.id,
      publication_type: 'original',
      status: 'published',
      published_at: contentItem.published_at,
    });
  if (error && error.code !== '23505') {
    throw new Error(error.message);
  }
}

/**
 * content_items — one row per generated piece of content. GET lists (all,
 * or scoped to one campaign via ?campaignId=). PATCH is the only mutation
 * route for the approval/scheduling lifecycle (draft -> review -> approved
 * -> scheduled -> published) and for admin edits to the generated body —
 * Phase 1 never flips a row to 'published' on its own; that's always this
 * route, called by an admin, after they've posted the content externally
 * by hand. DELETE removes a draft an admin decides not to use.
 *
 * Phase 2E — ?resource=publications on this same endpoint additionally
 * owns content_publications, the append-only ledger of every individual
 * publish/republish EVENT for a content_item (Republish never creates a
 * new content_items row, never calls AI, and never touches body/platform/
 * content_type/parent_content_item_id/variation_label — this resource is
 * the only thing it's allowed to write to). No new serverless function:
 * this file already owns the full status/scheduling lifecycle and has no
 * AI-generation dependency to isolate from (it imports nothing from
 * _lib/ai/* or promptBuilder.js), so it's the natural, already-established
 * home for publication operations too.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabase = getSupabaseAdmin();
  const isPublicationsResource = req.query.resource === 'publications';

  if (req.method === 'GET') {
    if (isPublicationsResource) {
      const { contentItemId } = req.query;
      let query = supabase
        .schema('content_engine')
        .from('content_publications')
        .select('*, content_items(id, campaign_id, platform, content_type, campaigns(id, name, product_slug, utm_campaign))')
        .order('scheduled_at', { ascending: true });
      if (contentItemId) query = query.eq('content_item_id', contentItemId);

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ publications: data });
    }

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

  if (req.method === 'POST') {
    // Republish only — the sole way a content_publications row is created
    // through this API. publication_type is always forced to 'republish'
    // here; a client can never set it, and none of platform/contentType/
    // body/campaignId/parentContentItemId/variationLabel are ever read
    // from this request at all, let alone written.
    if (!isPublicationsResource) return res.status(405).json({ error: 'Method not allowed' });

    const { contentItemId, scheduledAt } = req.body ?? {};
    if (!contentItemId || !scheduledAt) {
      return res.status(400).json({ error: 'contentItemId and scheduledAt are required.' });
    }

    const { data: contentItem, error: itemError } = await supabase
      .schema('content_engine')
      .from('content_items')
      .select('id, status, published_at')
      .eq('id', contentItemId)
      .single();
    if (itemError || !contentItem) return res.status(404).json({ error: 'Content item not found.' });
    if (contentItem.status !== 'published') {
      return res.status(400).json({ error: 'Only a published content item can be republished.' });
    }

    // Lazy legacy-ledger migration: a content_item published before Phase
    // 2E existed has no content_publications row yet. Its first Republish
    // request is what catches its known history up — never a bulk
    // backfill, and safe to attempt unconditionally every time (idempotent
    // via the unique index + 23505 tolerance in ensureOriginalPublication).
    try {
      await ensureOriginalPublication(supabase, contentItem);
    } catch (err) {
      return res.status(500).json({ error: `Failed to record original publication: ${err.message}` });
    }

    const { data: publication, error: insertError } = await supabase
      .schema('content_engine')
      .from('content_publications')
      .insert({
        content_item_id: contentItemId,
        publication_type: 'republish',
        status: 'scheduled',
        scheduled_at: scheduledAt,
      })
      .select('*, content_items(id, campaign_id, platform, content_type, campaigns(id, name, product_slug, utm_campaign))')
      .single();
    if (insertError) return res.status(500).json({ error: insertError.message });

    return res.status(201).json({ publication });
  }

  if (req.method === 'PATCH') {
    if (isPublicationsResource) {
      // Reschedule only — the sole mutable field on an existing publication
      // occurrence. A published occurrence's date already happened and
      // can't be rescheduled.
      const { id, scheduledAt } = req.body ?? {};
      if (!id || !scheduledAt) return res.status(400).json({ error: 'id and scheduledAt are required.' });

      const { data: existing, error: fetchError } = await supabase
        .schema('content_engine')
        .from('content_publications')
        .select('id, status')
        .eq('id', id)
        .single();
      if (fetchError || !existing) return res.status(404).json({ error: 'Publication not found.' });
      if (existing.status !== 'scheduled') {
        return res.status(400).json({ error: 'Only a scheduled publication can be rescheduled.' });
      }

      const { data: publication, error } = await supabase
        .schema('content_engine')
        .from('content_publications')
        .update({ scheduled_at: scheduledAt, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, content_items(id, campaign_id, platform, content_type, campaigns(id, name, product_slug, utm_campaign))')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ publication });
    }

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

    // Phase 2E: the first time this content_item is actually published,
    // record its 'original' content_publications row. content_items.update
    // above and this insert are two separate, non-transactional database
    // operations (no RPC/transaction is introduced here) — by the time this
    // runs, the content_item's status is already committed as 'published'
    // and cannot be rolled back.
    //
    // A Postgres 23505 (unique_violation) from this insert is expected and
    // idempotent — it means the 'original' row already exists (a prior
    // publish, or this item's own earlier Republish already recorded it —
    // see ensureOriginalPublication) — and is treated as success. Any OTHER
    // error is NOT swallowed: it's surfaced as a genuine API error, because
    // silently losing a publication-history entry is worse than an admin
    // seeing "Published, but its history wasn't recorded — retry."
    //
    // Retrying this same PATCH afterward is always safe and can never
    // create a duplicate 'original' row, regardless of whether the failed
    // attempt's insert partially succeeded before erroring —
    // content_publications_one_original_per_item_idx (0026 migration)
    // enforces that at the database level, and ensureOriginalPublication's
    // own 23505 handling makes the retry itself idempotent too.
    if (status === 'published') {
      try {
        await ensureOriginalPublication(supabase, data);
      } catch (err) {
        return res.status(500).json({
          error: `Content item was published, but recording its original publication failed: ${err.message}`,
          contentItem: data,
        });
      }
    }

    return res.json({ contentItem: data });
  }

  if (req.method === 'DELETE') {
    if (isPublicationsResource) {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id is required.' });

      const { data: existing, error: fetchError } = await supabase
        .schema('content_engine')
        .from('content_publications')
        .select('id, status')
        .eq('id', id)
        .single();
      if (fetchError || !existing) return res.status(404).json({ error: 'Publication not found.' });
      if (existing.status !== 'scheduled') {
        return res.status(400).json({ error: 'Only a scheduled publication can be cancelled.' });
      }

      const { error } = await supabase.schema('content_engine').from('content_publications').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(204).end();
    }

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id is required.' });
    const { error } = await supabase.schema('content_engine').from('content_items').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
