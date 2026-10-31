/**
 * BGrowth Academy™ courses — Studio's server side, served through
 * api/access-management.js (`?resource=courses`, no new function, like
 * Journeys). Every call already passed requireAdmin().
 *
 * A course is a portal.products row with content_type 'course' (an accepted
 * type since Portal migration 0068), so it is a product like any other: it
 * inherits price, free/paid, bundles, plan inclusion, coupons, reviews and
 * the release flow, and the rule that serves `content` only to a member who
 * owns it. Its modules and lessons live in `content`.
 *
 *   GET                 → { courses: [...] }   every course, drafts included
 *   GET ?id=<uuid>      → { course, check }    one course + its review check
 *
 * checkCourse() is what release.js runs before a course may move to review,
 * approval or sale. Its rules mirror the Portal's publishing schema
 * (bgrowth-portal/src/schemas/courseContent.schema.ts) — keep both in step.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const BLOCK_TYPES = ['text', 'image', 'video', 'file', 'link', 'product'];
const MAX_LESSON_MINUTES = 1440;
const MAX_OUTCOMES = 10;

function products(supabase) {
  return supabase.schema('portal').from('products');
}

/** Minutes of a list of lessons; 0 when nobody filled them in. */
export function lessonMinutes(lessons) {
  return (lessons ?? []).reduce((sum, l) => {
    const m = Number(l?.minutes);
    return sum + (Number.isFinite(m) && m > 0 ? Math.min(Math.floor(m), MAX_LESSON_MINUTES) : 0);
  }, 0);
}

function allLessons(content) {
  return (Array.isArray(content?.modules) ? content.modules : []).flatMap((m) => (Array.isArray(m?.lessons) ? m.lessons : []));
}

/**
 * Everything that would stop this course from being published, in the words
 * the person in the Studio needs. Structure only — it never decides price or
 * who may read it.
 */
export function checkCourse(row) {
  const problems = [];
  const warnings = [];
  const content = row?.content ?? {};
  const modules = Array.isArray(content.modules) ? content.modules : [];

  if (!row?.name?.trim()) problems.push('The course has no name.');
  if (!row?.slug?.trim()) problems.push('The course has no address.');
  if (!row?.short_description?.trim()) problems.push('The course has no short description.');
  if (content.kind !== 'course' || content.version !== 1) problems.push('The content isn’t a course (kind/version).');
  if (!modules.length) problems.push('The course has no module.');
  if (modules.length > 60) problems.push('A course takes at most 60 modules.');
  if (Array.isArray(content.outcomes) && content.outcomes.length > MAX_OUTCOMES)
    problems.push(`A course lists at most ${MAX_OUTCOMES} outcomes.`);

  // Ids are how a student's progress is kept (workspace_instances, data.kind
  // 'course'), so a repeated one would make two lessons share one tick.
  const moduleIds = new Set();
  const lessonIds = new Set();

  modules.forEach((module, mi) => {
    const where = `Module ${mi + 1}`;
    if (!ID_RE.test(String(module?.id ?? ''))) problems.push(`${where}: the id uses letters, numbers, dashes and underscores.`);
    else if (moduleIds.has(module.id)) problems.push(`${where}: two modules share the id “${module.id}”.`);
    moduleIds.add(module?.id);
    if (!String(module?.title ?? '').trim()) problems.push(`${where}: no title.`);

    const lessons = Array.isArray(module?.lessons) ? module.lessons : [];
    if (!lessons.length) problems.push(`${where}: no lesson.`);

    lessons.forEach((lesson, li) => {
      const at = `${where}, lesson ${li + 1}`;
      if (!ID_RE.test(String(lesson?.id ?? ''))) problems.push(`${at}: the id uses letters, numbers, dashes and underscores.`);
      else if (lessonIds.has(lesson.id))
        problems.push(`${at}: two lessons share the id “${lesson.id}” — progress is kept per lesson id.`);
      lessonIds.add(lesson?.id);
      if (!String(lesson?.title ?? '').trim()) problems.push(`${at}: no title.`);

      const minutes = lesson?.minutes;
      if (minutes !== undefined && (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_LESSON_MINUTES))
        problems.push(`${at}: the time has to be a whole number of minutes, from 1 to ${MAX_LESSON_MINUTES}.`);

      const blocks = Array.isArray(lesson?.blocks) ? lesson.blocks : [];
      if (!blocks.length) warnings.push(`${at} (“${lesson?.title ?? ''}”) has no content yet.`);
      blocks.forEach((block, bi) => {
        const atBlock = `${at}, block ${bi + 1}`;
        if (!BLOCK_TYPES.includes(block?.type)) {
          problems.push(`${atBlock}: unknown type “${block?.type ?? ''}”.`);
          return;
        }
        if (block.type === 'text' && !String(block.body ?? '').trim()) problems.push(`${atBlock}: the text is empty.`);
        if (['image', 'video', 'file', 'link'].includes(block.type)) {
          const url = String(block.url ?? '').trim();
          if (!url) problems.push(`${atBlock}: no address.`);
          else if (!url.startsWith('https://')) problems.push(`${atBlock}: the address has to start with https://.`);
        }
        if (block.type === 'product' && !SLUG_RE.test(String(block.slug ?? '')))
          problems.push(`${atBlock}: use the product's address (lower-case letters, numbers and dashes).`);
      });
    });
  });

  const lessons = allLessons(content);
  if (lessons.length && !lessons.some((l) => Number(l?.minutes) > 0))
    warnings.push('No lesson has a time, so the course won’t show how long it takes.');

  return { ok: problems.length === 0, problems, warnings, moduleCount: modules.length, lessonCount: lessons.length, minutes: lessonMinutes(lessons) };
}

const LIST_COLUMNS =
  'id, studio_product_id, name, slug, short_description, status, is_free, price_cents, currency, is_trial_eligible, cover_image_url, category_id, last_published_at, created_at';

async function listCourses(res, supabase) {
  const { data, error } = await products(supabase)
    .select(`${LIST_COLUMNS}, content`)
    .eq('content_type', 'course')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const ids = rows.map((r) => r.id);
  // Release flow columns (migration 0051).
  const { data: release } = ids.length
    ? await products(supabase).select('id, scheduled_publish_at, reviewed_by, approved_by').in('id', ids)
    : { data: [] };
  const releaseOf = new Map((release ?? []).map((r) => [r.id, r]));
  const courses = rows.map(({ content, ...row }) => {
    const modules = Array.isArray(content?.modules) ? content.modules : [];
    const lessons = allLessons(content);
    return {
      ...row,
      ...(releaseOf.get(row.id) ?? {}),
      moduleCount: modules.length,
      lessonCount: lessons.length,
      minutes: lessonMinutes(lessons),
    };
  });
  return res.json({ courses });
}

async function getCourse(res, supabase, id) {
  if (!UUID_RE.test(id)) return res.status(400).json({ error: 'Invalid course id.' });
  const { data, error } = await products(supabase)
    .select(`${LIST_COLUMNS}, content, metadata`)
    .eq('id', id)
    .eq('content_type', 'course')
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Course not found.' });
  const { data: release } = await products(supabase)
    .select('scheduled_publish_at, reviewed_by, approved_by')
    .eq('id', id)
    .maybeSingle();
  return res.json({ course: { ...data, ...(release ?? {}) }, check: checkCourse(data) });
}

export async function handleCourses(req, res, supabase) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (req.query.id) return getCourse(res, supabase, String(req.query.id));
  return listCourses(res, supabase);
}
