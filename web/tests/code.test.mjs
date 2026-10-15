import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenario } from '../src/data/scenarios.js';
import { issueCode, cancelCode, expireCode, redeemCode, confirmConnect } from '../src/logic/code.js';

test('재발급은 같은 발급자의 이전 사용 가능 코드를 무효화하고 입력을 보존한다', () => {
  const state = createScenario('code-entry');
  const codes = [...state.codes, { id: 'other', ownerId: 'user-b', value: 'other-code', status: 'available' }];
  const before = structuredClone(codes);
  const issued = issueCode(codes, 'user-a', 10);
  assert.deepEqual(codes, before);
  assert.equal(issued.find((code) => code.id === 'code-a').status, 'superseded');
  assert.equal(issued.filter((code) => code.ownerId === 'user-a' && code.status === 'available').length, 1);
  assert.equal(issued.find((code) => code.id === 'other').status, 'available');
  assert.equal(redeemCode({ ...state, codes: issued }, codes[0].value, 'user-b').reason, 'unusable');
  assert.equal(redeemCode({ ...state, codes: issued }, issued.at(-1).value, 'user-b').ok, true);
});

for (const status of ['expired', 'cancelled', 'used', 'superseded']) {
  test(`${status} 코드는 입력해도 사용할 수 없다`, () => {
    const state = createScenario('code-entry');
    state.codes[0].status = status;
    assert.deepEqual(redeemCode(state, '[연결 코드]', 'user-b'), { ok: false, reason: 'unusable', status });
    assert.equal(confirmConnect(state, '[연결 코드]', 'user-b').state, state);
  });
}

test('취소와 만료는 사용 가능 코드에만 적용되고 원본을 변경하지 않는다', () => {
  const codes = createScenario('code-entry').codes;
  const cancelled = cancelCode(codes, 'code-a');
  const expired = expireCode(codes, 'code-a');
  assert.equal(codes[0].status, 'available');
  assert.equal(cancelled[0].status, 'cancelled');
  assert.equal(expired[0].status, 'expired');
  assert.deepEqual(expireCode(cancelled, 'code-a'), cancelled);
  assert.deepEqual(cancelCode(expired, 'code-a'), expired);
  for (const status of ['used', 'superseded']) {
    const unavailable = [{ ...codes[0], status }];
    assert.deepEqual(cancelCode(unavailable, 'code-a'), unavailable);
    assert.deepEqual(expireCode(unavailable, 'code-a'), unavailable);
  }
});

test('로그인 전·다른 사용자 세션·없는 코드·본인 코드를 차단한다', () => {
  const state = createScenario('code-entry');
  assert.equal(redeemCode({ ...state, loggedIn: false }, '[연결 코드]', 'user-b').reason, 'login-required');
  assert.equal(redeemCode(state, '[연결 코드]', 'user-a').reason, 'login-required');
  assert.equal(redeemCode(state, '없는 코드', 'user-b').reason, 'not-found');
  assert.equal(redeemCode({ ...state, currentUserId: 'user-a' }, '[연결 코드]', 'user-a').reason, 'own-code');
});

test('입력자나 발급자가 활성 공유 맵에 있으면 연결을 바꾸지 않는다', () => {
  const state = createScenario('already-shared');
  const before = structuredClone(state);
  assert.deepEqual(redeemCode(state, '[연결 코드]', 'user-b'), { ok: false, reason: 'already-shared', sharedMapId: 'shared-ab' });
  assert.equal(confirmConnect(state, '[연결 코드]', 'user-b').state, state);
  assert.deepEqual(state, before);
  const issuerShared = createScenario('code-entry');
  issuerShared.maps.push({ id: 'issuer-shared', type: 'shared', active: true, memberIds: ['user-a', 'user-c'] });
  assert.equal(redeemCode(issuerShared, '[연결 코드]', 'user-b').sharedMapId, 'issuer-shared');
});

test('대상 확인은 읽기만 하고 연결 확정은 빈 공유 맵만 새로 만든다', () => {
  const state = createScenario('code-entry');
  const before = structuredClone(state);
  assert.equal(redeemCode(state, '[연결 코드]', 'user-b').owner.name, '사용자 A');
  assert.deepEqual(state, before);
  const result = confirmConnect(state, '[연결 코드]', 'user-b');
  assert.equal(result.ok, true);
  assert.deepEqual(state, before);
  const shared = result.state.maps.filter((map) => map.type === 'shared');
  assert.equal(shared.length, 1);
  assert.deepEqual(shared[0].memberIds, ['user-a', 'user-b']);
  assert.equal(result.state.places.filter((place) => place.mapId === shared[0].id).length, 0);
  assert.deepEqual(result.state.maps.filter((map) => map.type === 'personal'), before.maps);
  assert.deepEqual(result.state.places, before.places);
  assert.equal(result.state.dmDefaultTarget, before.dmDefaultTarget);
  assert.equal(result.state.codes[0].status, 'used');
  assert.equal(confirmConnect(result.state, '[연결 코드]', 'user-b').ok, false);
});

test('대상 확인 후 취소·재발급·공유 맵 생성이 끼어들어도 확정 시 재검사한다', () => {
  const state = createScenario('code-entry');
  assert.equal(redeemCode(state, '[연결 코드]', 'user-b').ok, true);
  for (const codes of [cancelCode(state.codes, 'code-a'), issueCode(state.codes, 'user-a', 20)]) {
    assert.equal(confirmConnect({ ...state, codes }, '[연결 코드]', 'user-b').reason, 'unusable');
  }
  state.maps.push({ id: 'new-shared', type: 'shared', active: true, memberIds: ['user-b', 'user-c'] });
  assert.equal(confirmConnect(state, '[연결 코드]', 'user-b').reason, 'already-shared');
});
