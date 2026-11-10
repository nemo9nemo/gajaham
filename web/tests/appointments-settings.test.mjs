import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenario } from '../src/data/scenarios.js';
import { chooseCandidate, appointmentFor, removeCandidate, selectAppointment, visitAppointment } from '../src/logic/appointments.js';
import { setDmDefault, exportRecords, leaveSharedMap, trashedPlaces } from '../src/logic/settings.js';
import { submitIntake } from '../src/logic/intake.js';
import { buildCopyDraft, executeCopy } from '../src/logic/copy.js';
import { restorePlace, trashPlace } from '../src/logic/place-edit.js';
import { visibleMaps, switchMap } from '../src/logic/maps.js';
import { issueCode, confirmConnect } from '../src/logic/code.js';
import { reduceAction } from '../src/store.js';
import { renderRoute } from '../src/router.js';

test('약속 후보는 공유 장소만 최대 3곳이며 교체해도 장소 자체는 보존한다', () => {
  const state = createScenario('appointment-full');
  const before = structuredClone(state);
  assert.equal(chooseCandidate(state, 'pb-art').reason, 'no-access');
  assert.equal(chooseCandidate(state, 'shared-soup').reason, 'full');
  const replaced = chooseCandidate(state, 'shared-soup', 'shared-wine').state;
  assert.deepEqual(appointmentFor(replaced).candidateIds, ['shared-cafe', 'shared-soup', 'shared-pasta']);
  assert.deepEqual(replaced.places, state.places);
  assert.deepEqual(state, before);
  const removed = removeCandidate(replaced, 'shared-pasta');
  assert.deepEqual(appointmentFor(chooseCandidate(removed, 'shared-wine', 'shared-soup').state).candidateIds, ['shared-cafe', 'shared-wine']);
});

test('최종 선택·방문은 공유 장소에만 적용하고 삭제·권한 종료 후에는 거부한다', () => {
  const state = createScenario('appointment-compare');
  const personal = structuredClone(state.places.filter((place) => place.mapId === 'personal-b'));
  const selected = selectAppointment(state, 'shared-cafe');
  const visited = visitAppointment(selected);
  assert.equal(appointmentFor(visited).selectedBy, 'user-b');
  assert.equal(appointmentFor(visited).visitedBy, 'user-b');
  assert.equal(visited.places.find((place) => place.id === 'shared-cafe').visit, 'visited');
  assert.deepEqual(visited.places.filter((place) => place.mapId === 'personal-b'), personal);
  const deleted = trashPlace(visited, 'shared-cafe');
  assert.equal(appointmentFor(deleted).chosenId, null);
  const ended = leaveSharedMap(visited, 'shared-ab');
  assert.equal(chooseCandidate(ended, 'shared-wine').reason, 'no-access');
  assert.equal(visitAppointment(ended), ended);
  assert.equal(selectAppointment(ended, 'shared-cafe'), ended);
});

test('DM 기본값은 이후 접수에만 적용되고 웹 현재 맵·기존 처리 대상과 독립이다', () => {
  let state = createScenario('connected-personal');
  const oldRequest = submitIntake(state, 'instagram.com/p/dm-old', 'personal');
  state = oldRequest.state;
  const previousTargets = [...state.intake.jobs[0].targetMapIds];
  state = reduceAction(state, 'dm-choice', 'shared-ab');
  assert.equal(state.ui.dmChoice, 'shared');
  state = reduceAction(state, 'dm-save');
  assert.equal(state.dmDefaultTarget, 'shared');
  assert.deepEqual(state.intake.jobs[0].targetMapIds, previousTargets);
  state = reduceAction(state, 'dm-demo-submit');
  assert.deepEqual(state.intake.jobs.at(-1).targetMapIds, ['shared-ab']);
  state = switchMap(state, 'personal-b');
  state = reduceAction(state, 'link-start');
  assert.equal(state.intake.draft.target, 'personal-b');
  assert.equal(state.dmDefaultTarget, 'shared');
  assert.equal(setDmDefault(state, 'personal-a'), state);
});

test('공유 종료는 개인 복제본·남은 사람의 공유 기록·계정 정보를 보존한다', () => {
  const state = createScenario('connected');
  const copied = executeCopy(state, buildCopyDraft(state, { sourceMapId: 'shared-ab', targetMapId: 'personal-b', placeIds: ['shared-wine'] }).draft).state;
  const before = structuredClone(copied);
  const ended = leaveSharedMap({ ...copied, dmDefaultTarget: 'both' }, 'shared-ab');
  assert.deepEqual(ended.places, before.places);
  assert.deepEqual(ended.users, before.users);
  assert.equal(ended.dmAccountVerified, before.dmAccountVerified);
  assert.equal(ended.currentMapId, 'personal-b');
  assert.equal(ended.dmDefaultTarget, 'personal');
  assert.deepEqual(visibleMaps(ended).map((map) => map.id), ['personal-b']);
  assert.ok(visibleMaps(ended, 'user-a').some((map) => map.id === 'shared-ab'));
  for (const suffix of ['', '/history', '/edit', '/location']) assert.doesNotMatch(renderRoute(ended, `#/place/shared-cafe${suffix}`), /피스타치오|서울숲|shared-cafe/);
  assert.deepEqual(copied, before);
});

