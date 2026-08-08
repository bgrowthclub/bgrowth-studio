import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
// Not yet called — see the PHASE 1 note below. Imported now so enabling
// the gate later is a two-line change (uncomment the call, uncomment the
// 401 branch), not a new import to wire up.
// eslint-disable-next-line no-unused-vars
import { requireAdmin } from './_lib/requireAdmin.js';

/**
 * knowledge_engine.items — the persistent backing store for the existing
 * Knowledge Engine admin UI (src/modules/knowledge-engine in this repo's
 * frontend), replacing its previous localStorage-only persistence. GET
 * lists (or fetches one via ?id=), POST creates, PATCH updates, DELETE
 * removes. One file, method-routed — there is only one entity here, so
 * this doesn't need content-items.js's `?resource=` branching.
 *
 * Every request/response body is shaped exactly like the frontend's
 * existing KnowledgeItem type (src/modules/knowledge-engine/types.ts) —
 * toKnowledgeItem()/fromKnowledgeItemBody() below are the only place that
 * shape is translated to/from the knowledge_engine.items columns. No UI
 * component needs to know this split exists.
 *
 * PHASE 1 — TEMPORARY, NO AUTH: this endpoint has no requireAdmin() gate,
 * matching every other Studio tool today (see api/access-management.js's
 * own identical note, and App.tsx: "Phase 1: no Studio-wide authentication
 * exists yet... this renders unauthenticated, same as every other tool
 * including Content Engine" — 0022_studio_admins.sql is prepared but not
 * applied). Building a one-off login flow just for Knowledge Engine would
 * make it inconsistent with the rest of Studio, not more secure. The only
 * protection right now is whatever restricts who can reach this deployment
 * at all. To enable the real gate once Studio-wide auth is activated:
 * uncomment the `requireAdmin` import above, and at the top of this
 * handler add `const admin = await requireAdmin(req); if (!admin) return
 * res.status(401).json({ error: 'Unauthorized' });` — no other change is
 * needed here, since this file already reads/writes nothing that depends
 * on which admin is acting (unlike Access Management's `granted_by`).
 */

const KNOWLEDGE_ITEM_STRING_FIELDS = {
  title: 'title',
  excerpt: 'excerpt',
  featuredImage: 'featured_image',
  contentType: 'content_type',
  category: 'category',
  industry: 'industry',
  language: 'language',
  difficulty: 'difficulty',
  readingTime: 'reading_time',
  authorId: 'author_id',
};

const STRING_FIELD_DEFAULTS = {
  title: '',
  excerpt: '',
  featuredImage: '',
  contentType: 'Article',
  category: '',
  industry: '',
  language: 'en',
  difficulty: 'Beginner',
  readingTime: '',
  authorId: '',
};

/**
 * Server-side slug normalization — approved as a small, necessary-for-
 * persistence improvement (a raw, un-normalized slug would still work
 * technically, but two admins typing "How To Start!" and "how-to-start"
 * would otherwise collide unpredictably against the unique index). Empty
 * input stays empty — an untitled draft has no slug yet, and that's still
 * allowed (see the partial unique index in 0028's migration).
 */
