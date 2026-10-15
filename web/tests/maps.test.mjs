import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenario } from '../src/data/scenarios.js';
import { visibleMaps, switchMap, hasActiveShared } from '../src/logic/maps.js';

test('개인 맵은 본인만, 활성 공유 맵은 참여자만 볼 수 있다', () => {
  const state = createScenario('connected');
  state.maps.push({ id: 'other-shared', type: 'shared', active: true, memberIds: ['user-a', 'user-c'] });
  state.maps.push({ id: 'ended-shared', type: 'shared', active: false, memberIds: ['user-a', 'user-b'] });
  assert.deepEqual(visibleMaps(state, 'user-b').map((map) => map.id), ['personal-b', 'shared-ab']);
  assert.deepEqual(visibleMaps(state, 'stranger'), []);
  assert.equal(hasActiveShared(state, 'user-b'), true);
  assert.equal(hasActiveShared(createScenario('solo'), 'user-b'), false);
});

test('맵 전환은 DM 기본 저장 위치와 원본을 보존하고 권한 없는 맵을 거절한다', () => {
  const state = createScenario('connected');
  const before = structuredClone(state);
  const personal = switchMap(state, 'personal-b');
  assert.equal(personal.currentMapId, 'personal-b');
  assert.equal(personal.dmDefaultTarget, 'personal');
  const shared = switchMap(personal, 'shared-ab');
  assert.equal(shared.currentMapId, 'shared-ab');
  assert.equal(shared.dmDefaultTarget, 'personal');
  assert.equal(switchMap(state, 'personal-a'), state);
  assert.equal(switchMap(state, 'missing'), state);
  assert.deepEqual(state, before);
  state.maps.find((map) => map.id === 'shared-ab').active = false;
  assert.equal(switchMap(personal, 'shared-ab').currentMapId, 'personal-b');
});
