import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { CATALOG, catalogState } from '../src/screens/catalog.js';
import { parseRoute, renderRoute } from '../src/router.js';
import { SCENARIOS, createScenario } from '../src/data/scenarios.js';
import { createStore, reduceAction } from '../src/store.js';
import { CODE_STATUS, UNUSABLE_CODE_MESSAGE, cancelCode } from '../src/logic/code.js';
import { createStaticServer } from '../scripts/serve.mjs';

const EXPECTED = {
  '1-1': ['가자함', '첫 링크 저장하기', '로그인', 'DM으로 전달하거나 링크 입력', '게시물·릴스를 서비스 계정에 DM으로 보내거나 링크를 붙여 넣으면, 확인할 수 있는 내용에서 장소와 게시물 내용을 정리해 내 맵에 보관해요.'],
  '1-2': ['비공개 임시 접수', '본인 확인 전에는 어느 맵에도 저장되지 않고', '로그인하고 본인 확인'],
  '1-3': ['DM을 보낸 계정이 본인 계정인가요?', '2 DM 계정 확인', '네, 제 계정이에요'],
  '1-4': ['어디에 저장할까요?', 'aria-disabled="true"', '내 개인 맵에 저장 요청', '요청 후 처리함에서 결과를 확인해요'],
  '1-5': ['함께 쓸 사람과 공유 맵을 만들어요', '[연결 코드]', '사용 가능', '코드 복사', '재발급'],
  '1-6': [...Object.values(CODE_STATUS).flatMap((status) => [status.label, status.description]), UNUSABLE_CODE_MESSAGE],
  '1-7': ['연결 코드', '사용자 A', '이 사람과 공유 맵을 만들까요?', '연결하기'],
  '1-8': ['연결됐어요', '그대로 유지', '새로 생김', 'DM 기본 저장 위치는 그대로 ‘개인 맵’이에요.'],
  '1-9': ['이미 공유 맵에 참여 중', '이미 함께 쓰는 공유 맵이 있어요', '지금 공유 맵 보기'],
  '4-1': ['내 개인 맵', '함께 쓰기', '위치 미확정 1곳', '+ 링크 등록'],
  '4-2': ['우리 공유 맵', '이미지 없음', '테라스 분위기와 피스타치오 음료', '보낸 사람 A · 가고 싶어: A'],
  '4-3': ['맵 전환', '장소 4곳', '지금 보는 맵', 'DM 기본 저장 위치는 바뀌지 않아요.'],
  '4-4': ['방문 전체', '보낸 사람 전체', '사용자 A', '사용자 B', '위치 미확정 · 지도에 표시 안 됨', '선택해서 복제', '전체 복제'],
  '4-5': ['아직 저장한 장소가 없어요', 'DM으로 보내는 방법'],
  '4-6': ['공유 맵에 아직 장소가 없어요', '내 개인 맵에서 복제', '사용자 A, 사용자 B에게 보여요.'],
  '4-7': ['연남 파스타', '맞는 장소가 없어요', '검색어 지우기', '메뉴·메모 내용은 검색되지 않아요.'],
  '4-8': ['지도를 불러오지 못했어요', '목록과 원본 링크는 그대로 이용할 수 있어요.', '다시 시도', '원본'],
};

for (const entry of CATALOG) {
  test(`${entry.id} 카탈로그 프리셋이 화면 명세와 비공개 경계를 지킨다`, () => {
    const state = catalogState(entry);
    if (entry.id === '1-4') assert.equal(state.dmAccountVerified, true);
    const before = structuredClone(state);
    const markup = renderRoute(state, entry.route);
    assert.equal(typeof markup, 'string');
    for (const text of EXPECTED[entry.id]) assert.ok(markup.includes(text), `${entry.id}: ${text}`);
    assert.deepEqual(state, before);
    if (state.currentUserId === 'user-b') {
      assert.ok(!markup.includes('personal-a'));
      for (const place of state.places.filter((place) => place.mapId === 'personal-a')) assert.ok(!markup.includes(place.name));
    }
  });
}

test('시나리오는 독립된 전체 상태이며 시나리오 전환 시 화면 상태도 초기화된다', () => {
  for (const key of SCENARIOS) {
    const first = createScenario(key);
    first.users[0].name = '변경';
    first.ui.query = '남은 검색어';
    first.ui.selectedIds.push('남은 선택');
    assert.equal(createScenario(key).users[0].name, '사용자 A');
    assert.equal(createScenario(key).ui.query, '');
    assert.deepEqual(createScenario(key).ui.selectedIds, []);
  }
  const store = createStore(createScenario('map-error'));
  store.dispatch('query', '남은 검색어');
  store.applyScenario('solo');
  assert.equal(store.getState().ui.mapError, false);
  assert.equal(store.getState().ui.query, '');
  assert.equal(store.getState().maps.some((map) => map.type === 'shared'), false);
});

