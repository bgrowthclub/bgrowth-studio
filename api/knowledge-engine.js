import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
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
 * Gated by requireAdmin() (portal.studio_admins, migration 0022), like
 * every other privileged Studio endpoint.
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
    // Release flow (Portal migration 0054) — read-only for the editor.
    reviewedBy: row.reviewed_by ?? null,
    approvedBy: row.approved_by ?? null,
    scheduledAt: row.scheduled_publish_at ?? null,
    publishedAt: row.published_at ?? null,
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
    // Who reads it on the site: 'everyone', 'members' (default, Portal
    // migration 0055) or 'plan:<slug>' — members on that plan or a higher one
    // (Website Plans, Portal migration 0060).
    access:
      publishing.access === 'everyone'
        ? 'everyone'
        : typeof publishing.access === 'string' && /^plan:[a-z0-9]+(-[a-z0-9]+)*$/.test(publishing.access)
          ? publishing.access
          : 'members',
  };
  return row;
}

const REVIEW_STAGES = new Set(['Draft', 'In Review', 'Approved']);

function missingForReview(row) {
  const missing = [];
  if (!String(row.title ?? '').trim()) missing.push('title');
  if (!String(row.slug ?? '').trim()) missing.push('slug');
  if (!String(row.excerpt ?? '').trim()) missing.push('excerpt');
  if (!row.featured_image) missing.push('featured image');
  if (!Array.isArray(row.blocks) || row.blocks.length === 0) missing.push('content');
  return missing;
}

/**
 * Release flow (Portal migration 0054), same steps as products:
 *   Draft → In Review ("reviewed") → Approved → Scheduled → Published
 *   POST ?release=1 { id, action:'stage', stage:'Draft'|'In Review'|'Approved' }
 *   POST ?release=1 { id, action:'schedule', at: ISO | null }   (approved only)
 *   POST ?release=1 { id, action:'publish-now' }                 (approved only)
 *   POST ?release=1 { id, action:'unpublish' }                   (published → Archived)
 * The Website's daily job publishes scheduled articles
 * (portal.publish_scheduled_knowledge()).
 */
async function handleRelease(req, res, supabase, admin) {
  const body = req.body ?? {};
  const id = String(body.id ?? '');
  if (!id) return res.status(400).json({ error: 'id is required.' });
  const items = () => supabase.schema('knowledge_engine').from('items');
  const { data: row, error } = await items().select('*').eq('id', id).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!row) return res.status(404).json({ error: 'Knowledge item not found.' });

  const now = new Date().toISOString();
  const approved = row.status === 'Approved' || row.status === 'Scheduled';
  let patch;

  if (body.action === 'stage') {
    const stage = String(body.stage ?? '');
    if (!REVIEW_STAGES.has(stage)) return res.status(400).json({ error: 'Unknown stage.' });
    if (row.status === 'Published') return res.status(409).json({ error: 'Unpublish it first.' });
    if (stage === 'In Review') {
      const missing = missingForReview(row);
      if (missing.length) return res.status(422).json({ error: `Missing: ${missing.join(', ')}.` });
      patch = { status: stage, reviewed_by: admin.email, reviewed_at: now, approved_by: null, approved_at: null, scheduled_publish_at: null };
    } else if (stage === 'Approved') {
      if (row.status !== 'In Review') return res.status(409).json({ error: 'Mark it as reviewed first.' });
      patch = { status: stage, approved_by: admin.email, approved_at: now };
    } else {
      patch = { status: 'Draft', reviewed_by: null, reviewed_at: null, approved_by: null, approved_at: null, scheduled_publish_at: null };
    }
  } else if (body.action === 'schedule') {
    if (!approved) return res.status(409).json({ error: 'Only approved articles can be scheduled.' });
    let at = null;
    if (body.at) {
      const d = new Date(String(body.at));
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Pick a valid date.' });
      at = d.toISOString();
    }
    patch = { status: at ? 'Scheduled' : 'Approved', scheduled_publish_at: at };
  } else if (body.action === 'publish-now') {
    if (!approved) return res.status(409).json({ error: 'Approve it before publishing.' });
    patch = { status: 'Published', published_at: now, scheduled_publish_at: null };
  } else if (body.action === 'unpublish') {
    if (row.status !== 'Published') return res.status(409).json({ error: 'It is not published.' });
    patch = { status: 'Archived' };
  } else {
    return res.status(400).json({ error: 'Unknown action.' });
  }

  patch.updated_at = now;
  const { data, error: updateError } = await items().update(patch).eq('id', id).select('*').single();
  if (updateError) {
    if (/column/i.test(updateError.message)) return res.status(500).json({ error: 'Run the database update (Portal migration 0054) first.' });
    return res.status(500).json({ error: updateError.message });
  }
  return res.json({ item: toKnowledgeItem(data) });
}

