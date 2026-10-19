import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenario } from '../src/data/scenarios.js';
import { demoPlace, branchCandidates } from '../src/data/complete-demo.js';
import { parseIntakeUrl, submitIntake, processIntake, resolveJob, findJob, ownedJobs, changeJobTargets, supplementJob, keepJobLink, deleteJob, addJobPlace } from '../src/logic/intake.js';
import { leaveSharedMap } from '../src/logic/settings.js';
import { buildCopyDraft, executeCopy } from '../src/logic/copy.js';
import { reduceAction } from '../src/store.js';
import { renderRoute } from '../src/router.js';
import { issueCode, confirmConnect } from '../src/logic/code.js';
import { updatePlaceInfo, updateLocation } from '../src/logic/place-edit.js';
import { demoSearchOptions } from '../src/logic/complete-actions.js';

const submit = (state, target = 'both', url = 'instagram.com/p/[단위-시연]') => submitIntake(state, url, target, { template: demoPlace('soup') });

test('링크는 정규화하고 위험한 프로토콜·인증 정보·공백 입력을 거부한다', () => {
  assert.deepEqual(parseIntakeUrl('  www.instagram.com/reel/demo/?tracking=1  '), { url: 'instagram.com/reel/demo', originalUrl: 'www.instagram.com/reel/demo/?tracking=1', supported: true });
  assert.equal(parseIntakeUrl('blog.example/post').supported, false);
  assert.equal(parseIntakeUrl('instagram.com.evil.example/p/demo').supported, false);
  for (const value of ['', 'javascript:alert(1)', 'ftp://example.invalid/a', 'data:text/plain,hello', 'https://user:password@example.invalid/a', 'place name', 'localhost']) assert.equal(parseIntakeUrl(value), null, value);
});

test('웹 접수는 현재 맵과 공개 범위를 사용하고 접수만으로 장소를 저장하지 않는다', () => {
  let state = createScenario('connected-personal');
  const before = structuredClone(state);
  state = reduceAction(state, 'link-start');
  assert.equal(state.intake.draft.target, 'personal-b');
  state = reduceAction(state, 'link-url', 'instagram.com/p/[새 링크]');
  assert.equal(state.intake.draft.url, 'instagram.com/p/[새 링크]');
  assert.equal(state.intake.jobs.length, 0);
  state = reduceAction(state, 'link-url', 'instagram.com/p/demo-web');
  state = reduceAction(state, 'link-submit');
  const job = state.intake.jobs[0];
  assert.equal(job.stage, 'processing');
  assert.deepEqual(job.targetMapIds, ['personal-b']);
  assert.deepEqual(state.places, before.places);
  assert.equal(state.dmDefaultTarget, before.dmDefaultTarget);
  assert.match(renderRoute(state, state.ui.navigateTo), /접수됨 · 아직 저장 전/);
});

test('둘 다 부분 실패는 실패한 대상만 재처리하고 완료 대상·원본·메모를 보존한다', () => {
  const initial = createScenario('connected');
  const before = structuredClone(initial);
  const request = submit(initial);
  const injected = { ...request.state, mock: { ...request.state.mock, intakeFailMapIds: ['shared-ab'] } };
  const first = processIntake(injected, request.job.id);
  assert.equal(first.job.stage, 'partial');
  assert.deepEqual(first.job.results.map((result) => result.status), ['saved', 'failed']);
  const personalId = first.job.results[0].placeId;
  const personal = structuredClone(first.state.places.find((place) => place.id === personalId));
  const retry = processIntake({ ...first.state, mock: { ...first.state.mock, intakeFailMapIds: [] } }, request.job.id);
  assert.equal(retry.job.stage, 'saved');
  assert.deepEqual(retry.state.places.find((place) => place.id === personalId), personal);
  assert.deepEqual(processIntake(retry.state, request.job.id).state.places, retry.state.places);
  assert.deepEqual(initial, before);
});

test('동일 링크·동일 지점의 출처 추가는 사용자 수정을 덮어쓰지 않는다', () => {
  let state = createScenario('connected');
  const original = state.places.find((place) => place.id === 'shared-soup');
  original.name = '내가 고친 국밥집';
  original.memo = { text: '남길 메모', authorId: 'user-a' };
  const request = submit(state, 'shared-ab');
  const first = processIntake(request.state, request.job.id);
  assert.equal(first.job.results[0].outcome, 'source-added');
  assert.equal(first.job.results[0].placeId, original.id);
  assert.equal(first.state.places.find((place) => place.id === original.id).name, original.name);
  const secondRequest = submit(first.state, 'shared-ab');
  const second = processIntake(secondRequest.state, secondRequest.job.id);
  assert.equal(second.job.results[0].outcome, 'unchanged');
  assert.deepEqual(second.state.places, first.state.places);
  assert.deepEqual(second.state.places.find((place) => place.id === original.id).memo, original.memo);
});