test('17개 카탈로그 화면과 추가 링크는 등록된 라우트로 연결된다', () => {
  assert.equal(CATALOG.length, 17);
  assert.equal(new Set(CATALOG.map((entry) => entry.id)).size, 17);
  const views = CATALOG.map((entry) => renderRoute(catalogState(entry), entry.route));
  views.push(renderRoute(createScenario(), '#/catalog'), renderRoute(createScenario(), '#/demo/dm'));
  for (const markup of views) {
    for (const [, href] of markup.matchAll(/href="([^"]+)"/g)) assert.ok(!parseRoute(href).fallback, href);
    assert.ok(!/https?:\/\//.test(markup));
    assert.ok(!/<div[^>]*data-action/.test(markup));
  }
  assert.equal(parseRoute('#/missing').path, '/start');
  assert.equal(parseRoute('').path, '/start');
  assert.equal(parseRoute('#/todo/%ZZ/1-1').path, '/start');
  assert.ok(renderRoute(createScenario(), '#/todo/정책미정/1-3').includes('정책이 정해지지 않은 화면이에요'));
});

test('모든 user-b 화면은 공격 문자열을 데이터로 표시하고 개인 A의 장소를 숨긴다', () => {
  for (const entry of CATALOG.filter((item) => catalogState(item).currentUserId === 'user-b')) {
    const state = catalogState(entry);
    for (const place of state.places) {
      place.name = `<script>${place.id}</script>`;
      place.summary = '<img src=x onerror="alert(1)">';
      place.region = '<svg onload="alert(1)">';
    }
    for (const user of state.users) user.name = '<script>사용자</script>';
    const markup = renderRoute(state, entry.route);
    assert.ok(!markup.includes('<script>'));
    assert.ok(!markup.includes('<img src=x'));
    assert.ok(!markup.includes('<svg onload='));
    assert.ok(!markup.includes('pa-book'));
    assert.ok(!markup.includes('pa-tea'));
    if (entry.id === '4-1') assert.ok(markup.includes('&lt;script&gt;pb-cafe&lt;/script&gt;'));
  }
  const state = createScenario('connected');
  state.ui.query = '<script>alert("x")</script>';
  const markup = renderRoute(state, '#/map');
  assert.ok(markup.includes('&lt;script&gt;'));
  assert.ok(!markup.includes('<script>'));
});

test('로그인·본인 확인·저장 요청은 완료를 꾸미지 않고 다음 화면으로 이어진다', () => {
  let state = reduceAction(createScenario(), 'login-start');
  assert.ok(renderRoute(state, '#/map').includes('아직 저장한 장소가 없어요'));
  state = reduceAction(createScenario('dm-intake'), 'login-intake');
  assert.equal(state.loggedIn, true);
  assert.equal(state.dmAccountVerified, false);
  assert.ok(renderRoute(state, '#/verify').includes('네, 제 계정이에요'));
  state = reduceAction(state, 'verify-account');
  assert.equal(state.dmAccountVerified, true);
  assert.ok(renderRoute(state, '#/save-target').includes('#/todo/UI-03/5-1'));
  assert.equal(state.places.filter((place) => place.mapId === 'personal-b').length, 0);
  assert.ok(renderRoute(state, '#/todo/UI-03/5-1').includes('준비 중인 화면이에요'));
  assert.ok(renderRoute(createScenario(), '#/demo/dm').includes('[공유한 릴스 · 시연용]'));
});

test('실제 연결 흐름은 개인 장소를 유지하며 빈 공유 맵으로 진입한다', () => {
  const store = createStore(createScenario('code-entry'));
  store.dispatch('code-input', '[연결 코드]');
  store.dispatch('check-code');
  assert.equal(store.getState().maps.filter((map) => map.type === 'shared').length, 0);
  store.dispatch('confirm-connect');
  assert.ok(renderRoute(store.getState(), '#/connected').includes('연결됐어요'));
  store.dispatch('show-shared');
  assert.ok(renderRoute(store.getState(), '#/map').includes('공유 맵에 아직 장소가 없어요'));
  assert.equal(store.getState().dmDefaultTarget, 'personal');
  assert.equal(store.getState().places.filter((place) => place.mapId === 'personal-b').length, 4);
});

test('핀·원본·맵 전환·검색·목록 필터·선택 모드가 상태와 화면에 반영된다', () => {
  const store = createStore(createScenario('connected'));
  store.dispatch('open-place', 'shared-cafe');
  assert.ok(renderRoute(store.getState(), '#/map').includes('class="place-summary"'));
  store.dispatch('source', 'shared-cafe');
  assert.ok(renderRoute(store.getState(), '#/map').includes('원본 링크: instagram.com/reel/[시연용]'));
  store.dispatch('close-sheet');
  store.dispatch('open-maps');
  let markup = renderRoute(store.getState(), '#/map');
  assert.ok(markup.includes('맵 전환'));
  assert.ok(!markup.includes('personal-a'));
  store.dispatch('switch-map', 'personal-b');
  assert.equal(store.getState().ui.sheet, null);
  markup = renderRoute(store.getState(), '#/map?view=list');
  assert.ok(!markup.includes('보낸 사람 전체'));
  assert.ok(!markup.includes('지도에 표시 안 됨</a>'));
  store.dispatch('switch-map', 'shared-ab');
  store.dispatch('set-view', 'list');
  store.dispatch('visit', 'visited');
  markup = renderRoute(store.getState(), '#/map?view=list');
  assert.ok(markup.includes('예시 국밥집'));
  assert.ok(!markup.includes('예시 카페'));
  store.dispatch('visit', '');
  store.dispatch('sender', 'user-b');
  store.dispatch('toggle-selection');
  store.dispatch('select-place', 'shared-bakery');
  markup = renderRoute(store.getState(), '#/map?view=list');
  assert.ok(markup.includes('type="checkbox"'));
  assert.ok(markup.includes(' checked'));
  assert.ok(markup.includes('선택해서 복제'));
  assert.ok(!markup.includes('예시 와인바'));
  store.dispatch('select-place', 'shared-bakery');
  assert.deepEqual(store.getState().ui.selectedIds, []);
  store.dispatch('query', '연남 파스타');
  assert.ok(renderRoute(store.getState(), '#/map?view=list').includes('맞는 장소가 없어요'));
  store.dispatch('clear-query');
  assert.ok(renderRoute(store.getState(), '#/map?view=list').includes('예시 베이커리'));
  assert.equal(store.getState().ui.senderId, 'user-b');
  assert.equal(store.getState().dmDefaultTarget, 'personal');
});

test('미확정 핀·권한 없는 장소 액션을 거부하고 지도 실패 시 목록·원본을 제공한다', () => {
  const store = createStore(createScenario('solo'));
  let markup = renderRoute(store.getState(), '#/map');
  assert.equal([...markup.matchAll(/class="map-pin"/g)].length, 3);
  assert.ok(!markup.includes('data-id="pb-bakery"'));
  const before = store.getState();
  store.dispatch('open-place', 'pa-book');
  store.dispatch('source', 'pa-book');
  store.dispatch('switch-map', 'personal-a');
  assert.equal(store.getState(), before);
  store.applyScenario('map-error');
  markup = renderRoute(store.getState(), '#/map');
  assert.ok(markup.includes('data-action="source"'));
  store.dispatch('source', 'shared-cafe');
  assert.equal(store.getState().ui.notice, '원본 링크: instagram.com/reel/[시연용]');
  store.dispatch('retry-map');
  assert.ok(!renderRoute(store.getState(), '#/map').includes('지도를 불러오지 못했어요'));
});

test('시작 화면은 원문 설명과 상단 워드마크·단계 카드·하단 버튼을 표시한다', () => {
  const markup = renderRoute(createScenario(), '#/start');
  assert.match(markup, /<header[^>]*><strong class="wordmark">가자함<\/strong><\/header><main/);
  assert.match(markup, /<ol class="steps card"><li><b>1<\/b> · DM으로 전달하거나 링크 입력/);
  assert.match(markup, /<p class="soft caption">혼자 써도 충분해요/);
  assert.match(markup, /<footer class="flow-footer">.*첫 링크 저장하기.*로그인.*모바일 웹에서 바로 이용/s);
  assert.doesNotMatch(markup, /brand-mark|eyebrow|⌁|마음에 든 장소를 보내 주세요/);
});

test('카탈로그 17개 제목은 리뷰에 지정된 목업 제목을 유지한다', () => {
  assert.deepEqual(CATALOG.map(({ title }) => title), [
    '서비스 소개 · 개인 맵 시작', '최초 DM → 웹 연결 · 비공개 임시 접수', '본인 계정 확인',
    '저장 대상 확인 · 연결 전', '함께 쓰기 → 연결 코드 만들기 · 사용자 A', '코드 상태 · 만료·취소·사용 완료·재발급',
    '코드 입력 → 연결 대상 확인 · 사용자 B', '연결 완료 · 개인 맵 유지 → 초기 복제', '이미 활성 공유 맵에 참여 중',
    '개인 맵 지도 · 연결 전', '공유 맵 · 핀 → 하단 카드 요약', '맵 전환',
    '목록 · 방문 상태·보낸 사람 조회, 미확정 포함', '개인 맵 빈 상태', '공유 맵 빈 상태',
    '검색 결과 없음', '지도 로딩 실패 · 목록·원본은 이용 가능',
  ]);
});

test('지도 도구는 검색·카테고리·보기 전환 순서이며 미확정 안내에 칩을 쓴다', () => {
  for (const id of ['4-1', '4-2', '4-4']) {
    const entry = CATALOG.find((item) => item.id === id);
    const markup = renderRoute(catalogState(entry), entry.route);
    const search = markup.indexOf('class="search-box"');
    const category = markup.indexOf('aria-label="카테고리"');
    const toggle = markup.indexOf('class="view-toggle"');
    assert.ok(search > 0 && category > search && toggle > category, id);
  }
  const markup = renderRoute(createScenario('solo'), '#/map');
  assert.match(markup, /class="unconfirmed-notice"[^>]*><span class="status-chip warn">위치 미확정 1곳<\/span><span>지도에 표시 안 됨 · 목록에서 보기/);
});

test('장소 요약은 지도 위 비모달 카드로 열리고 닫히며 다른 핀을 바로 선택할 수 있다', () => {
  const store = createStore(createScenario('connected'));
  store.dispatch('open-place', 'shared-cafe');
  let markup = renderRoute(store.getState(), '#/map');
  assert.match(markup, /class="place-summary" aria-label="장소 요약"/);
  assert.match(markup, /class="thumb summary-thumb">이미지 없음/);
  assert.match(markup, /data-action="open-place" data-id="shared-cafe"[^>]*aria-pressed="true"/);
  assert.match(markup, /data-action="close-sheet" aria-label="장소 요약 닫기"/);
  assert.doesNotMatch(markup, /aria-modal|inert|role="dialog"|sheet-scrim|map-switch-scrim/);
  store.dispatch('open-place', 'shared-wine');
  assert.equal(store.getState().ui.selectedPlaceId, 'shared-wine');
  store.dispatch('close-sheet');
  markup = renderRoute(store.getState(), '#/map');
  assert.doesNotMatch(markup, /class="place-summary"/);
  assert.equal(store.getState().ui.selectedPlaceId, null);
});

test('맵 전환은 헤더 드롭다운으로 토글되고 맵 선택 후 닫힌다', () => {
  const store = createStore(createScenario('connected'));
  store.dispatch('open-maps');
  let markup = renderRoute(store.getState(), '#/map');
  assert.match(markup, /data-action="open-maps" aria-expanded="true" aria-controls="map-switcher"/);
  assert.match(markup, /id="map-switcher" class="map-dropdown"/);
  assert.ok(markup.indexOf('class="map-dropdown"') < markup.indexOf('<main'));
  assert.match(markup, /class="map-option current"[^>]*data-id="shared-ab"/);
  assert.doesNotMatch(markup, /bottom-sheet|aria-modal|personal-a/);
  store.dispatch('open-maps');
  assert.doesNotMatch(renderRoute(store.getState(), '#/map'), /class="map-dropdown"/);
  store.dispatch('open-maps');
  store.dispatch('switch-map', 'personal-b');
  assert.equal(store.getState().ui.sheet, null);
  assert.equal(store.getState().dmDefaultTarget, 'personal');
  markup = renderRoute(store.getState(), '#/map');
  assert.match(markup, /aria-expanded="false"/);
  assert.doesNotMatch(markup, /class="map-dropdown"/);
});

test('목록 복제 버튼은 선택 모드 밖에도 있고 선택한 장소가 있을 때만 활성화된다', () => {
  const store = createStore(createScenario('connected'));
  let markup = renderRoute(store.getState(), '#/map?view=list');
  assert.match(markup, /<button[^>]*disabled[^>]*>선택해서 복제<\/button>/);
  assert.match(markup, /href="#\/todo\/UI-02\/2-4"[^>]*>전체 복제<\/a>/);
  assert.doesNotMatch(markup, /type="checkbox"/);
  store.dispatch('toggle-selection');
  store.dispatch('select-place', 'shared-cafe');
  markup = renderRoute(store.getState(), '#/map?view=list');
  assert.match(markup, /href="#\/todo\/UI-02\/2-4"[^>]*>선택해서 복제<\/a>/);
  store.dispatch('toggle-selection');
  assert.match(renderRoute(store.getState(), '#/map?view=list'), /<button[^>]*disabled[^>]*>선택해서 복제<\/button>/);
});

test('set-view는 양방향 보기 전환 때 선택 상태만 초기화한다', () => {
  for (const [from, to] of [['list', 'map'], ['map', 'list']]) {
    const state = createScenario('connected');
    Object.assign(state.ui, { view: from, selectionMode: true, selectedIds: ['shared-cafe'], query: '성수', category: '카페' });
    const before = structuredClone(state);
    const next = reduceAction(state, 'set-view', to);
    assert.deepEqual(next, { ...before, ui: { ...before.ui, view: to, selectionMode: false, selectedIds: [] } });
    assert.deepEqual(state, before);
  }
});

test('긴 목록·지도 실패의 요약 카드는 뷰포트 하단 탭 위 배치를 사용하고 지도 카드는 기존 배치를 유지한다', () => {
  const css = readFileSync(new URL('../styles/base.css', import.meta.url), 'utf8');
  function rule(selector) {
    const entry = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, selectors]) => selectors.trim() === selector);
    assert.ok(entry, selector);
    return Object.fromEntries(entry[2].split(';').filter((value) => value.trim()).map((declaration) => declaration.trim().split(/:\s*/)));
  }
  // Verify the CSS positioning contract; actual pixel layout needs a browser.
  const overlay = rule('.map-content > .place-summary');
  const tabs = rule('.tab-bar');
  assert.equal(overlay.position, 'fixed');
  assert.equal(parseFloat(overlay.bottom), parseFloat(tabs.bottom) + parseFloat(tabs.height));
  assert.equal(overlay.left, '50%');
  assert.equal(overlay.right, 'auto');
  assert.equal(overlay.transform, 'translateX(-50%)');
  assert.equal(overlay.width, tabs.width);
  assert.match(overlay['max-height'], /calc\(100dvh - 106px\)/);
  assert.equal(rule('.place-summary').position, 'absolute');
  assert.equal(rule('.place-summary').bottom, '0');

  for (const [scenario, hash] of [['connected', '#/map?view=list'], ['map-error', '#/map']]) {
    const state = createScenario(scenario);
    const place = state.places.find((item) => item.id === 'shared-cafe');
    state.places.push(...Array.from({ length: 100 }, (_, index) => ({ ...place, id: `long-list-${index}` })));
    const next = reduceAction(state, 'open-place', place.id);
    const markup = renderRoute(next, hash);
    const main = /<main class="map-content[^\"]*">(.*?)<\/main>/.exec(markup)?.[1];
    assert.ok(main);
    assert.equal([...main.matchAll(/class="place-row"/g)].length, 104);
    assert.match(main, /<\/ul>.*<section class="place-summary"/);
    assert.doesNotMatch(main, /map-canvas/);
    assert.doesNotMatch(markup, /aria-modal|inert|role="dialog"|scrim/);
  }
  const map = reduceAction(createScenario('connected'), 'open-place', 'shared-cafe');
  assert.match(renderRoute(map, '#/map'), /<div class="map-canvas">.*<section class="place-summary"/);
});

