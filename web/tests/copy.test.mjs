import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenario } from '../src/data/scenarios.js';
import { activePlaces } from '../src/logic/places.js';
import { copyTargets, copySources, defaultExtras, readableExtras, buildCopyDraft, executeCopy, retryFailed } from '../src/logic/copy.js';

const draftFor = (state, placeIds, extra = {}) => buildCopyDraft(state, { sourceMapId: 'personal-b', targetMapId: 'shared-ab', placeIds, ...extra });
const placeById = (state, id) => state.places.find((place) => place.id === id);

test('복제 원본·대상은 본인 접근 범위만 제공하고 잘못된 초안을 거부한다', () => {
  const state = createScenario('connected');
  assert.deepEqual(copyTargets(state, 'personal-b', 'user-b').map((map) => map.id), ['shared-ab']);
  assert.ok(copySources(state, 'user-b').every((place) => place.mapId === 'personal-b'));
  for (const [patch, reason] of [
    [{ sourceMapId: 'personal-a' }, 'no-access'], [{ targetMapId: 'personal-a' }, 'invalid-target'],
    [{ placeIds: ['shared-cafe'] }, 'invalid-place'], [{ placeIds: [] }, 'empty'],
  ]) assert.deepEqual(draftFor(state, ['pb-soup'], patch), { ok: false, reason });
  assert.deepEqual(defaultExtras('personal-to-shared'), { memo: false, photos: false, visits: false });
  assert.deepEqual(defaultExtras('shared-to-personal'), { memo: false, photos: false });
  assert.deepEqual(draftFor(state, ['pb-soup']).draft.extras, defaultExtras('personal-to-shared'));
  const all = draftFor(state, [], { scope: 'all' });
  assert.equal(all.draft.placeIds.length, 4);
  assert.deepEqual(all.draft.extras, defaultExtras('personal-to-shared'));
  const inactive = structuredClone(state);
  inactive.maps.find((map) => map.id === 'shared-ab').active = false;
  assert.deepEqual(copyTargets(inactive, 'personal-b'), []);
});

test('새 복제는 입력·원본·DM 기본 위치를 유지하고 개인 추가 정보를 기본 제외한다', () => {
  const state = createScenario('copy-initial');
  const before = structuredClone(state);
  const draft = draftFor(state, ['pb-soup', 'pb-bakery']).draft;
  const result = executeCopy(state, draft);
  assert.equal(result.ok, true);
  assert.deepEqual(state, before);
  assert.equal(result.state.dmDefaultTarget, before.dmDefaultTarget);
  assert.deepEqual(result.state.places.filter((place) => place.id.startsWith('pb-')), before.places.filter((place) => place.id.startsWith('pb-')));
  for (const item of result.result.items) {
    const place = placeById(result.state, item.targetPlaceId);
    assert.equal(place.memo, null);
    assert.equal(place.photos, 0);
    assert.equal(place.visit, null);
    assert.deepEqual(place.wantBy, []);
    assert.deepEqual(place.edits, {});
    assert.equal(place.senderId, 'user-b');
    assert.ok(!place.id.includes(item.sourceId));
    assert.doesNotMatch(place.id, /personal-b|shared-ab/);
    assert.doesNotMatch(JSON.stringify(place), /personal-b|내 개인 맵/);
  }
  const bakery = placeById(result.state, result.result.items[1].targetPlaceId);
  assert.equal(bakery.locationStatus, 'unconfirmed');
  assert.equal(bakery.pin, null);
  const again = executeCopy(result.state, draft);
  assert.deepEqual(again.result.items.map((item) => item.outcome), ['unchanged', 'unchanged']);
  assert.equal(again.state.places.length, result.state.places.length);
});

test('추가 정보 동의는 메모·사진·방문만 복제하고 관심·약속·평가를 제외한다', () => {
  const state = createScenario('connected');
  state.places = state.places.filter((place) => place.id !== 'shared-cafe');
  Object.assign(placeById(state, 'pb-cafe'), { wantBy: ['user-b'], appointment: '복제 금지', rating: '복제 금지' });
  const draft = draftFor(state, ['pb-cafe']).draft;
  draft.extras = { memo: true, photos: true, visits: true };
  const result = executeCopy(state, draft);
  const copied = placeById(result.state, result.result.items[0].targetPlaceId);
  assert.deepEqual(copied.memo, { text: '테라스 자리 먼저 보기', authorId: 'user-b' });
  assert.equal(copied.photos, 1);
  assert.equal(copied.visit, 'visited');
  assert.deepEqual(copied.wantBy, []);
  assert.equal(copied.appointment, undefined);
  assert.equal(copied.rating, undefined);
  placeById(state, 'pb-cafe').visit = 'want';
  assert.equal(placeById(executeCopy(state, draft).state, copied.id).visit, null);
});

