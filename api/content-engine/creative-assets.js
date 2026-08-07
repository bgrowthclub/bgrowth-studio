import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { runMediaGeneration } from '../_lib/ai/mediaGeneration.js';
import { deleteCreativeAssetFile, uploadCreativeAsset } from '../_lib/uploadCreativeAsset.js';

const VALID_ASSET_TYPES = ['image'];
// Only a content_item that has moved past authoring/review may spend money
// generating media for it — the whole point of Phase 2F-A's approval gate
// (preventing generation against text that may still be rewritten).
// Approved/Scheduled/Published all qualify (not literally only 'approved')
// since a Published item legitimately wants a fresh image before a future
// Republish too.
const APPROVAL_GATE_STATUSES = ['approved', 'scheduled', 'published'];

/**
 * A small, content-aware plain-text description of a content_item's body,
 * used only to build an image-generation prompt here — mirrors the spirit
 * of generate.js's own serializeSourceContent, but is deliberately a
 * separate, one-file-only helper: this never touches or extends
 * promptBuilder.js's text-generation prompt composition.
 */
function describeContentForImagePrompt(contentType, body) {
  const b = body ?? {};
  if (contentType === 'caption') return b.caption ?? '';
  if (contentType === 'carousel') return [b.caption, ...(b.slides ?? []).map((s) => `${s.heading}: ${s.body}`)].filter(Boolean).join('. ');
  if (contentType === 'script') return b.hook ?? '';
  if (contentType === 'hook_cta') return (b.hooks ?? [])[0] ?? '';
  return '';
}

/**
 * content_engine.creative_assets — the MEDIA layer for a content_item,
 * entirely separate from api/content-engine/content-items.js (content
 * authoring + publication scheduling). A new file, not a new resource
 * branch on that one, because this is the first Content Engine concern
 * with real external dependencies (an AI media provider, Supabase
 * Storage) — content-items.js deliberately imports neither, which is what
 * lets Phase 2E's audit prove Republish can never call AI just by
 * inspecting its imports. Adding media-generation code there would break
 * that provable isolation.
 *
 * GET lists assets (optionally scoped to one content_item_id). POST
 * generates a new image for an eligible content_item — never creates a
 * new content_items row, never touches its body/platform/content_type,
 * never calls /api/content-engine/generate or promptBuilder.js. DELETE
 * removes an asset an admin doesn't want to keep.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { contentItemId } = req.query;
    let query = supabase
      .schema('content_engine')
      .from('creative_assets')
      .select('*')
      .order('created_at', { ascending: false });
    if (contentItemId) query = query.eq('content_item_id', contentItemId);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ creativeAssets: data });
  }

  if (req.method === 'POST') {
    const { contentItemId, assetType } = req.body ?? {};
    if (!contentItemId || !assetType) {
      return res.status(400).json({ error: 'contentItemId and assetType are required.' });
    }
    if (!VALID_ASSET_TYPES.includes(assetType)) {
      return res.status(400).json({ error: `assetType must be one of: ${VALID_ASSET_TYPES.join(', ')}` });
    }

    const { data: contentItem, error: itemError } = await supabase
      .schema('content_engine')
      .from('content_items')
      .select('id, content_type, body, status')
      .eq('id', contentItemId)
      .single();
    if (itemError || !contentItem) return res.status(404).json({ error: 'Content item not found.' });
    if (!APPROVAL_GATE_STATUSES.includes(contentItem.status)) {
      return res.status(400).json({ error: 'Creative assets can only be generated for an Approved, Scheduled, or Published content item.' });
    }

    const description = describeContentForImagePrompt(contentItem.content_type, contentItem.body);
    const prompt = `Create a social media image that visually represents the following content. Do not render any text/words in the image. Content: ${description}`.trim();

    let generation;
    try {
      generation = await runMediaGeneration({ taskType: 'creative_image', prompt });
    } catch (err) {
      // Nothing uploaded, nothing inserted — matches generate.js's own
      // fail-before-any-write behavior for text generation exactly.
      return res.status(502).json({ error: `Creative generation failed: ${err.message}` });
    }

    // Upload BEFORE inserting the database row — if this fails, no
    // creative_assets row is ever created (see the Phase 2F-A storage
    // refinement audit's upload-lifecycle recommendation).
    const assetId = randomUUID();
    let uploaded;
    try {
      uploaded = await uploadCreativeAsset(supabase, {
        contentItemId,
        assetId,
        buffer: generation.buffer,
        mimeType: generation.mimeType,
      });
    } catch (err) {
      return res.status(500).json({ error: `Failed to store generated creative: ${err.message}` });
    }

    const { data: asset, error: insertError } = await supabase
      .schema('content_engine')
      .from('creative_assets')
      .insert({
        id: assetId,
        content_item_id: contentItemId,
        asset_type: assetType,
        status: 'ready',
        provider: generation.provider,
        model: generation.model,
        storage_path: uploaded.path,
        public_url: uploaded.url,
        mime_type: uploaded.mimeType,
        size_bytes: uploaded.sizeBytes,
        checksum: uploaded.checksum,
        generation_prompt: prompt,
      })
      .select('*')
      .single();

    if (insertError) {
      // Best-effort compensating delete — a cleanup failure is logged, not
      // thrown, so it never masks the real (insert) error returned below.
      try {
        await deleteCreativeAssetFile(supabase, uploaded.path);
      } catch (cleanupErr) {
        console.error('[creative-assets] failed to clean up orphaned Storage object after a failed insert:', uploaded.path, cleanupErr);
      }
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(201).json({ creativeAsset: asset });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id is required.' });

    const { data: existing, error: fetchError } = await supabase
      .schema('content_engine')
      .from('creative_assets')
      .select('id, storage_path')
      .eq('id', id)
      .single();
    if (fetchError || !existing) return res.status(404).json({ error: 'Creative asset not found.' });

    // Storage removal first, database row second — if Storage delete
    // fails, the row is left untouched (it still correctly points at a
    // file that still exists), never orphaning an unreferenced object.
    if (existing.storage_path) {
      try {
        await deleteCreativeAssetFile(supabase, existing.storage_path);
      } catch (err) {
        return res.status(500).json({ error: `Failed to delete stored file: ${err.message}` });
      }
    }

    const { error } = await supabase.schema('content_engine').from('creative_assets').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