/**
 * Old links check (Studio Sprint 108): lists every place an article or a
 * product still points at the old Wix site — an image on Wix's servers
 * (wixstatic.com) or a link to benterprises.biz/wix.com — so the team fixes
 * them by hand while reviewing. Read-only.
 *   GET ?check=old-links → { found: [{ kind, id, title, status, where, url }] }
 * A product's metadata.wix (where it came from) is not counted.
 */
const OLD_HOSTS = /https?:\/\/[^\s"'<>)]*(?:wixstatic\.com|benterprises\.biz|wix\.com|wixsite\.com)[^\s"'<>)]*/gi;

function oldLinksIn(value, where, out) {
  if (typeof value === 'string') {
    for (const m of value.matchAll(OLD_HOSTS)) out.push({ where, url: m[0] });
  } else if (Array.isArray(value)) {
    value.forEach((v) => oldLinksIn(v, where, out));
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) oldLinksIn(v, where, out);
  }
}

async function handleOldLinks(res, supabase) {
  const found = [];
  const { data: items, error } = await supabase
    .schema('knowledge_engine')
    .from('items')
    .select('id, title, status, featured_image, excerpt, seo, blocks, attachments')
    .order('title');
  if (error) return res.status(500).json({ error: error.message });
  for (const it of items ?? []) {
    const hits = [];
    oldLinksIn(it.featured_image, 'Cover image', hits);
    oldLinksIn(it.excerpt, 'Excerpt', hits);
    oldLinksIn(it.seo, 'SEO / share image', hits);
    (it.blocks ?? []).forEach((b, i) => oldLinksIn(b?.data, `Content — block ${i + 1} (${b?.type ?? 'block'})`, hits));
    oldLinksIn(it.attachments, 'Attachments', hits);
    hits.forEach((h) => found.push({ kind: 'article', id: it.id, title: it.title || '(untitled)', status: it.status ?? '', ...h }));
  }
  const { data: products, error: pError } = await supabase
    .schema('portal')
    .from('products')
    .select('id, name, content_type, status, short_description, description, cover_image_url, gallery, content, metadata')
    .order('name');
  if (pError) return res.status(500).json({ error: pError.message });
  for (const p of products ?? []) {
    const hits = [];
    oldLinksIn(p.cover_image_url, 'Cover image', hits);
    oldLinksIn(p.short_description, 'Short description', hits);
    oldLinksIn(p.description, 'Description', hits);
    oldLinksIn(p.gallery, 'Gallery', hits);
    oldLinksIn(p.content, 'Content', hits);
    const { wix: _wix, ...meta } = p.metadata ?? {};
    oldLinksIn(meta, 'Details', hits);
    hits.forEach((h) => found.push({ kind: p.content_type === 'pdf' ? 'download' : p.content_type || 'product', id: p.id, title: p.name || '(untitled)', status: p.status ?? '', ...h }));
  }
  return res.json({ found });
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
  const admin = await requireAdmin(req);
  if (!admin) return res.status(401).json({ ok: false, error: 'Sign in to BGrowth Studio with an admin account.' });

  const supabase = getSupabaseAdmin();

  if (req.method === 'POST' && req.query.release) return handleRelease(req, res, supabase, admin);

  if (req.method === 'GET' && req.query.check === 'old-links') return handleOldLinks(res, supabase);

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
    // A new article always starts as a Draft — the stage only changes through the release flow.
    row.status = 'Draft';
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
    // Saving never changes the stage (release flow above).
    delete row.status;
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
