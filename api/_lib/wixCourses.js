/**
 * BGrowth Academy™ — bringing the Wix Online Programs across (02/11/2026),
 * served through api/access-management.js (`?resource=wix-courses`). Every
 * call already passed requireAdmin().
 *
 *   GET                  → { ok, programs: [...] }  every Wix program, with
 *                          whether it is already here
 *   POST { programId }   → { ok, course: {...} }    one program converted to
 *                          our course shape, ready to be saved as a draft
 *
 * ONE PROGRAM PER CALL, on purpose: a course is ~10 sections, ~30 article
 * steps of up to 22,000 characters each and ~10 quizzes. Reading all 72 in
 * one request would blow the function's time limit and return megabytes;
 * the Studio drives the loop and shows progress, the way the Downloads
 * import already does.
 *
 * This does NOT write anything. It returns a course in the shape the Studio
 * already saves (saveCourseDraft → the Portal's publishing endpoint), so the
 * draft goes through exactly the same door as a hand-written course — no
 * second way into the catalog.
 *
 * Credentials: WIX_API_KEY and WIX_SITE_ID, read from the environment. A
 * site-level Wix call with an API key needs `Authorization` and the
 * `wix-site-id` header; nothing else.
 */

const WIX = 'https://www.wixapis.com';
const MAX_LESSON_BLOCKS = 60;

function wixHeaders() {
  const key = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;
  if (!key || !siteId) {
    const err = new Error(
      'The Wix connection is not set up yet: add WIX_API_KEY and WIX_SITE_ID to this project and redeploy.',
    );
    err.statusCode = 503;
    throw err;
  }
  return { Authorization: key, 'wix-site-id': siteId, 'Content-Type': 'application/json' };
}

async function wixCall(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${WIX}${path}`, {
    method,
    headers: wixHeaders(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(
      res.status === 401 || res.status === 403
        ? 'Wix refused the key: check that WIX_API_KEY is valid and has permission to manage Online Programs on this site.'
        : `Wix answered ${res.status}: ${text.slice(0, 200)}`,
    );
    err.statusCode = 502;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Wix returned something that isn't JSON for ${path}.`);
  }
}

/* ------------------------------------------------------------------ ids */

