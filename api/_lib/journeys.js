/**
 * Journeys (Portal migration 0066) — Studio's server side, served through
 * api/access-management.js (`?resource=journeys`, no new function). Every
 * call already passed requireAdmin().
 *
 * A Journey is a portal.products row with content_type 'journey', shown only
 * on the BGrowth Website. Any number of Journeys can exist: each one is its
 * own product (id, slug, status, category, cover) and its stages/actions live
 * in its `content`. Nothing here knows about a particular Journey.
 *
 *   GET                 → { journeys: [...] }           every Journey, drafts included
 *   GET ?id=<uuid>      → { journey, check }            one Journey + its review check
 *   GET ?resources=1    → { products: [...], articles: [...] }
 *                          what an action can point to, with the REAL status
 *
 * Status of a referenced resource — the same rule the database uses when the
 * Website reads a Journey (portal.journey_resolve_action):
 *   published product / published public article          → 'available'
 *   draft, ready_for_review, approved / unpublished article → 'coming_soon'
 *   archived, private, missing, or a type a Journey can't use → 'unavailable'
 *
 * checkJourney() is what release.js runs before a Journey may move to review,
 * approval or sale. Its structure rules mirror the Portal's publishing
 * schema (bgrowth-portal/src/schemas/journeyContent.schema.ts) — keep both in
 * step.
 */

export const JOURNEY_REF_TYPES = ['workspace', 'calculator', 'pdf', 'bundle'];
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATE_RE = /^[A-Z]{2}$/;
const KINDS = ['product', 'article', 'video', 'link', 'manual'];

function products(supabase) {
  return supabase.schema('portal').from('products');
}

function articles(supabase) {
  return supabase.schema('knowledge_engine').from('items');
}

export function productRefState(row) {
  if (!row || !JOURNEY_REF_TYPES.includes(row.content_type)) return 'unavailable';
  if (row.status === 'published') return 'available';
  if (row.status === 'draft' || row.status === 'ready_for_review' || row.status === 'approved') return 'coming_soon';
  return 'unavailable';
}

export function articleRefState(row) {
  if (!row || !row.slug) return 'unavailable';
  const isPrivate = (row.publishing?.visibility ?? 'Public') === 'Private';
  if (isPrivate || row.status === 'Archived') return 'unavailable';
  return row.status === 'Published' ? 'available' : 'coming_soon';
}

function isHttpsUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('https://') || value.length > 2000) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Structure of a Journey that is ready for review (pure — no database).
 * Returns { errors, warnings }, each an array of { path, message }.
 */