test('같은 지점은 출처만 합치며 기존 정보와 기록을 덮어쓰지 않는다', () => {
  const state = createScenario('copy-initial');
  const old = structuredClone(placeById(state, 'shared-cafe'));
  const draft = draftFor(state, ['pb-cafe']).draft;
  draft.extras = { memo: true, photos: true, visits: true };
  const result = executeCopy(state, draft);
  assert.equal(result.result.items[0].outcome, 'source-added');
  const target = placeById(result.state, 'shared-cafe');
  assert.equal(target.sources.length, 2);
  for (const field of ['name', 'category', 'menu', 'tip', 'memo', 'photos', 'visit', 'wantBy', 'pin', 'locationStatus', 'edits']) assert.deepEqual(target[field], old[field], field);
  assert.equal(target.history.at(-1).type, 'source-added');
  const again = executeCopy(result.state, draft);
  assert.equal(again.result.items[0].outcome, 'unchanged');
  assert.deepEqual(placeById(again.state, 'shared-cafe'), target);
  assert.equal(again.state.places.length, state.places.length);
});

test('미확정 장소를 여러 번 왕복 복제해도 원본과 두 맵의 장소 수를 유지한다', () => {
  let state = createScenario('copy-initial');
  Object.assign(placeById(state, 'pb-bakery'), { edits: { memo: 'user-b' }, visit: 'visited' });
  const original = structuredClone(placeById(state, 'pb-bakery'));
  const first = executeCopy(state, draftFor(state, ['pb-bakery']).draft);
  assert.equal(first.result.items[0].outcome, 'new');
  state = first.state;
  const sharedId = first.result.items[0].targetPlaceId;
  const shared = structuredClone(placeById(state, sharedId));
  const counts = ['personal-b', 'shared-ab'].map((id) => activePlaces(state, id).length);
  for (let round = 0; round < 5; round += 1) {
    const back = executeCopy(state, buildCopyDraft(state, {
      sourceMapId: 'shared-ab', targetMapId: 'personal-b', placeIds: [sharedId],
    }).draft);
    assert.equal(back.result.items[0].outcome, 'unchanged');
    assert.equal(back.result.items[0].targetPlaceId, original.id);
    assert.deepEqual(placeById(back.state, original.id), original);
    assert.deepEqual(['personal-b', 'shared-ab'].map((id) => activePlaces(back.state, id).length), counts);
    const forward = executeCopy(back.state, draftFor(back.state, ['pb-bakery']).draft);
    assert.equal(forward.result.items[0].outcome, 'unchanged');
    assert.equal(forward.result.items[0].targetPlaceId, sharedId);
    assert.deepEqual(placeById(forward.state, sharedId), shared);
    assert.deepEqual(['personal-b', 'shared-ab'].map((id) => activePlaces(forward.state, id).length), counts);
    state = forward.state;
  }
});

test('복제 체인의 조상·후손·공통 뿌리는 출처만 추가하고 대상 기록을 보존한다', () => {
  for (const [sourceParent, targetParent, links] of [
    ['bakery-middle', null, [['bakery-middle', 'pb-bakery']]],
    [null, 'bakery-middle', [['bakery-middle', 'shared-bakery']]],
    ['source-middle', 'target-middle', [['source-middle', 'bakery-root'], ['target-middle', 'bakery-root']]],
    ['cycle-a', 'cycle-b', [['cycle-a', 'cycle-b'], ['cycle-b', 'cycle-a']]],
  ]) {
    const state = createScenario('connected');
    const source = placeById(state, 'shared-bakery');
    const target = placeById(state, 'pb-bakery');
    source.copyOf = sourceParent;
    Object.assign(target, { copyOf: targetParent, edits: { memo: 'user-b' }, visit: 'visited' });
    state.places.push(...links.map(([id, copyOf]) => ({ ...structuredClone(source), id, copyOf, trashed: true })));
    const before = structuredClone(state);
    const oldTarget = structuredClone(target);
    const draft = buildCopyDraft(state, { sourceMapId: 'shared-ab', targetMapId: 'personal-b', placeIds: [source.id] }).draft;
    draft.extras = { memo: true, photos: true };
    const result = executeCopy(state, draft);
    assert.equal(result.result.items[0].outcome, 'source-added');
    assert.equal(result.result.items[0].targetPlaceId, target.id);
    assert.equal(result.state.places.length, state.places.length);
    assert.deepEqual(placeById(result.state, target.id), {
      ...oldTarget, sources: [...oldTarget.sources, ...source.sources],
      history: [...oldTarget.history, { type: 'source-added', actorId: 'user-b', at: '[날짜]' }],
    });
    const again = executeCopy(result.state, draft);
    assert.equal(again.result.items[0].outcome, 'unchanged');
    assert.deepEqual(again.state.places, result.state.places);
    assert.deepEqual(state, before);
  }
});