export function normalizeSlug(raw) {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return '';
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** knowledge_engine.items row -> the exact KnowledgeItem shape the frontend already expects. */
export function toKnowledgeItem(row) {
  const item = { id: row.id, tags: Array.isArray(row.tags) ? row.tags : [] };
  for (const [key, column] of Object.entries(KNOWLEDGE_ITEM_STRING_FIELDS)) {
    item[key] = row[column] ?? '';
  }
  item.slug = row.slug ?? '';
  // Date-only, matching the existing app's own lastUpdated format
  // (new Date().toISOString().split('T')[0] in KnowledgeEngine.tsx) so
  // Library.tsx/Dashboard.tsx's display and sort behavior is unchanged.
  const stamp = row.updated_at || row.created_at;
  item.lastUpdated = stamp ? new Date(stamp).toISOString().slice(0, 10) : '';
  item.seo = row.seo ?? {};
  item.blocks = row.blocks ?? [];
  item.attachments = row.attachments ?? [];
  item.relatedContent = row.related_content ?? [];
  item.featuredOptions = row.featured_options ?? {};
  item.publishing = {
    ...(row.publishing ?? {}),
    slug: row.slug ?? '',
    status: row.status ?? 'Draft',
  };
  return item;
}

/** Request body (KnowledgeItem-shaped) -> a knowledge_engine.items row for insert/update. */
export function fromKnowledgeItemBody(body) {
  const b = body ?? {};
  const publishing = b.publishing && typeof b.publishing === 'object' ? b.publishing : {};
  const row = { slug: normalizeSlug(b.slug ?? publishing.slug) };
  for (const [key, column] of Object.entries(KNOWLEDGE_ITEM_STRING_FIELDS)) {
    row[column] = typeof b[key] === 'string' ? b[key] : STRING_FIELD_DEFAULTS[key];
  }
  row.tags = Array.isArray(b.tags) ? b.tags : [];
  row.status = typeof publishing.status === 'string' && publishing.status ? publishing.status : 'Draft';
  row.seo = b.seo && typeof b.seo === 'object' ? b.seo : {};
  row.blocks = Array.isArray(b.blocks) ? b.blocks : [];
  row.attachments = Array.isArray(b.attachments) ? b.attachments : [];
  row.related_content = Array.isArray(b.relatedContent) ? b.relatedContent : [];
  row.featured_options = b.featuredOptions && typeof b.featuredOptions === 'object' ? b.featuredOptions : {};
  row.publishing = {
    visibility: typeof publishing.visibility === 'string' ? publishing.visibility : 'Public',
    publishDate: typeof publishing.publishDate === 'string' ? publishing.publishDate : '',
    scheduleDate: typeof publishing.scheduleDate === 'string' ? publishing.scheduleDate : '',
    futureWebsiteUrl: typeof publishing.futureWebsiteUrl === 'string' ? publishing.futureWebsiteUrl : '',
    publicationNotes: typeof publishing.publicationNotes === 'string' ? publishing.publicationNotes : '',
  };
  return row;
}

/** Postgres 23505 (unique_violation) on the slug index -> a clear, actionable error instead of a raw DB message. */
function isSlugConflict(error) {
  return error?.code === '23505';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const { data, error } = await supabase.schema('knowledge_engine').from('items').select('*').eq('id', id).maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Knowledge item not found.' });
      return res.json({ item: toKnowledgeItem(data) });
    }

    const { data, error } = await supabase.schema('knowledge_engine').from('items').select('*').order('updated_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ items: (data ?? []).map(toKnowledgeItem) });
  }

  if (req.method === 'POST') {
    const row = fromKnowledgeItemBody(req.body);
    const { data, error } = await supabase.schema('knowledge_engine').from('items').insert(row).select('*').single();
    if (error) {
      if (isSlugConflict(error)) return res.status(409).json({ error: 'This slug is already in use by another knowledge asset.' });
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json({ item: toKnowledgeItem(data) });
  }

  if (req.method === 'PATCH') {
    const { id } = req.body ?? {};
    if (!id) return res.status(400).json({ error: 'id is required.' });

    const row = fromKnowledgeItemBody(req.body);
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase.schema('knowledge_engine').from('items').update(row).eq('id', id).select('*').maybeSingle();
    if (error) {
      if (isSlugConflict(error)) return res.status(409).json({ error: 'This slug is already in use by another knowledge asset.' });
      return res.status(500).json({ error: error.message });
    }
    if (!data) return res.status(404).json({ error: 'Knowledge item not found.' });
    return res.json({ item: toKnowledgeItem(data) });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id is required.' });
    const { error } = await supabase.schema('knowledge_engine').from('items').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
