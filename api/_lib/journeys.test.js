// Journeys server checks (Studio). Run: npm test   (Node's built-in runner,
// no extra dependency). Uses an in-memory stand-in for the Supabase client —
// never a real database.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleRefState, checkJourney, checkJourneyRefs, checkJourneyStructure, handleJourneys, productRefState } from './journeys.js';
import { handleRelease } from './release.js';

// --- a tiny in-memory Supabase client ---------------------------------------
function fakeSupabase(tables) {
  const calls = { updates: [], deletes: [], rpcs: [] };
  function query(table) {
    const filters = [];
    let op = 'select';
    let patch = null;
    let head = false;
    const q = {
      select(_cols, opts) {
        if (opts?.head) head = true;
        return q;
      },
      eq(col, val) {
        filters.push((r) => r[col] === val);
        return q;
      },
      neq(col, val) {
        filters.push((r) => r[col] !== val);
        return q;
      },
      in(col, vals) {
        filters.push((r) => vals.includes(r[col]));
        return q;
      },
      order() {
        return q;
      },
      update(p) {
        op = 'update';
        patch = p;
        return q;
      },
      delete() {
        op = 'delete';
        return q;
      },
      maybeSingle() {
        return run().then((r) => ({ ...r, data: r.data?.[0] ?? null }));
      },
      then(resolve, reject) {
        return run().then(resolve, reject);
      },
    };
    async function run() {
      const rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      if (op === 'update') {
        rows.forEach((r) => Object.assign(r, patch));
        calls.updates.push({ table, patch });
        return { data: null, error: null };
      }
      if (op === 'delete') {
        tables[table] = (tables[table] ?? []).filter((r) => !rows.includes(r));
        calls.deletes.push({ table });
        return { data: null, error: null };
      }
      return { data: head ? null : rows.map((r) => ({ ...r })), error: null, count: rows.length };
    }
    return q;
  }
  const client = {
    schema: () => ({ from: query, rpc: async (name, args) => (calls.rpcs.push({ name, args }), { error: null }) }),
    from: query,
  };
  return { client, calls, tables };
}

function fakeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  return res;
}

// --- fixtures ----------------------------------------------------------------
const P_LIVE = '10000000-0000-0000-0000-000000000001';
const P_DRAFT = '10000000-0000-0000-0000-000000000002';
const P_ARCHIVED = '10000000-0000-0000-0000-000000000003';
const P_JOURNEY = '20000000-0000-0000-0000-000000000009';
const P_GONE = '10000000-0000-0000-0000-0000000000ff';

function db() {
  return {
    products: [
      { id: P_LIVE, name: 'Live Workspace', slug: 'live', content_type: 'workspace', status: 'published' },
      { id: P_DRAFT, name: 'Wix Draft PDF', slug: 'wix-draft', content_type: 'pdf', status: 'draft', metadata: { wix: { id: 'w1' } } },
      { id: P_ARCHIVED, name: 'Old PDF', slug: 'old', content_type: 'pdf', status: 'archived' },
      { id: P_JOURNEY, name: 'Another Journey', slug: 'another', content_type: 'journey', status: 'published' },
    ],
    items: [
      { slug: 'art-live', title: 'Live Article', status: 'Published', publishing: { access: 'everyone' } },
      { slug: 'art-draft', title: 'Draft Article', status: 'Draft', publishing: {} },
      { slug: 'art-private', title: 'Private Article', status: 'Published', publishing: { visibility: 'Private' } },
    ],
    workspace_instances: [],
    licenses: [],
    access_grants: [],
    bundle_items: [],
  };
}

function journey(stages, extra = {}) {
  return { kind: 'journey', version: 1, goal: 'Reach the goal', notice: 'General information only.', validatedStates: [], stages, ...extra };
}

const notary = journey([
  { id: 'discover', title: 'Discover', actions: [{ id: 'd1', title: 'Read', kind: 'article', articleSlug: 'art-live' }] },
  { id: 'qualify', title: 'Qualify', actions: [{ id: 'q1', title: 'Checklist', kind: 'product', productId: P_DRAFT }] },
  { id: 'build', title: 'Build', actions: [{ id: 'b1', title: 'Open', kind: 'product', productId: P_LIVE }] },
  { id: 'launch', title: 'Launch', actions: [{ id: 'l1', title: 'Do it', kind: 'manual' }] },
  { id: 'operate', title: 'Operate', actions: [{ id: 'o1', title: 'Watch', kind: 'video', url: 'https://example.com/v' }] },
]);

const FREE = { is_free: true, is_trial_eligible: false };

