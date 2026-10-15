import { html } from '../html.js';
import { appBar } from '../components/app-bar.js';
import { createScenario } from '../data/scenarios.js';

export const CATALOG = [
  { id: '1-1', title: '서비스 소개 · 개인 맵 시작', scenario: 'new-visitor', route: '#/start', ui: {} },
  { id: '1-2', title: '최초 DM → 웹 연결 · 비공개 임시 접수', scenario: 'dm-intake', route: '#/intake', ui: {} },
  { id: '1-3', title: '본인 계정 확인', scenario: 'dm-verify', route: '#/verify', ui: {} },
  { id: '1-4', title: '저장 대상 확인 · 연결 전', scenario: 'dm-verify', route: '#/save-target', ui: {} },
  { id: '1-5', title: '함께 쓰기 → 연결 코드 만들기 · 사용자 A', scenario: 'code-owner', route: '#/together', ui: {} },
  { id: '1-6', title: '코드 상태 · 만료·취소·사용 완료·재발급', scenario: 'code-owner', route: '#/code-status', ui: {} },
  { id: '1-7', title: '코드 입력 → 연결 대상 확인 · 사용자 B', scenario: 'code-entry', route: '#/code-enter', ui: { codeInput: '[연결 코드]', codeChecked: true } },
  { id: '1-8', title: '연결 완료 · 개인 맵 유지 → 초기 복제', scenario: 'connected', route: '#/connected', ui: {} },
  { id: '1-9', title: '이미 활성 공유 맵에 참여 중', scenario: 'already-shared', route: '#/code-enter', ui: {} },
  { id: '4-1', title: '개인 맵 지도 · 연결 전', scenario: 'solo', route: '#/map', ui: {} },
  { id: '4-2', title: '공유 맵 · 핀 → 하단 카드 요약', scenario: 'connected', route: '#/map', ui: { sheet: 'place', selectedPlaceId: 'shared-cafe' } },
  { id: '4-3', title: '맵 전환', scenario: 'connected', route: '#/map', ui: { sheet: 'maps' } },
  { id: '4-4', title: '목록 · 방문 상태·보낸 사람 조회, 미확정 포함', scenario: 'connected', route: '#/map?view=list', ui: {} },
  { id: '4-5', title: '개인 맵 빈 상태', scenario: 'solo-empty', route: '#/map', ui: {} },
  { id: '4-6', title: '공유 맵 빈 상태', scenario: 'connected-empty-shared', route: '#/map', ui: {} },
  { id: '4-7', title: '검색 결과 없음', scenario: 'connected', route: '#/map?view=list', ui: { query: '연남 파스타' } },
  { id: '4-8', title: '지도 로딩 실패 · 목록·원본은 이용 가능', scenario: 'map-error', route: '#/map', ui: {} },
];

export function catalogState(entry) {
  const state = createScenario(entry.scenario);
  return { ...state, dmAccountVerified: entry.id === '1-4' ? true : state.dmAccountVerified,
    ui: { ...state.ui, ...entry.ui } };
}

export function catalogScreen() {
  return appBar('화면 카탈로그 (UI-01)') + '<main class="page stack">' + [
    ['1-', '4.1 시작·연결'], ['4-', '4.4 개인·공유 지도와 목록'],
  ].map(([prefix, heading]) => html`<section><h2 class="catalog-heading">${heading}</h2><ul class="catalog-list">` +
    CATALOG.filter((entry) => entry.id.startsWith(prefix)).map((entry) => html`<li><a href="${entry.route}" data-action="catalog" data-id="${entry.id}"><strong>${entry.id}</strong><span>${entry.title}</span><span aria-hidden="true">›</span></a></li>`).join('') + '</ul></section>').join('') +
    '<a class="button secondary" href="#/demo/dm">시연용 DM 미리보기</a></main>';
}