test('저장 직전 공유 권한 종료를 재확인하고 개인 성공을 유지하며 대상만 바꾼다', () => {
  const request = submit(createScenario('connected'));
  const ended = leaveSharedMap(request.state, 'shared-ab');
  const result = processIntake(ended, request.job.id);
  assert.equal(result.job.stage, 'partial');
  assert.equal(result.job.results[1].reason, 'access-ended');
  assert.deepEqual(result.state.places.filter((place) => place.mapId === 'shared-ab'), request.state.places.filter((place) => place.mapId === 'shared-ab'));
  const changed = changeJobTargets(result.state, request.job.id, 'personal-b');
  assert.equal(changed.job.stage, 'saved');
  assert.deepEqual(changed.job.requestedMapIds, ['personal-b', 'shared-ab']);
  assert.deepEqual(changed.job.targetMapIds, ['personal-b']);
  assert.deepEqual(changed.state.places, result.state.places);
  assert.equal(changeJobTargets(changed.state, request.job.id, 'shared-ab').state, changed.state);
});

test('다른 사람·로그아웃·삭제 항목은 열거나 후속 저장할 수 없다', () => {
  const request = submit(createScenario('connected'));
  const other = { ...request.state, currentUserId: 'user-a' };
  assert.equal(findJob(other, request.job.id), null);
  assert.deepEqual(ownedJobs(other), []);
  assert.equal(processIntake(other, request.job.id).state, other);
  assert.doesNotMatch(renderRoute(other, `#/inbox/${request.job.id}`), /단위-시연|예시 국밥집/);
  const deleted = deleteJob(request.state, request.job.id);
  assert.equal(processIntake(deleted, request.job.id).state, deleted);
  assert.deepEqual(deleted.places, request.state.places);
  assert.deepEqual(ownedJobs({ ...request.state, loggedIn: false }), []);
  assert.equal(submit({ ...request.state, loggedIn: false }).state.loggedIn, false);
  assert.equal(submitIntake({ ...request.state, dmAccountVerified: false }, 'instagram.com/p/demo', 'personal', { origin: 'dm' }).reason, 'verify-account');
});

test('지점 선택 전에는 저장·핀을 만들지 않고 명시적 확인 후 메뉴 없이 저장한다', () => {
  const state = createScenario('inbox-ambiguous');
  const count = state.places.length;
  const job = state.intake.jobs[0];
  assert.equal(processIntake(state, job.id).reason, 'needs-confirmation');
  assert.equal(state.places.length, count);
  const result = resolveJob(state, job.id, branchCandidates()[1]);
  const place = result.state.places.find((item) => item.id === result.job.results[0].placeId);
  assert.equal(place.name, '예시 파스타 · 합정점');
  assert.equal(place.locationStatus, 'confirmed');
  assert.equal(place.menu, null);
  assert.equal(resolveJob(result.state, job.id, demoPlace()).reason, 'already-saved');
});

test('미지원 링크 보관·보완 입력은 분석이나 장소 저장으로 처리하지 않는다', () => {
  const state = createScenario('link-unsupported');
  const job = state.intake.jobs[0];
  assert.equal(processIntake(state, job.id).reason, 'needs-confirmation');
  const supplemented = supplementJob(state, job.id, { text: '<보완 본문>', capture: true });
  const kept = keepJobLink(supplemented, job.id);
  assert.equal(findJob(kept, job.id).stage, 'link-only');
  assert.deepEqual(kept.places, state.places);
  const manual = resolveJob(kept, job.id, branchCandidates()[0]);
  assert.equal(manual.job.stage, 'saved');
  const place = manual.state.places.find((item) => item.id === manual.job.results[0].placeId);
  assert.equal(place.menu, null);
  assert.equal(place.inputOrigin, 'manual');
  const markup = renderRoute(manual.state, `#/place/${place.id}`);
  assert.match(markup, /직접 연결한 장소|사용자 입력/);
  assert.match(markup, /원본 링크/);
  assert.doesNotMatch(markup, /인스타 게시물|자동 추출/);
  const copied = executeCopy(manual.state, buildCopyDraft(manual.state, {
    sourceMapId: 'shared-ab', targetMapId: 'personal-b', placeIds: [place.id],
  }).draft);
  const privateId = copied.result.items[0].targetPlaceId;
  assert.equal(copied.state.places.find((item) => item.id === privateId).inputOrigin, 'manual');
  assert.doesNotMatch(renderRoute(copied.state, `#/place/${privateId}`), /인스타 게시물|자동 추출/);
});