// --- structure ---------------------------------------------------------------
test('a complete Journey passes; stage names are free (not the pilot\'s five)', () => {
  assert.equal(checkJourneyStructure(notary, FREE).errors.length, 0);
  const other = journey([
    { id: 'start', title: 'Get started', actions: [{ id: 'x', title: 'Task', kind: 'manual' }] },
    { id: 'money', title: 'Money', actions: [{ id: 'y', title: 'Link', kind: 'link', url: 'https://example.com' }] },
  ]);
  assert.equal(checkJourneyStructure(other, FREE).errors.length, 0);
});

test('incomplete Journeys are refused, each with a reason', () => {
  const cases = [
    ['no content', null],
    ['no goal', { ...notary, goal: ' ' }],
    ['no notice', { ...notary, notice: '' }],
    ['no stages', { ...notary, stages: [] }],
    ['empty stage', journey([{ id: 's', title: 'S', actions: [] }])],
    ['stage without title', journey([{ id: 's', title: '', actions: [{ id: 'a', title: 'A', kind: 'manual' }] }])],
    ['action without title', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: '', kind: 'manual' }] }])],
    ['product without id', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'product' }] }])],
    ['article without slug', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'article' }] }])],
    ['http link', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'link', url: 'http://x.com' }] }])],
    ['javascript link', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'video', url: 'javascript:alert(1)' }] }])],
    ['unknown kind', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'quiz' }] }])],
    ['duplicate stage id', journey([
      { id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'manual' }] },
      { id: 's', title: 'T', actions: [{ id: 'b', title: 'B', kind: 'manual' }] },
    ])],
    ['duplicate action id', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'manual' }, { id: 'a', title: 'B', kind: 'manual' }] }])],
    ['bad id', journey([{ id: 'Has Spaces', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'manual' }] }])],
    ['bad state code', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'manual', states: ['California'] }] }])],
    ['too many stages', journey(Array.from({ length: 13 }, (_, i) => ({ id: `s${i}`, title: 'S', actions: [{ id: `a${i}`, title: 'A', kind: 'manual' }] })))],
  ];
  for (const [name, content] of cases) {
    assert.ok(checkJourneyStructure(content, FREE).errors.length > 0, name);
  }
});

test('a Journey must be free and without trial', () => {
  assert.ok(checkJourneyStructure(notary, { is_free: false }).errors.some((e) => e.path === 'price'));
  assert.ok(checkJourneyStructure(notary, { is_free: true, is_trial_eligible: true }).errors.some((e) => e.path === 'trial'));
});

test('a state-only action warns until that state is validated', () => {
  const c = journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'CA rule', kind: 'manual', states: ['CA'] }] }]);
  const r = checkJourneyStructure(c, FREE);
  assert.equal(r.errors.length, 0);
  const stateWarnings = (w) => w.filter((x) => x.path.endsWith('.states'));
  assert.match(stateWarnings(r.warnings)[0].message, /hidden from members until CA/);
  assert.equal(stateWarnings(checkJourneyStructure({ ...c, validatedStates: ['CA'] }, FREE).warnings).length, 0);
});

test('time, level, audience and outcomes: valid values pass, wrong ones block', () => {
  const full = journey(
    [{ id: 's', title: 'S', level: 'beginner', actions: [{ id: 'a', title: 'A', kind: 'manual', estimatedMinutes: 30 }] }],
    { audience: 'New notaries', outcomes: ['Commissioned', 'First signing'] },
  );
  const ok = checkJourneyStructure(full, FREE);
  assert.equal(ok.errors.length, 0);
  assert.equal(ok.warnings.length, 0);

  const bad = [
    ['unknown level', { ...full, stages: [{ ...full.stages[0], level: 'expert' }] }],
    ['minutes not whole', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'manual', estimatedMinutes: 2.5 }] }])],
    ['minutes as text', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'manual', estimatedMinutes: '30' }] }])],
    ['zero minutes', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'manual', estimatedMinutes: 0 }] }])],
    ['over a day', journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'manual', estimatedMinutes: 1441 }] }])],
    ['audience too long', { ...full, audience: 'x'.repeat(501) }],
    ['audience not text', { ...full, audience: ['x'] }],
    ['outcomes not a list', { ...full, outcomes: 'Commissioned' }],
    ['empty outcome', { ...full, outcomes: ['Commissioned', ' '] }],
    ['outcome too long', { ...full, outcomes: ['x'.repeat(201)] }],
    ['too many outcomes', { ...full, outcomes: Array.from({ length: 11 }, (_, i) => `O${i}`) }],
  ];
  for (const [name, content] of bad) {
    assert.ok(checkJourneyStructure(content, FREE).errors.length > 0, name);
  }
});

