// The Journey editor's pure helpers. Run: npm test (Node's built-in runner
// with its TypeScript type stripping — no extra dependency).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addAction,
  addStage,
  draftProblems,
  emptyContent,
  idsIn,
  moveAction,
  moveStage,
  readContent,
  removeAction,
  removeStage,
  setActionKind,
  toDraft,
  toSavedContent,
  toSlug,
  updateAction,
  updateStage,
} from './model.ts';
import type { JourneyDraft } from './types.ts';

const PRODUCT = '10000000-0000-0000-0000-000000000001';

function draftWith(content = emptyContent()): JourneyDraft {
  return { ...toDraft(null), name: 'My Journey', slug: 'my-journey', shortDescription: 'Short', content };
}

test('a new Journey has nothing fixed: no stages, a default notice, its own id', () => {
  const a = toDraft(null);
  const b = toDraft(null);
  assert.equal(a.content.stages.length, 0);
  assert.notEqual(a.studioProductId, b.studioProductId);
  assert.ok(a.content.notice.length > 0);
  assert.equal(a.productId, null);
});

test('stages and actions: add, edit, reorder, remove', () => {
  let c = addStage(addStage(emptyContent()));
  const [s1, s2] = c.stages.map((s) => s.id);
  assert.notEqual(s1, s2);
  c = updateStage(c, s1, { title: 'First' });
  c = updateStage(c, s2, { title: 'Second' });
  c = moveStage(c, s2, -1);
  assert.deepEqual(c.stages.map((s) => s.title), ['Second', 'First']);
  assert.deepEqual(moveStage(c, s2, -1).stages.map((s) => s.title), ['Second', 'First'], 'moving past the top changes nothing');

  c = addAction(addAction(addAction(c, s1), s1, 'product'), s1, 'link');
  const ids = c.stages.find((s) => s.id === s1)!.actions.map((a) => a.id);
  assert.equal(new Set(ids).size, 3);
  assert.equal(idsIn(c).size, 5);
  c = moveAction(c, s1, ids[2], -1);
  assert.deepEqual(c.stages.find((s) => s.id === s1)!.actions.map((a) => a.id), [ids[0], ids[2], ids[1]]);
  c = removeAction(c, s1, ids[0]);
  assert.equal(c.stages.find((s) => s.id === s1)!.actions.length, 2);
  c = removeStage(c, s2);
  assert.deepEqual(c.stages.map((s) => s.title), ['First']);
});

test('changing an action type clears the old reference', () => {
  let c = addAction(addStage(emptyContent()), '', 'manual');
  const sid = c.stages[0].id;
  c = addAction(c, sid, 'product');
  const aid = c.stages[0].actions[0].id;
  c = updateAction(c, sid, aid, { productId: PRODUCT });
  c = setActionKind(c, sid, aid, 'link');
  assert.equal(c.stages[0].actions[0].kind, 'link');
  assert.equal(c.stages[0].actions[0].productId, undefined);
});

test('an unfinished draft can be saved', () => {
  let c = addStage(emptyContent());
  c = addAction(c, c.stages[0].id, 'product');
  c = { ...c, goal: '', notice: '' };
  assert.deepEqual(draftProblems(draftWith(c)), []);
});

test('only wrong values block a draft', () => {
  assert.ok(draftProblems({ ...draftWith(), name: ' ' }).length);
  assert.ok(draftProblems({ ...draftWith(), shortDescription: '' }).length);
  assert.ok(draftProblems({ ...draftWith(), slug: 'Not A Slug' }).length);
  assert.ok(draftProblems({ ...draftWith(), slug: '' }).length);
  let c = addStage(emptyContent());
  c = addAction(c, c.stages[0].id, 'link');
  c = updateAction(c, c.stages[0].id, c.stages[0].actions[0].id, { url: 'http://insecure.com' });
  assert.match(draftProblems(draftWith(c))[0], /https/);
  c = updateAction(c, c.stages[0].id, c.stages[0].actions[0].id, { url: 'javascript:alert(1)' });
  assert.match(draftProblems(draftWith(c))[0], /https/);
  c = updateAction(c, c.stages[0].id, c.stages[0].actions[0].id, { url: 'https://ok.example' });
  assert.deepEqual(draftProblems(draftWith(c)), []);
});

test('saved content keeps only what each action type uses', () => {
  let c = addStage(emptyContent());
  const sid = c.stages[0].id;
  c = addAction(c, sid, 'product');
  const aid = c.stages[0].actions[0].id;
  c = updateAction(c, sid, aid, { productId: PRODUCT, url: 'https://leftover', articleSlug: 'leftover', title: '  Open  ' });
  const saved = toSavedContent({ ...c, goal: '  Goal  ' });
  const a = saved.stages[0].actions[0];
  assert.equal(a.productId, PRODUCT);
  assert.equal(a.url, undefined);
  assert.equal(a.articleSlug, undefined);
  assert.equal(a.title, 'Open');
  assert.equal(saved.goal, 'Goal');
  assert.equal(saved.kind, 'journey');
  assert.equal(saved.version, 1);
});

test('reading saved content keeps states and validated states as they are', () => {
  const read = readContent({
    goal: 'g',
    validatedStates: ['CA'],
    stages: [{ id: 's', title: 'T', summary: '', actions: [{ id: 'a', title: 'A', instructions: '', optional: true, kind: 'manual', states: ['CA'], whenUnavailable: 'hide' }] }],
  });
  assert.deepEqual(read.validatedStates, ['CA']);
  assert.deepEqual(read.stages[0].actions[0].states, ['CA']);
  assert.equal(read.stages[0].actions[0].whenUnavailable, 'hide');
  assert.deepEqual(toSavedContent(read).stages[0].actions[0].states, ['CA']);
  assert.deepEqual(readContent(null).stages, []);
});

test('two Journeys opened from the list stay separate', () => {
  const a = toDraft({ id: 'id-a', studio_product_id: 'sp-a', name: 'A', slug: 'a', short_description: 'x', status: 'draft', is_free: true, cover_image_url: null, category_id: null, last_published_at: null, created_at: '', content: { stages: [{ id: 'discover', title: 'Discover', summary: '', actions: [] }] } });
  const b = toDraft({ id: 'id-b', studio_product_id: 'sp-b', name: 'B', slug: 'b', short_description: 'x', status: 'published', is_free: true, cover_image_url: null, category_id: null, last_published_at: null, created_at: '', content: { stages: [{ id: 'money', title: 'Money', summary: '', actions: [] }] } });
  const edited = { ...a, content: updateStage(a.content, 'discover', { title: 'Changed' }) };
  assert.equal(b.content.stages[0].title, 'Money');
  assert.equal(edited.content.stages[0].title, 'Changed');
  assert.equal(a.content.stages[0].title, 'Discover');
  assert.deepEqual([a.slug, b.slug, a.studioProductId, b.studioProductId], ['a', 'b', 'sp-a', 'sp-b']);
});

test('slugs follow the name until edited', () => {
  assert.equal(toSlug('Become a Mobile Notary!'), 'become-a-mobile-notary');
  assert.equal(toSlug('  Café & Négócio  '), 'cafe-negocio');
});