let seq = 0;
function newId(prefix) {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`;
}

/**
 * A Wix id is a UUID, which our ids accept (letters, numbers and dashes).
 * Reusing it is deliberate: progress is kept per lesson and question id, so
 * importing the same course twice keeps a student exactly where they were.
 */
const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
function keepId(value, prefix) {
  const id = String(value ?? '');
  return ID_RE.test(id) ? id.slice(0, 64) : newId(prefix);
}

function slugFrom(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* -------------------------------------------------------------- content */

/**
 * Wix stores a step's content as Ricos rich text. We keep the words, the
 * images and the videos, and let go of the styling — our lesson has text,
 * image and video blocks and nothing else, and inventing a block type to
 * carry Wix's formatting would be a second content model (CLAUDE.md §8).
 */
function ricosToBlocks(details) {
  if (!details) return [];
  let doc;
  try {
    doc = typeof details === 'string' ? JSON.parse(details) : details;
  } catch {
    // Plain text, which the Steps API also accepts.
    const text = String(details).trim();
    return text ? [{ type: 'text', body: text }] : [];
  }

  const blocks = [];
  let paragraph = [];
  const flush = () => {
    const body = paragraph.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (body) blocks.push({ type: 'text', body });
    paragraph = [];
  };

  const textOf = (node) => {
    if (!node) return '';
    if (node.textData && typeof node.textData.text === 'string') return node.textData.text;
    return (node.nodes ?? []).map(textOf).join('');
  };

  const walk = (nodes, listPrefix) => {
    for (const node of nodes ?? []) {
      const type = node?.type;
      if (type === 'PARAGRAPH') {
        const line = textOf(node).trim();
        if (line) paragraph.push(listPrefix ? `${listPrefix} ${line}` : line);
        else paragraph.push('');
      } else if (type === 'HEADING') {
        const line = textOf(node).trim();
        // No heading block exists, so a heading becomes its own line with a
        // blank line before it — it still reads as a heading.
        if (line) paragraph.push(paragraph.length ? `\n${line}` : line);
      } else if (type === 'BULLETED_LIST' || type === 'ORDERED_LIST') {
        const ordered = type === 'ORDERED_LIST';
        (node.nodes ?? []).forEach((item, i) => walk(item.nodes ?? [item], ordered ? `${i + 1}.` : '•'));
      } else if (type === 'LIST_ITEM') {
        walk(node.nodes, listPrefix ?? '•');
      } else if (type === 'BLOCKQUOTE' || type === 'COLLAPSIBLE_LIST' || type === 'TABLE' || type === 'TABLE_ROW' || type === 'TABLE_CELL' || type === 'COLLAPSIBLE_ITEM' || type === 'COLLAPSIBLE_ITEM_TITLE' || type === 'COLLAPSIBLE_ITEM_BODY') {
        walk(node.nodes, listPrefix);
      } else if (type === 'IMAGE') {
        const src = node.imageData?.image?.src;
        const url = imageUrl(src);
        if (url) {
          flush();
          blocks.push({
            type: 'image',
            url,
            ...(node.imageData?.altText ? { alt: String(node.imageData.altText).slice(0, 300) } : {}),
            ...(node.imageData?.caption ? { caption: String(node.imageData.caption).slice(0, 300) } : {}),
          });
        }
      } else if (type === 'VIDEO') {
        const url = node.videoData?.video?.src?.url;
        if (typeof url === 'string' && url.startsWith('https://')) {
          flush();
          blocks.push({ type: 'video', url });
        }
      } else if (type === 'FILE') {
        // A file attached to the lesson. We have a file block, so it carries
        // over as the download it was rather than disappearing.
        const data = node.fileData ?? {};
        const url = fileUrl(data.src);
        if (url) {
          flush();
          blocks.push({
            type: 'file',
            url,
            ...(data.name ? { label: String(data.name).slice(0, 200) } : {}),
          });
        }
      } else if (type === 'DIVIDER') {
        flush();
      } else if (node?.nodes) {
        walk(node.nodes, listPrefix);
      }
    }
  };

  walk(doc.nodes, null);
  flush();
  return blocks.slice(0, MAX_LESSON_BLOCKS);
}

/** A Ricos file is an id in Wix's media store, or a plain address. */
function fileUrl(src) {
  if (!src) return null;
  if (typeof src === 'string') return src.startsWith('https://') ? src : `https://static.wixstatic.com/media/${src}`;
  if (typeof src.url === 'string' && src.url.startsWith('https://')) return src.url;
  if (typeof src.id === 'string' && src.id) return `https://static.wixstatic.com/media/${src.id}`;
  return null;
}

/** A Ricos image is an id or a wixstatic address; both become an address. */
function imageUrl(src) {
  if (!src) return null;
  if (typeof src === 'string') {
    if (src.startsWith('https://')) return src;
    return `https://static.wixstatic.com/media/${src}`;
  }
  if (typeof src.url === 'string' && src.url.startsWith('https://')) return src.url;
  if (typeof src.id === 'string' && src.id) return `https://static.wixstatic.com/media/${src.id}`;
  return null;
}

/* ---------------------------------------------------------------- quiz */

/**
 * A Wix quiz field becomes one of our questions.
 *
 * Wix keeps its options as plain strings and names the right one by its
 * TEXT, so the option ids are ours; matching is by text, and an answer that
 * matches nothing is left unset rather than guessed.
 *
 * `shortText` and `numeric` carry NO answer key in Wix — the field is empty.
 * They come across as typed questions with nothing accepted yet: kept so the
 * answer can be written here later, never shown to a student until it is.
 */