test('missing audience, outcomes or times only warn', () => {
  const r = checkJourneyStructure(notary, FREE);
  assert.equal(r.errors.length, 0);
  assert.ok(r.warnings.some((w) => w.path === 'audience'));
  assert.ok(r.warnings.some((w) => w.path === 'outcomes'));
  assert.ok(r.warnings.some((w) => /5 actions have no estimated time/.test(w.message)));
});

// --- real status of resources ---------------------------------------------
test('resource status follows the same rule as the database', () => {
  assert.equal(productRefState({ content_type: 'workspace', status: 'published' }), 'available');
  for (const s of ['draft', 'ready_for_review', 'approved']) assert.equal(productRefState({ content_type: 'pdf', status: s }), 'coming_soon');
  assert.equal(productRefState({ content_type: 'pdf', status: 'archived' }), 'unavailable');
  assert.equal(productRefState({ content_type: 'journey', status: 'published' }), 'unavailable');
  assert.equal(productRefState(undefined), 'unavailable');
  assert.equal(articleRefState({ slug: 'a', status: 'Published', publishing: {} }), 'available');
  assert.equal(articleRefState({ slug: 'a', status: 'Draft', publishing: {} }), 'coming_soon');
  assert.equal(articleRefState({ slug: 'a', status: 'Published', publishing: { visibility: 'Private' } }), 'unavailable');
  assert.equal(articleRefState({ slug: 'a', status: 'Archived', publishing: {} }), 'unavailable');
});

test('references: missing/archived/wrong type block; drafts only warn', () => {
  const refsOf = (rows, items) => ({ products: new Map(rows.map((r) => [r.id, r])), articles: new Map(items.map((r) => [r.slug, r])) });
  const d = db();
  const refs = refsOf(d.products, d.items);
  const ok = checkJourneyRefs(notary, refs);
  assert.equal(ok.errors.length, 0);
  assert.ok(ok.warnings.some((w) => /Checklist: shown as "Coming soon"/.test(w.message)));
  assert.equal(ok.resolved.find((r) => r.actionId === 'q1').state, 'coming_soon');
  assert.equal(ok.resolved.find((r) => r.actionId === 'b1').state, 'available');

  const bad = journey([
    {
      id: 's',
      title: 'S',
      actions: [
        { id: 'a', title: 'Gone', kind: 'product', productId: P_GONE },
        { id: 'b', title: 'Old', kind: 'product', productId: P_ARCHIVED },
        { id: 'c', title: 'Nested', kind: 'product', productId: P_JOURNEY },
        { id: 'e', title: 'Private', kind: 'article', articleSlug: 'art-private' },
        { id: 'f', title: 'Missing article', kind: 'article', articleSlug: 'nope' },
      ],
    },
  ]);
  const r = checkJourneyRefs(bad, refs);
  assert.equal(r.errors.length, 5);
  assert.ok(r.warnings.some((w) => /No action is available/.test(w.message)));

  const hidden = journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'Internal', kind: 'product', productId: P_DRAFT, whenUnavailable: 'hide' }] }]);
  assert.match(checkJourneyRefs(hidden, refs).warnings[0].message, /hidden from members until it is published/);
});

test('checkJourney reads the real rows', async () => {
  const { client } = fakeSupabase(db());
  const check = await checkJourney(client, { ...FREE, content: notary });
  assert.equal(check.ready, true);
  const broken = await checkJourney(client, { ...FREE, content: journey([{ id: 's', title: 'S', actions: [{ id: 'a', title: 'A', kind: 'product', productId: P_GONE }] }]) });
  assert.equal(broken.ready, false);
});

// --- review gate (release.js) --------------------------------------------------
function releaseCall(tables, body) {
  const fake = fakeSupabase(tables);
  const res = fakeRes();
  return handleRelease({ method: 'POST', body }, res, fake.client, { email: 'team@test.local' }).then(() => ({ res, ...fake }));
}

function journeyRow(id, status, content, extra = {}) {
  return { id, name: 'J', short_description: 'x', cover_image_url: 'https://img', is_free: true, is_trial_eligible: false, price_cents: null, content_type: 'journey', content, status, ...extra };
}