test('서로 다른 순환 복제 체인은 같은 장소로 합치지 않는다', () => {
  const state = createScenario('connected');
  placeById(state, 'pb-bakery').copyOf = 'personal-cycle';
  placeById(state, 'shared-bakery').copyOf = 'shared-cycle';
  state.places.push(...[
    ['personal-cycle', 'pb-bakery'], ['shared-cycle', 'shared-bakery'],
  ].map(([id, copyOf]) => ({ ...structuredClone(placeById(state, 'pb-bakery')), id, copyOf, trashed: true })));
  const result = executeCopy(state, draftFor(state, ['pb-bakery']).draft);
  assert.equal(result.result.items[0].outcome, 'new');
  assert.equal(result.state.places.length, state.places.length + 1);
});

test('일부 실패 결과는 순서를 유지하고 재시도는 실패한 장소만 처리한다', () => {
  const state = createScenario('copy-partial');
  const before = structuredClone(state);
  assert.deepEqual(state.copy.result.items.map((item) => item.outcome), ['new', 'source-added', 'new', 'failed']);
  assert.equal(state.copy.result.total, 4);
  assert.equal(state.copy.result.done, 3);
  const retried = retryFailed(state, state.copy.result);
  assert.equal(retried.result.total, 4);
  assert.equal(retried.result.done, 4);
  assert.deepEqual(retried.result.items.slice(0, 3), state.copy.result.items.slice(0, 3));
  assert.equal(retried.state.places.length, state.places.length + 1);
  for (const item of state.copy.result.items.slice(0, 3)) assert.deepEqual(placeById(retried.state, item.targetPlaceId), placeById(state, item.targetPlaceId));
  assert.deepEqual(state, before);
});

test('실행·재시도 직전에 권한과 활성 장소를 재확인한다', () => {
  for (const revoke of [
    (state) => { state.maps.find((map) => map.type === 'shared').active = false; },
    (state) => { state.maps.find((map) => map.type === 'shared').memberIds = ['user-a']; },
  ]) {
    const state = createScenario('copy-preview');
    revoke(state);
    const before = structuredClone(state);
    const result = executeCopy(state, state.copy.draft);
    assert.equal(result.reason, 'invalid-target');
    assert.equal(result.state, state);
    assert.deepEqual(state, before);
    const partial = createScenario('copy-partial');
    revoke(partial);
    assert.equal(retryFailed(partial, partial.copy.result).state, partial);
  }
  const state = createScenario('copy-preview');
  placeById(state, 'pb-cafe').trashed = true;
  assert.equal(executeCopy(state, state.copy.draft).reason, 'invalid-place');
  assert.equal(copySources(state).length, 3);
});

test('공유→개인은 읽을 수 있는 메모 작성자와 사진만 선택해 가져온다', () => {
  const state = createScenario('copy-to-personal');
  const readable = readableExtras(state, ['shared-cafe', 'pa-book', 'missing']);
  assert.deepEqual(readable, { memo: [{ text: '서울숲 산책하고 가기', authorId: 'user-a' }], photos: 1 });
  state.places = state.places.filter((place) => place.id !== 'pb-cafe');
  const draft = { ...state.copy.draft, extras: { memo: true, photos: true, visits: true } };
  const result = executeCopy(state, draft);
  const copied = placeById(result.state, result.result.items[0].targetPlaceId);
  assert.equal(copied.memo.authorId, 'user-a');
  assert.equal(copied.photos, 1);
  assert.equal(copied.visit, null);
  assert.deepEqual(copied.wantBy, []);
  assert.equal(copied.savedBy, 'user-a');
});

test('휴지통은 중복 후보에서 빠지고 새 복제는 기존 ID를 재사용하지 않는다', () => {
  const state = createScenario('copy-initial');
  const draft = draftFor(state, ['pb-bakery']).draft;
  const first = executeCopy(state, draft);
  const oldId = first.result.items[0].targetPlaceId;
  placeById(first.state, oldId).trashed = true;
  const next = executeCopy(first.state, draft);
  const nextId = next.result.items[0].targetPlaceId;
  assert.notEqual(nextId, oldId);
  assert.equal(new Set(next.state.places.map((place) => place.id)).size, next.state.places.length);
  assert.equal(placeById(next.state, oldId).trashed, true);
  assert.equal(placeById(next.state, nextId).copyOf, 'pb-bakery');
  assert.equal(activePlaces(next.state, 'shared-ab').length, 2);
});