function quizFieldToQuestion(field) {
  const base = {
    id: keepId(field?.id, 'q'),
    prompt: String(field?.question ?? '').trim().slice(0, 1000),
  };
  if (!base.prompt) return null;

  const single = field?.singleChoice;
  const multi = field?.multiChoice;

  if (single || multi) {
    const raw = (single ?? multi).options ?? [];
    const options = raw
      .map((text) => ({ id: newId('o'), text: String(text ?? '').trim().slice(0, 300) }))
      .filter((o) => o.text)
      .slice(0, 8);
    if (options.length < 2) return null;

    const idOf = (text) => {
      const wanted = String(text ?? '').trim().toLowerCase();
      return options.find((o) => o.text.trim().toLowerCase() === wanted)?.id ?? null;
    };

    if (single) {
      const answer = idOf(single.rightAnswer);
      // No usable key: keep the question as a typed one so it isn't lost,
      // rather than publishing a choice question that marks nothing.
      if (!answer) return { ...base, kind: 'typed', accept: [] };
      return { ...base, options, answer };
    }

    const answers = (multi.rightAnswer ?? []).map(idOf).filter(Boolean);
    if (!answers.length || answers.length >= options.length) return { ...base, kind: 'typed', accept: [] };
    return { ...base, kind: 'multi', options, answers };
  }

  // shortText, numeric, or a kind Wix adds later: a typed question with no
  // answer written yet.
  return { ...base, kind: 'typed', accept: [] };
}

/**
 * How long a lesson takes, estimated from what is in it. 200 words a minute
 * is ordinary adult reading speed; the rest are small allowances. A video
 * counts as nothing — its length is the one thing we cannot know from here,
 * and guessing it would make the total a fiction.
 *
 * THE SAME RULE IS COPIED in src/modules/academy/model.ts
 * (estimateLessonMinutes) — a function must not import from src/. Change
 * both.
 */
function estimateLessonMinutes(blocks) {
  let seconds = 0;
  for (const block of blocks ?? []) {
    if (block.type === 'text') {
      const words = String(block.body ?? '').trim().split(/\s+/).filter(Boolean).length;
      seconds += (words / 200) * 60;
    } else if (block.type === 'quiz') {
      seconds += (block.questions ?? []).length * 20;
    } else if (block.type === 'image') {
      seconds += 10;
    } else if (block.type === 'file' || block.type === 'link' || block.type === 'product') {
      seconds += 15;
    }
  }
  if (seconds <= 0) return 0;
  return Math.min(1440, Math.max(1, Math.round(seconds / 60)));
}

/* -------------------------------------------------------------- reading */

async function listPrograms() {
  const programs = [];
  for (let offset = 0; offset < 500; offset += 50) {
    const res = await wixCall('/online-programs/v3/programs/query', {
      method: 'POST',
      body: { query: { paging: { limit: 50, offset } } },
    });
    const page = res.programs ?? [];
    programs.push(...page);
    if (page.length < 50) break;
  }
  return programs;
}