test('an incomplete Journey cannot move to review, approval or sale', async () => {
  const empty = journey([]);
  for (const [status, body] of [
    ['draft', { action: 'stage', stage: 'ready_for_review' }],
    ['ready_for_review', { action: 'stage', stage: 'approved' }],
    ['approved', { action: 'publish-now' }],
  ]) {
    const t = db();
    t.products.push(journeyRow('30000000-0000-0000-0000-000000000001', status, empty));
    const { res, calls } = await releaseCall(t, { ...body, productId: '30000000-0000-0000-0000-000000000001' });
    assert.equal(res.statusCode, 422, `${status} → ${body.action}`);
    assert.ok(res.body.check.errors.length > 0);
    assert.equal(calls.updates.length, 0);
    assert.equal(calls.rpcs.length, 0);
  }
});

test('a complete Journey moves on; two Journeys stay independent', async () => {
  const t = db();
  t.products.push(journeyRow('30000000-0000-0000-0000-000000000001', 'draft', notary));
  t.products.push(journeyRow('30000000-0000-0000-0000-000000000002', 'draft', journey([])));
  const a = await releaseCall(t, { action: 'stage', stage: 'ready_for_review', productId: '30000000-0000-0000-0000-000000000001' });
  assert.equal(a.res.statusCode, 200);
  assert.equal(t.products.find((p) => p.id === '30000000-0000-0000-0000-000000000001').status, 'ready_for_review');
  assert.equal(t.products.find((p) => p.id === '30000000-0000-0000-0000-000000000002').status, 'draft');
  const b = await releaseCall(t, { action: 'stage', stage: 'ready_for_review', productId: '30000000-0000-0000-0000-000000000002' });
  assert.equal(b.res.statusCode, 422);
});

test('other products keep their old review rule', async () => {
  const t = db();
  t.products.push({ id: '40000000-0000-0000-0000-000000000001', name: 'PDF', short_description: 'x', cover_image_url: 'https://img', is_free: true, price_cents: null, content_type: 'pdf', content: { files: [{ id: 'f' }] }, status: 'draft' });
  const { res } = await releaseCall(t, { action: 'stage', stage: 'ready_for_review', productId: '40000000-0000-0000-0000-000000000001' });
  assert.equal(res.statusCode, 200);
});

test('a Journey members started cannot be deleted; an unstarted one can', async () => {
  const id = '30000000-0000-0000-0000-000000000001';
  const t = db();
  t.products.push(journeyRow(id, 'draft', notary));
  t.workspace_instances.push({ id: 'i1', product_id: id, user_id: 'u1', data: { kind: 'journey' } });
  const started = await releaseCall(t, { action: 'delete', productId: id });
  assert.equal(started.res.statusCode, 409);
  assert.equal(started.calls.deletes.length, 0);
  t.workspace_instances = [];
  const fresh = await releaseCall(t, { action: 'delete', productId: id });
  assert.equal(fresh.res.statusCode, 200);
});

// --- listing (handleJourneys) -----------------------------------------------------
test('lists every Journey and the real status of resources, drafts unchanged', async () => {
  const t = db();
  t.products.push(journeyRow('30000000-0000-0000-0000-000000000001', 'draft', notary));
  const before = JSON.stringify(t.products);
  const fake = fakeSupabase(t);
  const list = fakeRes();
  await handleJourneys({ method: 'GET', query: {} }, list, fake.client);
  assert.deepEqual(list.body.journeys.map((j) => j.id).sort(), [P_JOURNEY, '30000000-0000-0000-0000-000000000001'].sort());
  assert.equal(list.body.journeys.find((j) => j.id === '30000000-0000-0000-0000-000000000001').stageCount, 5);

  const resources = fakeRes();
  await handleJourneys({ method: 'GET', query: { resources: '1' } }, resources, fake.client);
  const state = Object.fromEntries(resources.body.products.map((p) => [p.slug, p.state]));
  assert.deepEqual(state, { live: 'available', 'wix-draft': 'coming_soon', old: 'unavailable' });
  assert.deepEqual(Object.fromEntries(resources.body.articles.map((a) => [a.slug, a.state])), {
    'art-live': 'available',
    'art-draft': 'coming_soon',
    'art-private': 'unavailable',
  });
  assert.equal(fake.calls.updates.length + fake.calls.deletes.length, 0);
  assert.equal(JSON.stringify(t.products), before);

  const one = fakeRes();
  await handleJourneys({ method: 'GET', query: { id: '30000000-0000-0000-0000-000000000001' } }, one, fake.client);
  assert.equal(one.body.check.ready, true);
  const notJourney = fakeRes();
  await handleJourneys({ method: 'GET', query: { id: P_LIVE } }, notJourney, fake.client);
  assert.equal(notJourney.statusCode, 404);
});