test('종료 후 새 연결은 새 공유 맵을 만들며 예전 장소를 자동 공개하지 않는다', () => {
  let state = leaveSharedMap(createScenario('connected'), 'shared-ab');
  state.users = [...state.users, { id: 'user-c', name: '사용자 C', initial: 'C' }];
  state.codes = issueCode([], 'user-c', 1);
  const result = confirmConnect(state, state.codes[0].value, 'user-b');
  assert.equal(result.ok, true);
  assert.notEqual(result.sharedMapId, 'shared-ab');
  assert.deepEqual(result.state.places.filter((place) => place.mapId === result.sharedMapId), []);
});

test('내보내기·휴지통은 접근 가능한 맵만 포함하고 내부 계보·사진은 제외한다', () => {
  const state = createScenario('settings-trash');
  const data = exportRecords(state, ['personal-a', 'personal-b', 'shared-ab']);
  assert.equal(data.maps.length, 2);
  assert.doesNotMatch(JSON.stringify(data), /예시 개인 서점|예시 개인 찻집|copyOf|placeKey|photos|personal-a/);
  assert.deepEqual(trashedPlaces(state, 'personal-a'), []);
  const before = structuredClone(state.places.filter((place) => place.mapId === 'personal-b'));
  const restored = restorePlace(state, 'shared-soup');
  assert.equal(trashedPlaces(restored, 'shared-ab').length, 1);
  assert.deepEqual(restored.places.filter((place) => place.mapId === 'personal-b'), before);
  assert.deepEqual(exportRecords({ ...state, loggedIn: false }, ['personal-b']), { maps: [], processing: [] });
});

test('정책 미정인 삭제·탈퇴 진입은 기록이나 계정을 삭제하지 않는다', () => {
  const state = createScenario('settings-account');
  for (const option of ['account', 'records']) {
    const next = reduceAction(state, 'account-policy', option);
    assert.deepEqual(next.places, state.places);
    assert.deepEqual(next.users, state.users);
    assert.deepEqual(next.maps, state.maps);
    assert.match(next.ui.policyNotice, /지금은.*삭제하지 않아요/);
  }
});

test('확장 화면은 로그인·항목 소유권·출력 이스케이프 경계를 유지한다', () => {
  const state = createScenario('inbox-unreadable');
  const id = state.intake.jobs[0].id;
  state.intake.jobs[0].sourceUrl = '<script>비공개</script>';
  state.intake.jobs[0].supplement = '</textarea><img src=x onerror=alert(1)>';
  const markup = renderRoute(state, `#/inbox/${id}/supplement`);
  assert.doesNotMatch(markup, /<script>|<img src=x/);
  assert.match(markup, /&lt;\/textarea&gt;/);
  for (const route of ['#/links/new', '#/inbox', `#/inbox/${id}`, '#/appointments', '#/settings', '#/settings/export']) assert.match(renderRoute({ ...state, loggedIn: false }, route), /로그인/);
});

test('리뷰 회귀: 새 상대와 연결하면 공개 범위도 현재 참여자로 표시한다', () => {
  let state = leaveSharedMap(createScenario('connected'), 'shared-ab');
  state.users.push({ id: 'user-c', name: '사용자 C', initial: 'C' });
  state.codes = issueCode([], 'user-c', 8);
  const result = confirmConnect(state, state.codes[0].value, 'user-b');
  state = switchMap(result.state, result.sharedMapId);
  state = reduceAction(state, 'link-start');
  for (const route of ['#/links/new', '#/settings', '#/settings/dm']) {
    const markup = renderRoute(state, route);
    assert.match(markup, /사용자 C/);
    assert.doesNotMatch(markup, /사용자 A/);
  }
});

test('선택 변경은 이전 장소의 방문 표시자를 이어받지 않는다', () => {
  let state = createScenario('appointment-visited');
  state = chooseCandidate(state, 'shared-soup', 'shared-pasta').state;
  state = selectAppointment(state, 'shared-soup');
  assert.equal(appointmentFor(state).visitedBy ?? null, null);
  state = selectAppointment(state, 'shared-wine');
  state = visitAppointment({ ...state, currentUserId: 'user-a' });
  assert.equal(appointmentFor(state).visitedBy, 'user-a');
});