export function checkJourneyStructure(content, product = {}) {
  const errors = [];
  const warnings = [];
  const err = (path, message) => errors.push({ path, message });
  const warn = (path, message) => warnings.push({ path, message });

  if (product.is_free !== true) err('price', 'A Journey must be free for now.');
  if (product.is_trial_eligible === true) err('trial', 'A Journey has no trial.');

  if (!content || typeof content !== 'object') {
    err('content', 'The Journey has no content yet.');
    return { errors, warnings };
  }
  if (content.kind !== 'journey' || content.version !== 1) err('content', 'This is not a Journey (kind/version).');
  if (!text(content.goal)) err('goal', 'Write the goal.');
  else if (text(content.goal).length > 300) err('goal', 'The goal is longer than 300 characters.');
  if (!text(content.notice)) err('notice', 'Write the notice shown on every Journey (general information does not replace state law).');
  else if (text(content.notice).length > 1000) err('notice', 'The notice is longer than 1,000 characters.');
  if (typeof content.intro === 'string' && content.intro.length > 4000) err('intro', 'The introduction is longer than 4,000 characters.');
  if (typeof content.completionMessage === 'string' && content.completionMessage.length > 2000) {
    err('completionMessage', 'The completion message is longer than 2,000 characters.');
  }

  const validated = Array.isArray(content.validatedStates) ? content.validatedStates : [];
  if (content.validatedStates !== undefined && !Array.isArray(content.validatedStates)) err('validatedStates', 'Validated states must be a list.');
  validated.forEach((s, i) => {
    if (!STATE_RE.test(String(s))) err(`validatedStates.${i}`, `"${s}" is not a two-letter state code.`);
  });

  const stages = Array.isArray(content.stages) ? content.stages : [];
  if (stages.length === 0) err('stages', 'Add at least one stage.');
  if (stages.length > 12) err('stages', 'A Journey has at most 12 stages.');

  const stageIds = new Set();
  const actionIds = new Set();
  stages.forEach((stage, s) => {
    const at = `stages.${s}`;
    const name = text(stage?.title) || `Stage ${s + 1}`;
    if (!ID_RE.test(String(stage?.id ?? '')) || String(stage.id).length > 64) err(`${at}.id`, `${name}: invalid id.`);
    else if (stageIds.has(stage.id)) err(`${at}.id`, `${name}: another stage has the same id.`);
    stageIds.add(stage?.id);
    if (!text(stage?.title)) err(`${at}.title`, `Stage ${s + 1}: write a title.`);
    else if (text(stage.title).length > 120) err(`${at}.title`, `${name}: the title is longer than 120 characters.`);
    if (typeof stage?.summary === 'string' && stage.summary.length > 1000) err(`${at}.summary`, `${name}: the summary is longer than 1,000 characters.`);

    const actions = Array.isArray(stage?.actions) ? stage.actions : [];
    if (actions.length === 0) err(`${at}.actions`, `${name}: add at least one action.`);
    if (actions.length > 50) err(`${at}.actions`, `${name}: at most 50 actions.`);

    actions.forEach((action, a) => {
      const ap = `${at}.actions.${a}`;
      const label = `${name} → ${text(action?.title) || `action ${a + 1}`}`;
      if (!ID_RE.test(String(action?.id ?? '')) || String(action.id).length > 64) err(`${ap}.id`, `${label}: invalid id.`);
      else if (actionIds.has(action.id)) err(`${ap}.id`, `${label}: another action has the same id.`);
      actionIds.add(action?.id);
      if (!text(action?.title)) err(`${ap}.title`, `${label}: write a title.`);
      else if (text(action.title).length > 160) err(`${ap}.title`, `${label}: the title is longer than 160 characters.`);
      if (typeof action?.instructions === 'string' && action.instructions.length > 4000) {
        err(`${ap}.instructions`, `${label}: the instructions are longer than 4,000 characters.`);
      }
      if (!KINDS.includes(action?.kind)) {
        err(`${ap}.kind`, `${label}: choose what the action is (product, article, video, link or task).`);
        return;
      }
      if (action.kind === 'product' && !UUID_RE.test(String(action.productId ?? ''))) err(`${ap}.productId`, `${label}: choose a product.`);
      if (action.kind === 'article' && (!text(action.articleSlug) || text(action.articleSlug).length > 200)) {
        err(`${ap}.articleSlug`, `${label}: choose an article.`);
      }
      if ((action.kind === 'video' || action.kind === 'link') && !isHttpsUrl(action.url)) {
        err(`${ap}.url`, `${label}: the address must start with https://.`);
      }
      if (action.whenUnavailable !== undefined && action.whenUnavailable !== 'coming_soon' && action.whenUnavailable !== 'hide') {
        err(`${ap}.whenUnavailable`, `${label}: unknown setting for when the resource isn't published.`);
      }
      if (action.states !== undefined) {
        if (!Array.isArray(action.states)) err(`${ap}.states`, `${label}: states must be a list.`);
        else {
          action.states.forEach((st) => {
            if (!STATE_RE.test(String(st))) err(`${ap}.states`, `${label}: "${st}" is not a two-letter state code.`);
          });
          const unchecked = action.states.filter((st) => STATE_RE.test(String(st)) && !validated.includes(st));
          if (unchecked.length && unchecked.length === action.states.length) {
            warn(`${ap}.states`, `${label}: hidden from members until ${unchecked.join(', ')} is marked as validated.`);
          }
        }
      }
    });
  });

  return { errors, warnings };
}

/** The products and articles a Journey's actions point to, read with their real status. */
export async function loadJourneyRefs(supabase, content) {
  const stages = Array.isArray(content?.stages) ? content.stages : [];
  const all = stages.flatMap((s) => (Array.isArray(s?.actions) ? s.actions : []));
  const productIds = [...new Set(all.filter((a) => a?.kind === 'product' && UUID_RE.test(String(a.productId ?? ''))).map((a) => a.productId))];
  const slugs = [...new Set(all.filter((a) => a?.kind === 'article' && text(a.articleSlug)).map((a) => text(a.articleSlug)))];
  const [p, k] = await Promise.all([
    productIds.length
      ? products(supabase).select('id, name, slug, content_type, status').in('id', productIds)
      : { data: [], error: null },
    slugs.length ? articles(supabase).select('slug, title, status, publishing').in('slug', slugs) : { data: [], error: null },
  ]);
  if (p.error) throw p.error;
  if (k.error) throw k.error;
  return {
    products: new Map((p.data ?? []).map((r) => [r.id, r])),
    articles: new Map((k.data ?? []).map((r) => [r.slug, r])),
  };
}

/**
 * Checks each reference against what really exists (pure, given the refs).
 * Missing / archived / wrong type → error (it would never be usable).
 * Not published yet → warning: members see "Coming soon" (or nothing, if the
 * action is set to hide), never a purchase button.
 */
