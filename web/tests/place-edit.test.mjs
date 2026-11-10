import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenario } from '../src/data/scenarios.js';
import { activePlaces } from '../src/logic/places.js';
import { buildCopyDraft, executeCopy } from '../src/logic/copy.js';
import { findAccessiblePlace, updatePlaceInfo, updateLocation, toggleWant, toggleVisited, trashPlace, restorePlace } from '../src/logic/place-edit.js';

test('정보 편집은 바뀐 필드만 기록하고 입력 상태를 변경하지 않는다', () => {
  const state = createScenario('connected');
  const before = structuredClone(state);
  const old = findAccessiblePlace(state, 'shared-cafe');
  const next = updatePlaceInfo(state, old.id, { name: '수정한 예시 카페', category: old.category, menuName: '예시 메뉴', memoText: '함께 볼 메모', ignored: '무시' });
  const edited = findAccessiblePlace(next, old.id);
  assert.deepEqual(edited.edits, { category: 'user-b', name: 'user-b', menu: 'user-b', memo: 'user-b' });
  assert.deepEqual(edited.history.slice(old.history.length).map((entry) => entry.field), ['장소명', '메뉴', '메모']);
  assert.deepEqual(edited.memo, { text: '함께 볼 메모', authorId: 'user-b' });
  assert.deepEqual(state, before);
  assert.equal(updatePlaceInfo(state, old.id, { name: old.name }), state);
  assert.equal(findAccessiblePlace(updatePlaceInfo(next, old.id, { memoText: '' }), old.id).memo, null);
});

test('다른 참여자·종료된 공유 맵·휴지통 장소에는 편집과 삭제를 실행하지 않는다', () => {
  const actions = [
    (state, id) => updatePlaceInfo(state, id, { name: '허용 안 됨' }),
    (state, id) => updateLocation(state, id, { x: 50, y: 50 }), toggleWant, toggleVisited, trashPlace,
  ];
  const personal = createScenario('connected');
  assert.equal(findAccessiblePlace(personal, 'pa-book', 'user-b'), null);
  for (const action of actions) assert.equal(action(personal, 'pa-book'), personal);
  for (const revoke of [
    (state) => { state.maps.find((map) => map.type === 'shared').active = false; },
    (state) => { state.maps.find((map) => map.type === 'shared').memberIds = ['user-a']; },
  ]) {
    const state = createScenario('connected');
    revoke(state);
    for (const action of actions) assert.equal(action(state, 'shared-cafe'), state);
    state.places.find((place) => place.id === 'shared-cafe').trashed = true;
    assert.equal(restorePlace(state, 'shared-cafe'), state);
  }
  const trashed = trashPlace(personal, 'shared-cafe');
  for (const action of actions) assert.equal(action(trashed, 'shared-cafe'), trashed);
});

test('복제본과 원본의 정보·메모·위치·관심·방문·삭제는 양방향으로 독립이다', () => {
  const state = createScenario('copy-initial');
  const { draft } = buildCopyDraft(state, { sourceMapId: 'personal-b', targetMapId: 'shared-ab', placeIds: ['pb-bakery'] });
  const copied = executeCopy(state, draft);
  const targetId = copied.result.items[0].targetPlaceId;
  for (const [changedId, unchangedId] of [[targetId, 'pb-bakery'], ['pb-bakery', targetId]]) {
    let next = copied.state;
    const original = structuredClone(findAccessiblePlace(next, unchangedId));
    next = updatePlaceInfo(next, changedId, { name: '예시 수정 이름', memoText: '이 맵 메모' });
    next = updateLocation(next, changedId, { x: 50, y: 50 });
    next = toggleWant(next, changedId);
    next = toggleVisited(next, changedId);
    next = trashPlace(next, changedId);
    assert.deepEqual(findAccessiblePlace(next, unchangedId), original);
    assert.equal(next.dmDefaultTarget, copied.state.dmDefaultTarget);
  }
});

test('관심과 방문은 되돌릴 수 있고 휴지통은 활성 목록에서 빠졌다가 복구된다', () => {
  let state = createScenario('connected-personal');
  state = toggleWant(state, 'pb-bakery');
  assert.equal(findAccessiblePlace(state, 'pb-bakery').visit, 'want');
  state = toggleVisited(state, 'pb-bakery');
  assert.equal(findAccessiblePlace(state, 'pb-bakery').visit, 'visited');
  state = toggleVisited(state, 'pb-bakery');
  assert.equal(findAccessiblePlace(state, 'pb-bakery').visit, 'want');
  state = toggleWant(state, 'pb-bakery');
  assert.equal(findAccessiblePlace(state, 'pb-bakery').visit, null);
  state = trashPlace(state, 'pb-bakery');
  assert.equal(activePlaces(state, 'personal-b').length, 3);
  assert.equal(findAccessiblePlace(state, 'pb-bakery'), null);
  assert.equal(state.places.find((place) => place.id === 'pb-bakery').deletedBy, 'user-b');
  state = restorePlace(state, 'pb-bakery');
  assert.equal(activePlaces(state, 'personal-b').length, 4);
  assert.equal(findAccessiblePlace(state, 'pb-bakery').history.at(-1).type, 'restored');
  assert.equal(restorePlace(state, 'pb-bakery'), state);
});