test('한 게시물의 남은 장소를 수동 연결해도 서로 다른 장소를 같은 링크로 합치지 않는다', () => {
  const state = createScenario('inbox-multiple');
  const parent = state.intake.jobs[0];
  const first = addJobPlace(state, parent.id, branchCandidates()[0]);
  assert.equal(first.job.unresolvedNames.length, 1);
  const second = addJobPlace(first.state, parent.id, branchCandidates()[1]);
  assert.equal(second.job.stage, 'saved');
  assert.equal(second.job.childIds.length, 2);
  const childPlaces = second.job.childIds.map((id) => findJob(second.state, id)).map((job) => second.state.places.find((place) => place.id === job.results[0].placeId));
  assert.notEqual(childPlaces[0].id, childPlaces[1].id);
  assert.ok(childPlaces.every((place) => place.sourceUrl === parent.originalUrl && place.memo === null));
  assert.deepEqual(state.intake.jobs[0].unresolvedNames, ['언급된 장소 2', '언급된 장소 3']);
});

test('폼·실패 재시도·수동 확인·목록 필터는 실제 리듀서와 연결된다', () => {
  let state = createScenario('inbox-delayed');
  const delayed = state.ui.activeJobId;
  state = reduceAction(state, 'job-retry', state.ui.retryJobId);
  assert.equal(findJob(state, state.ui.activeJobId).stage, 'saved');
  assert.equal(findJob(state, delayed).stage, 'processing');
  state = reduceAction(state, 'inbox-filter', '완료');
  const markup = renderRoute(state, '#/inbox');
  assert.doesNotMatch(markup, new RegExp(findJob(state, delayed).sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(markup, /저장 완료/);
});

test('공유 종료 후 남은 웹 초안의 표시 대상과 실제 저장 대상이 일치한다', () => {
  let state = createScenario('link-shared');
  state = reduceAction(state, 'link-target', 'both');
  state = leaveSharedMap(state, 'shared-ab');
  const markup = renderRoute(state, '#/links/new');
  assert.doesNotMatch(markup, /사용자 A, 사용자 B/);
  state = reduceAction(state, 'link-submit');
  assert.deepEqual(state.intake.jobs[0].targetMapIds, ['personal-b']);
});

test('여러 장소의 이전 부분 실패를 숨기지 않고 자식 재시도 후 부모 완료를 갱신한다', () => {
  let state = createScenario('inbox-multiple');
  const parentId = state.intake.jobs[0].id;
  state.mock.intakeFailMapIds = ['shared-ab'];
  const failedPart = addJobPlace(state, parentId, branchCandidates()[0]);
  const childId = failedPart.job.childIds[0];
  state = { ...failedPart.state, mock: { ...failedPart.state.mock, intakeFailMapIds: [] } };
  const next = addJobPlace(state, parentId, branchCandidates()[1]);
  assert.equal(findJob(next.state, parentId).unresolvedNames.length, 0);
  assert.equal(findJob(next.state, parentId).stage, 'partial');
  assert.match(renderRoute(next.state, `#/inbox/${parentId}/multiple`), /미완료 대상만 다시 저장/);
  const retried = processIntake(next.state, childId);
  assert.equal(findJob(retried.state, parentId).stage, 'saved');
  const deleted = deleteJob(retried.state, parentId);
  assert.deepEqual(ownedJobs(deleted), []);
  assert.equal(processIntake(deleted, childId).state, deleted);
  assert.deepEqual(deleted.places, retried.state.places);
});

test('리뷰 회귀: 새 연결 후 여러 장소 보완은 접수한 맵 ID만 유지한다', () => {
  const request = submit(createScenario('connected'));
  let state = processIntake(request.state, request.job.id).state;
  state.intake.jobs[0] = { ...state.intake.jobs[0], stage: 'partial', unresolvedNames: ['장소 2', '장소 3'] };
  state = leaveSharedMap(state, 'shared-ab');
  state.users = [...state.users, { id: 'user-c', name: '사용자 C', initial: 'C' }];
  state.codes = issueCode([], 'user-c', 4);
  const connected = confirmConnect(state, state.codes[0].value, 'user-b');
  const result = addJobPlace(connected.state, request.job.id, branchCandidates()[0]);
  const child = findJob(result.state, result.job.childIds[0]);
  assert.deepEqual(child.targetMapIds, ['personal-b', 'shared-ab']);
  assert.equal(child.results.find((item) => item.mapId === 'shared-ab').reason, 'access-ended');
  assert.deepEqual(result.state.places.filter((place) => place.mapId === connected.sharedMapId), []);
});

test('리뷰 회귀: 보관한 원본 URL의 콘텐츠 식별 쿼리를 보존한다', () => {
  const firstUrl = 'blog.naver.com/PostView.naver?blogId=demo&logNo=111';
  const secondUrl = 'blog.naver.com/PostView.naver?blogId=demo&logNo=222';
  assert.notEqual(parseIntakeUrl(firstUrl).url, parseIntakeUrl(secondUrl).url);
  const request = submitIntake(createScenario('connected'), firstUrl, 'shared-ab');
  assert.equal(request.job.sourceUrl, firstUrl);
  const saved = resolveJob(request.state, request.job.id, branchCandidates()[0]);
  assert.equal(saved.state.places.find((place) => place.id === saved.job.results[0].placeId).sourceUrl, firstUrl);
});

test('리뷰 회귀: 개인만 유지하면 미완료 하위 저장도 개인으로 바뀌고 완료된다', () => {
  const request = submit(createScenario('connected'));
  let state = processIntake(request.state, request.job.id).state;
  state.intake.jobs[0] = { ...state.intake.jobs[0], stage: 'partial', unresolvedNames: ['장소 2'] };
  state.mock.intakeFailMapIds = ['shared-ab'];
  const added = addJobPlace(state, request.job.id, branchCandidates()[0]);
  const childId = added.job.childIds[0];
  const ended = leaveSharedMap(added.state, 'shared-ab');
  const changed = changeJobTargets(ended, request.job.id, 'personal-b');
  assert.deepEqual(findJob(changed.state, childId).targetMapIds, ['personal-b']);
  assert.equal(findJob(changed.state, childId).stage, 'saved');
  assert.equal(changed.job.stage, 'saved');
  assert.deepEqual(changed.state.places, ended.places);
});

test('리뷰 회귀: 미확정 수가 0이어도 하위 실패 결과를 다시 열 수 있다', () => {
  let state = createScenario('inbox-multiple');
  state.mock.intakeFailMapIds = ['shared-ab'];
  const failed = addJobPlace(state, 'intake-1', branchCandidates()[0]);
  state = { ...failed.state, mock: { ...failed.state.mock, intakeFailMapIds: [] } };
  state = addJobPlace(state, 'intake-1', branchCandidates()[1]).state;
  assert.equal(findJob(state, 'intake-1').unresolvedNames.length, 0);
  assert.match(renderRoute(state, '#/inbox/intake-1'), /여러 장소 결과|여러 장소 확인/);
});

test('리뷰 회귀: 처리함 연결 대기는 본인 확인 후 같은 항목으로 이어진다', () => {
  let state = createScenario('inbox-demo');
  const waiting = state.intake.jobs.find((job) => job.stage === 'waiting');
  const count = state.intake.jobs.length;
  state = reduceAction(state, 'job-verify-account', waiting.id);
  state = reduceAction(state, 'verify-account');
  state = reduceAction(state, 'confirm-intake');
  assert.equal(findJob(state, waiting.id).stage, 'processing');
  assert.equal(state.intake.jobs.length, count);
  assert.equal(state.ui.navigateTo, `#/inbox/${waiting.id}`);
  const processed = processIntake(state, waiting.id);
  assert.equal(processed.ok, true);
  assert.equal(processed.job.stage, 'saved');
});

test('대상 변경은 미완료 부분에만 적용하고 완료한 대표 장소를 새 공유 맵에 다시 보내지 않는다', () => {
  let state = createScenario('inbox-multiple');
  state.mock.intakeFailMapIds = ['shared-ab'];
  state = addJobPlace(state, 'intake-1', branchCandidates()[0]).state;
  const childId = findJob(state, 'intake-1').childIds[0];
  state = leaveSharedMap(state, 'shared-ab');
  state.users.push({ id: 'user-c', name: '사용자 C', initial: 'C' });
  state.codes = issueCode([], 'user-c', 15);
  const connected = confirmConnect(state, state.codes[0].value, 'user-b');
  state = changeJobTargets(connected.state, 'intake-1', 'both').state;
  assert.match(renderRoute(state, '#/inbox/intake-1/multiple'), new RegExp(`data-id="${childId}"`));
  state = processIntake(state, 'intake-1').state;
  assert.equal(state.places.filter((place) => place.mapId === connected.sharedMapId).length, 0);
  state = processIntake(state, childId).state;
  assert.equal(state.places.filter((place) => place.mapId === connected.sharedMapId).length, 1);
  assert.deepEqual(findJob(state, 'intake-1').requestedMapIds, ['shared-ab']);
});

test('이전 상대에게 고른 둘 다 선택은 새 연결의 저장 동의로 재사용하지 않는다', () => {
  let state = createScenario('inbox-multiple');
  state = reduceAction(state, 'route-params', { id: 'intake-1' });
  state = reduceAction(state, 'job-target-choice', 'both');
  state = leaveSharedMap(state, 'shared-ab');
  state.users.push({ id: 'user-c', name: '사용자 C', initial: 'C' });
  state.codes = issueCode([], 'user-c', 19);
  state = confirmConnect(state, state.codes[0].value, 'user-b').state;
  state = reduceAction(state, 'job-target-apply');
  assert.deepEqual(findJob(state, 'intake-1').targetMapIds, ['personal-b']);
});

test('기존 장소에 추가한 출처의 원본 버튼은 해당 글 주소를 표시한다', () => {
  const url = 'blog.naver.com/PostView.naver?blogId=demo&logNo=333';
  const request = submitIntake(createScenario('connected'), url, 'shared-ab');
  const result = resolveJob(request.state, request.job.id, demoPlace('soup'));
  const place = result.state.places.find((item) => item.id === result.job.results[0].placeId);
  let state = reduceAction(result.state, 'route-params', { id: place.id });
  state = reduceAction(state, 'source-entry', String(place.sources.length - 1));
  assert.equal(state.ui.notice, `원본 링크: ${url}`);
});

test('R2 회귀: 지점 키 없는 장소의 이름을 수정한 뒤 같은 링크를 보내도 중복하지 않는다', () => {
  const url = 'blog.example/one-post';
  const request = submitIntake(createScenario('connected'), url, 'shared-ab');
  const first = resolveJob(request.state, request.job.id, demoPlace('bakery'));
  const placeId = first.job.results[0].placeId;
  const edited = updatePlaceInfo(first.state, placeId, { name: '내가 고친 베이커리' });
  const again = submitIntake(edited, url, 'shared-ab');
  const next = resolveJob(again.state, again.job.id, demoPlace('bakery'));
  assert.equal(next.job.results[0].placeId, placeId);
  assert.deepEqual(next.state.places, edited.places);
});

test('R2 회귀: 저장된 미지원 링크에서 보관을 다시 눌러도 완료 상태와 결과가 유지된다', () => {
  const request = submitIntake(createScenario('connected'), 'blog.example/post', 'personal-b');
  const saved = resolveJob(request.state, request.job.id, demoPlace('bakery'));
  const kept = keepJobLink(saved.state, request.job.id);
  assert.equal(findJob(kept, request.job.id).stage, 'saved');
  assert.match(renderRoute(kept, `#/links/result/${request.job.id}`), /선택한 맵에 저장했어요/);
  assert.deepEqual(kept.places, saved.state.places);
});

test('R2 회귀: 결과에서 저장된 맵 보기 액션은 현재 맵과 검색 필터를 전환한다', () => {
  let state = createScenario('connected-empty-shared');
  state = reduceAction(state, 'link-start');
  state = reduceAction(state, 'link-url', 'instagram.com/p/target-personal');
  state = reduceAction(state, 'link-target', 'personal-b');
  state = reduceAction(state, 'link-submit');
  const id = state.intake.jobs[0].id;
  state = processIntake(state, id).state;
  state.ui = { ...state.ui, query: '없는 검색', category: '놀거리' };
  const markup = renderRoute(state, `#/links/result/${id}`);
  assert.match(markup, /data-action="show-intake-map" data-id="personal-b"/);
  state = reduceAction(state, 'route-params', { id });
  state = reduceAction(state, 'show-intake-map', 'personal-b');
  assert.equal(state.currentMapId, 'personal-b');
  assert.equal(state.ui.query, '');
  assert.equal(state.ui.category, '전체');
  assert.equal(state.ui.navigateTo, '#/map');
});

test('R2 회귀: 개인 카드와 같은 지점이어도 수정한 공유 이름으로 검색할 수 있다', () => {
  let state = createScenario('connected');
  state = updatePlaceInfo(state, 'shared-cafe', { name: '고친 이름 로즈 카페' });
  const matches = demoSearchOptions(state, '로즈');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].name, '고친 이름 로즈 카페');
});

