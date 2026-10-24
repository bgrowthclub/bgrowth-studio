// The Journey editor's pure helpers. Run: npm test (Node's built-in runner
// with its TypeScript type stripping — no extra dependency).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addAction,
  addOutcome,
  formatMinutes,
  readMinutes,
  removeOutcome,
  totalMinutes,
  updateOutcome,
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

test('time per action: typed values become whole minutes; totals add up', () => {
  assert.equal(readMinutes('45'), 45);
  assert.equal(readMinutes(14.6), 15);
  assert.equal(readMinutes(''), undefined);
  assert.equal(readMinutes('abc'), undefined);
  assert.equal(readMinutes(0), undefined);
  assert.equal(readMinutes(5000), 1440);

  let c = addStage(emptyContent());
  const s = c.stages[0].id;
  c = addAction(addAction(c, s), s);
  const [a1, a2] = c.stages[0].actions.map((a) => a.id);
  c = updateAction(c, s, a1, { estimatedMinutes: 90 });
  c = updateAction(c, s, a2, { estimatedMinutes: 20 });
  assert.equal(totalMinutes(c), 110);
  assert.equal(formatMinutes(110), '1 h 50 min');
  assert.equal(formatMinutes(120), '2 h');
  assert.equal(formatMinutes(45), '45 min');

  // Clearing the time removes the field (nothing saved as undefined/null).
  c = updateAction(c, s, a2, { estimatedMinutes: undefined });
  assert.equal('estimatedMinutes' in c.stages[0].actions[1], false);
  assert.equal(totalMinutes(c), 90);
  const saved = toSavedContent(c).stages[0].actions;
  assert.equal(saved[0].estimatedMinutes, 90);
  assert.equal('estimatedMinutes' in saved[1], false);
});

test('stage level, audience and outcomes are kept, saved and read back', () => {
  let c = addStage(emptyContent());
  const s = c.stages[0].id;
  c = updateStage(c, s, { level: 'best_practices' });
  c = { ...c, audience: '  New notaries  ' };
  c = addOutcome(addOutcome(addOutcome(c)));
  c = updateOutcome(c, 0, ' Commissioned ');
  c = updateOutcome(c, 2, 'First signing');
  const saved = toSavedContent(c);
  assert.equal(saved.stages[0].level, 'best_practices');
  assert.equal(saved.audience, 'New notaries');
  assert.deepEqual(saved.outcomes, ['Commissioned', 'First signing']);

  const back = readContent(saved);
  assert.equal(back.stages[0].level, 'best_practices');
  assert.deepEqual(back.outcomes, ['Commissioned', 'First signing']);
  assert.deepEqual(removeOutcome(back, 0).outcomes, ['First signing']);

  // No level chosen → no field; an unknown saved level is dropped.
  assert.equal('level' in updateStage(c, s, { level: undefined }).stages[0], false);
  assert.equal('level' in readContent({ stages: [{ id: 's', title: 'T', summary: '', level: 'expert' as never, actions: [] }] }).stages[0], false);

  // Old drafts without the new fields still open.
  const old = readContent({ goal: 'g', stages: [] });
  assert.equal(old.audience, '');
  assert.deepEqual(old.outcomes, []);
});

test('at most 10 outcomes; draft problems for the new fields', () => {
  let c = emptyContent();
  for (let i = 0; i < 12; i += 1) c = addOutcome(c);
  assert.equal(c.outcomes.length, 10);
  const long = { ...emptyContent(), audience: 'x'.repeat(501), outcomes: ['x'.repeat(201)] };
  const problems = draftProblems(draftWith(long));
  assert.ok(problems.some((p) => p.includes('Who it is for')));
  assert.ok(problems.some((p) => p.includes('Expected outcome 1')));
  let t = addStage(emptyContent());
  t = addAction(t, t.stages[0].id);
  t = updateAction(t, t.stages[0].id, t.stages[0].actions[0].id, { estimatedMinutes: 2.5 });
  assert.ok(draftProblems(draftWith(t)).some((p) => p.includes('between 1 and 1440 minutes')));
});