async function readProgram(programId) {
  const program = (await wixCall(`/online-programs/v3/programs/${programId}`)).program;
  if (!program) throw new Error('That program is not on this Wix site.');

  const { sections = [] } = await wixCall(`/online-programs/v3/sections?programId=${programId}`);

  const modules = [];
  let pending = 0;
  let questions = 0;

  for (const section of sections) {
    const res = await wixCall('/online-programs/v3/steps/query', {
      method: 'POST',
      body: {
        query: {
          filter: { sectionId: section.id },
          sort: [{ fieldName: 'ordering', order: 'ASC' }],
          cursorPaging: { limit: 100 },
        },
        descriptionFieldSet: 'EXTENDED',
      },
    });

    const lessons = [];
    for (const step of res.steps ?? []) {
      const title = String(step?.description?.title ?? '').trim().slice(0, 200) || 'Untitled lesson';
      const blocks = ricosToBlocks(step?.description?.details);

      if (step.stepType === 'QUIZ' && step.quizOptions?.id) {
        const { quiz } = await wixCall(`/online-programs/v1/quizzes/${step.quizOptions.id}`);
        const list = (quiz?.fields ?? []).map(quizFieldToQuestion).filter(Boolean).slice(0, 30);
        questions += list.length;
        pending += list.filter((q) => q.kind === 'typed' && !q.accept.length).length;
        if (list.length)
          blocks.push({
            type: 'quiz',
            ...(quiz?.settings?.title ? { title: String(quiz.settings.title).slice(0, 200) } : {}),
            questions: list,
          });
      }

      if (step.stepType === 'VIDEO') {
        const url = step.videoOptions?.wixVideo?.id ? null : step.videoOptions?.url;
        // A video hosted in Wix's own library has no public address we can
        // play, so the lesson says so instead of showing a broken player.
        if (typeof url === 'string' && url.startsWith('https://')) blocks.push({ type: 'video', url });
        else blocks.push({ type: 'text', body: 'This lesson had a video hosted on Wix — add it again here.' });
      }

      // Wix keeps no lesson times, so the import estimates one from the
      // content. The author corrects it in the Studio; the estimate never
      // overwrites a time already there, because an imported lesson has
      // none to overwrite.
      const minutes = estimateLessonMinutes(blocks);
      lessons.push({ id: keepId(step?.id, 'l'), title, ...(minutes ? { minutes } : {}), blocks });
    }

    modules.push({
      id: keepId(section?.id, 'm'),
      title: String(section?.description?.title ?? '').trim().slice(0, 200) || 'Untitled module',
      lessons,
    });
  }

  const name = String(program?.description?.title ?? '').trim().slice(0, 200);
  const details = String(program?.description?.details ?? '').trim();
  const price = program?.price?.value ? Math.round(Number(program.price.value) * 100) : null;

  return {
    wixProgramId: programId,
    wixStatus: program.status,
    name,
    slug: slugFrom(name),
    shortDescription: details.replace(/\s+/g, ' ').slice(0, 300),
    // The cover lives at description.image ({ id, url, width, height }) —
    // there is no `media` wrapper. 67 of the 72 programs have one; the rest
    // need a cover picked here, which the release check already asks for.
    coverImageUrl: imageUrl(program?.description?.image) ?? '',
    isFree: !price,
    priceCents: price,
    currency: 'usd',
    content: {
      kind: 'course',
      version: 1,
      ...(details ? { intro: details.slice(0, 4000) } : {}),
      modules,
    },
    counts: {
      modules: modules.length,
      lessons: modules.reduce((n, m) => n + m.lessons.length, 0),
      questions,
      pendingQuestions: pending,
    },
  };
}

/* --------------------------------------------------------------- routes */

export async function handleWixCourses(req, res, supabase) {
  // The shared handler turns any throw into "Unexpected server error.", which
  // would hide the one thing the person needs to read here: that the Wix
  // connection isn't set up, or exactly what Wix refused.
  try {
    return await route(req, res, supabase);
  } catch (err) {
    const status = err?.statusCode ?? 500;
    const message = status === 500 ? 'Unexpected error while reading Wix.' : String(err?.message ?? 'Wix refused the request.');
    return res.status(status).json({ error: message });
  }
}

async function route(req, res, supabase) {
  if (req.method === 'GET') {
    const programs = await listPrograms();

    // Which ones are already here. The link is studio_product_id
    // (`wix-course-<programId>`), a real column the publishing endpoint
    // keeps — not metadata, which publish_product rewrites.
    const { data: existing } = await supabase
      .schema('portal')
      .from('products')
      .select('id, name, slug, status, studio_product_id')
      .eq('content_type', 'course');
    const byProgram = new Map();
    for (const row of existing ?? []) {
      const key = String(row?.studio_product_id ?? '');
      if (key.startsWith('wix-course-')) byProgram.set(key.slice('wix-course-'.length), row);
    }

    return res.status(200).json({
      ok: true,
      programs: programs.map((p) => {
        const here = byProgram.get(String(p.id));
        return {
          programId: p.id,
          name: p?.description?.title ?? '',
          wixStatus: p.status,
          sections: p?.stepsSummary?.sectionsCount ?? null,
          imported: here ? { id: here.id, slug: here.slug, status: here.status } : null,
        };
      }),
    });
  }

  if (req.method === 'POST') {
    const programId = String(req.body?.programId ?? '').trim();
    if (!programId) return res.status(400).json({ error: 'programId is required.' });
    const course = await readProgram(programId);
    if (!course.name) return res.status(422).json({ error: 'That program has no title in Wix.' });
    return res.status(200).json({ ok: true, course });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}

// Exported for the tests and for anyone reading the conversion rules.
export const __internals = { ricosToBlocks, quizFieldToQuestion, slugFrom, imageUrl, fileUrl, estimateLessonMinutes };