test('이름을 고친 수동 장소를 복제한 맵에서도 같은 원본을 다시 보내면 기존 카드를 유지한다', () => {
  const request = submitIntake(createScenario('connected'), 'blog.example/copy-source', 'personal-b');
  const saved = resolveJob(request.state, request.job.id, demoPlace('bakery'));
  const sourceId = saved.job.results[0].placeId;
  const edited = updatePlaceInfo(saved.state, sourceId, { name: '바꾼 빵집' });
  const draft = buildCopyDraft(edited, { sourceMapId: 'personal-b', targetMapId: 'shared-ab', placeIds: [sourceId] });
  const copied = executeCopy(edited, draft.draft);
  const again = submitIntake(copied.state, 'blog.example/copy-source', 'shared-ab');
  const result = resolveJob(again.state, again.job.id, demoPlace('bakery'));
  assert.equal(result.job.results[0].placeId, copied.result.items[0].targetPlaceId);
  assert.deepEqual(result.state.places, copied.state.places);
});

test('R3 회귀: 완료 후 과거 보완 화면에서 재분석해도 완료와 저장 결과를 유지한다', () => {
  let state = createScenario('inbox-unreadable');
  state = reduceAction(state, 'route-params', { id: 'intake-1' });
  state = reduceAction(state, 'job-supplement', '보완한 본문');
  state = reduceAction(state, 'job-reanalyze');
  state = processIntake(state, 'intake-1').state;
  const before = structuredClone(state.intake.jobs[0]);
  const places = structuredClone(state.places);
  state = reduceAction(state, 'job-reanalyze');
  assert.deepEqual(findJob(state, 'intake-1'), before);
  assert.deepEqual(state.places, places);
  assert.match(renderRoute(state, '#/links/result/intake-1'), /선택한 맵에 저장했어요/);
});