test('실제 이벤트 위임은 비모달 배경을 활성 상태로 두고 Tab을 가두지 않으며 Esc로 닫는다', async () => {
  // Minimal DOM adapter for the real main.js handlers; pixel layout remains a browser review.
  const previous = Object.fromEntries(['document', 'window', 'HTMLInputElement'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const listeners = {};
  const attributes = [];
  const doc = { activeElement: null, getElementById: () => null };
  let controls = [];
  let markup = '';
  const app = {
    addEventListener: (type, handler) => { listeners[type] = handler; },
    get innerHTML() { return markup; },
    set innerHTML(value) {
      markup = value;
      controls = [...value.matchAll(/<(button|a|input)\b([^>]*)>/g)].map(([, tag, attrs]) => {
        const attribute = (name) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1];
        const element = {
          dataset: { action: attribute('data-action'), id: attribute('data-id') },
          id: attribute('id'),
          getAttribute: attribute,
          matches: () => tag === 'input',
          focus: () => { doc.activeElement = element; },
          closest: () => element,
        };
        return element;
      });
    },
    querySelectorAll: () => controls.filter((element) => element.dataset.action),
    querySelector: (selector) => selector === '.map-page' || selector === '.catalog-access'
      ? { setAttribute: (name) => attributes.push(name) } : null,
  };
  doc.querySelector = () => app;
  const win = { location: { hash: '#/catalog' }, addEventListener() {}, scrollTo() {} };
  Object.assign(globalThis, { document: doc, window: win, HTMLInputElement: class {} });
  try {
    await import('../src/main.js?nonmodal-keyboard-test');
    win.location.hash = '#/map';
    function click(action, id) {
      const target = controls.find((element) => element.dataset.action === action && element.dataset.id === id);
      assert.ok(target, `${action}: ${id ?? ''}`);
      target.focus();
      listeners.click({ target, preventDefault() {} });
    }
    function key(key) {
      let prevented = false;
      listeners.keydown({ key, preventDefault() { prevented = true; } });
      return prevented;
    }
    // Catalog applies the connected preset through main.js, then uses the same /map route.
    click('catalog', '4-2');
    assert.match(markup, /class="place-summary"/);
    assert.equal(key('Tab'), false);
    assert.equal(key('Escape'), true);
    assert.doesNotMatch(markup, /class="place-summary"/);
    click('open-place', 'shared-cafe');
    click('close-sheet');
    assert.equal(doc.activeElement.dataset.action, 'open-place');
    assert.equal(doc.activeElement.dataset.id, 'shared-cafe');
    click('open-maps');
    assert.match(markup, /aria-expanded="true"/);
    assert.equal(key('Tab'), false);
    assert.equal(key('Escape'), true);
    assert.match(markup, /aria-expanded="false"/);
    assert.equal(doc.activeElement.dataset.action, 'open-maps');
    assert.deepEqual(attributes, []);
  } finally {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test('코드 실패 경로는 연결을 바꾸지 않으며 로그인 전에는 입력 필드를 숨긴다', () => {
  const state = createScenario('code-entry');
  state.loggedIn = false;
  let markup = renderRoute(state, '#/code-enter');
  assert.ok(markup.includes('로그인 후 연결할 수 있어요'));
  assert.ok(!markup.includes('<input'));
  state.loggedIn = true;
  state.ui.codeInput = '[연결 코드]';
  state.ui.codeChecked = true;
  state.codes = cancelCode(state.codes, 'code-a');
  assert.ok(renderRoute(state, '#/code-enter').includes(UNUSABLE_CODE_MESSAGE));
  state.codes[0].status = 'available';
  state.currentUserId = 'user-a';
  assert.ok(renderRoute(state, '#/code-enter').includes('내가 만든 코드는 입력할 수 없어요.'));
  assert.ok(renderRoute(createScenario('already-shared'), '#/code-enter').includes('이미 공유 맵에 참여 중'));
});

test('정적 서버는 로컬에서 파일 형식을 제공하고 web 밖 경로를 차단한다', async (context) => {
  const server = createStaticServer();
  context.after(() => new Promise((resolve) => server.close(resolve)));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  function get(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port, path, method }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, type: response.headers['content-type'], body }));
      });
      req.on('error', reject);
      req.end();
    });
  }
  const index = await get('/');
  assert.equal(index.status, 200);
  assert.match(index.type, /^text\/html/);
  assert.ok(index.body.includes('lang="ko"'));
  for (const [path, type] of [['/styles/tokens.css', 'text/css'], ['/src/main.js', 'text/javascript'], ['/scripts/serve.mjs', 'text/javascript']]) {
    assert.ok((await get(path)).type.startsWith(type));
  }
  for (const path of ['/../AGENTS.md', '/%2e%2e/AGENTS.md', '/..%5cAGENTS.md', '/%2e%2e%2fdocs%2fplans']) assert.equal((await get(path)).status, 403, path);
  assert.equal((await get('/missing')).status, 404);
  assert.equal((await get('/%ZZ')).status, 400);
  assert.equal((await get('/', 'POST')).status, 405);
  assert.equal((await get('/', 'HEAD')).body, '');
});