export function checkJourneyRefs(content, refs) {
  const errors = [];
  const warnings = [];
  const resolved = [];
  const stages = Array.isArray(content?.stages) ? content.stages : [];
  let visibleNow = 0;
  stages.forEach((stage, s) => {
    const name = text(stage?.title) || `Stage ${s + 1}`;
    (Array.isArray(stage?.actions) ? stage.actions : []).forEach((action, a) => {
      const path = `stages.${s}.actions.${a}`;
      const label = `${name} → ${text(action?.title) || `action ${a + 1}`}`;
      let state = 'available';
      let resource = null;
      if (action?.kind === 'product') {
        const row = refs.products.get(action.productId);
        state = productRefState(row);
        resource = row ? { name: row.name, slug: row.slug, contentType: row.content_type, status: row.status } : null;
        if (!row) errors.push({ path, message: `${label}: the product no longer exists.` });
        else if (!JOURNEY_REF_TYPES.includes(row.content_type)) errors.push({ path, message: `${label}: "${row.name}" can't be used in a Journey.` });
        else if (state === 'unavailable') errors.push({ path, message: `${label}: "${row.name}" is archived.` });
      } else if (action?.kind === 'article') {
        const row = refs.articles.get(text(action.articleSlug));
        state = articleRefState(row);
        resource = row ? { title: row.title, slug: row.slug, status: row.status } : null;
        if (!row) errors.push({ path, message: `${label}: the article no longer exists.` });
        else if (state === 'unavailable') errors.push({ path, message: `${label}: "${row.title}" is private or archived.` });
      }
      if (state === 'coming_soon') {
        warnings.push({
          path,
          message:
            action.whenUnavailable === 'hide'
              ? `${label}: hidden from members until it is published.`
              : `${label}: shown as "Coming soon" until it is published.`,
        });
      }
      if (state === 'available') visibleNow += 1;
      resolved.push({ stageId: stage?.id, actionId: action?.id, kind: action?.kind, state, resource });
    });
  });
  if (stages.length && visibleNow === 0) {
    warnings.push({ path: 'stages', message: 'No action is available to members yet — everything is still unpublished.' });
  }
  return { errors, warnings, resolved };
}

/** Everything that must hold before a Journey moves to review, approval or sale. */
export async function checkJourney(supabase, product) {
  const structure = checkJourneyStructure(product.content, product);
  const refs = await loadJourneyRefs(supabase, product.content);
  const references = checkJourneyRefs(product.content, refs);
  const errors = [...structure.errors, ...references.errors];
  return {
    ready: errors.length === 0,
    errors,
    warnings: [...structure.warnings, ...references.warnings],
    resolved: references.resolved,
  };
}

const LIST_COLUMNS =
  'id, studio_product_id, name, slug, short_description, status, is_free, is_trial_eligible, cover_image_url, category_id, last_published_at, created_at';

async function listJourneys(res, supabase) {
  const { data, error } = await products(supabase).select(`${LIST_COLUMNS}, content`).eq('content_type', 'journey').order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const ids = rows.map((r) => r.id);
  // Release flow columns (migration 0051).
  const { data: release } = ids.length
    ? await products(supabase).select('id, scheduled_publish_at, reviewed_by, approved_by').in('id', ids)
    : { data: [] };
  const releaseOf = new Map((release ?? []).map((r) => [r.id, r]));
  const journeys = rows.map(({ content, ...row }) => {
    const stages = Array.isArray(content?.stages) ? content.stages : [];
    return {
      ...row,
      ...(releaseOf.get(row.id) ?? {}),
      stageCount: stages.length,
      actionCount: stages.reduce((n, s) => n + (Array.isArray(s?.actions) ? s.actions.length : 0), 0),
    };
  });
  return res.json({ journeys });
}

async function getJourney(res, supabase, id) {
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid Journey id.' });
  const { data, error } = await products(supabase)
    .select(`${LIST_COLUMNS}, content, metadata`)
    .eq('id', id)
    .eq('content_type', 'journey')
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Journey not found.' });
  const { data: release } = await products(supabase).select('scheduled_publish_at, reviewed_by, approved_by').eq('id', id).maybeSingle();
  return res.json({ journey: { ...data, ...(release ?? {}) }, check: await checkJourney(supabase, data) });
}

// What an action can point to. Drafts are included on purpose — the builder
// shows their real status ("Coming soon" for members) — and nothing here is
// changed: Wix-imported drafts stay exactly as they are.
async function listResources(res, supabase) {
  const [p, k] = await Promise.all([
    products(supabase)
      .select('id, name, slug, content_type, status, is_free, price_cents, cover_image_url, category_id')
      .in('content_type', JOURNEY_REF_TYPES)
      .order('name', { ascending: true }),
    articles(supabase).select('slug, title, status, language, category, publishing').neq('slug', '').order('title', { ascending: true }),
  ]);
  if (p.error) throw p.error;
  if (k.error) throw k.error;
  return res.json({
    products: (p.data ?? []).map((r) => ({ ...r, state: productRefState(r) })),
    articles: (k.data ?? []).map(({ publishing, ...r }) => ({
      ...r,
      access: publishing?.access ?? 'members',
      visibility: publishing?.visibility ?? 'Public',
      state: articleRefState({ ...r, publishing }),
    })),
  });
}

export async function handleJourneys(req, res, supabase) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (req.query.resources) return listResources(res, supabase);
  if (req.query.id) return getJourney(res, supabase, String(req.query.id));
  return listJourneys(res, supabase);
}