test('R3 회귀: 지점 키 없이 위치 보정한 기존 카드를 직접 선택하면 새 출처만 더한다', () => {
  let state = updateLocation(createScenario('inbox-no-place'), 'shared-bakery', { x: 42, y: 40 });
  const original = structuredClone(state.places.find((place) => place.id === 'shared-bakery'));
  const count = state.places.length;
  const template = demoSearchOptions(state, '베이커리').find((place) => place.id === 'shared-bakery');
  assert.ok(template, '개인 카드에 가려지지 않고 대상 맵의 기존 카드를 고를 수 있어야 한다');
  const saved = resolveJob(state, 'intake-1', template, { manual: true });
  assert.equal(saved.job.results[0].placeId, original.id);
  assert.equal(saved.state.places.length, count);
  const after = saved.state.places.find((place) => place.id === original.id);
  for (const field of ['name', 'pin', 'memo', 'visit', 'edits']) assert.deepEqual(after[field], original[field]);
  assert.equal(after.sources.length, original.sources.length + 1);
});

test('직접 선택한 기존 카드의 저장 재시도는 중간 이름 변경에도 같은 카드를 유지한다', () => {
  let state = createScenario('inbox-no-place');
  state.mock.intakeFailMapIds = ['shared-ab'];
  const selected = demoSearchOptions(state, '베이커리').find((place) => place.id === 'shared-bakery');
  const failed = resolveJob(state, 'intake-1', selected, { manual: true });
  state = updatePlaceInfo(failed.state, 'shared-bakery', { name: '재시도 전 고친 이름' });
  state.mock = { ...state.mock, intakeFailMapIds: [] };
  const result = processIntake(state, 'intake-1');
  assert.equal(result.job.results[0].placeId, 'shared-bakery');
  assert.equal(result.state.places.length, state.places.length);
  assert.equal(result.state.places.find((place) => place.id === 'shared-bakery').name, '재시도 전 고친 이름');
});
