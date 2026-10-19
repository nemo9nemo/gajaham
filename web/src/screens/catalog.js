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
  { id: '2-1', title: '초기 복제 선택', scenario: 'copy-initial', route: '#/copy/initial', ui: {} },
  { id: '2-2', title: '내 개인 장소에서 선택', scenario: 'copy-initial', route: '#/copy/select', ui: { copyPick: ['pb-cafe', 'pb-soup', 'pb-bakery'] } },
  { id: '2-3', title: '연결 후 진입 · 상세 1개 / 선택 / 전체', scenario: 'connected-personal', route: '#/map?view=list', ui: { selectionMode: true, selectedIds: ['pb-cafe', 'pb-soup'], sheet: 'copy', copyScope: 'selected' } },
  { id: '2-4', title: '미리보기 · 개인 → 공유', scenario: 'copy-preview', route: '#/copy/preview', ui: {} },
  { id: '2-5', title: '미리보기 · 공유 → 내 개인', scenario: 'copy-to-personal', route: '#/copy/preview', ui: {} },
  { id: '2-6', title: '결과 · 새 장소·출처 추가·일부 실패', scenario: 'copy-partial', route: '#/copy/result', ui: {} },
  { id: '2-7', title: '복제 이력 · 원 저장자와 복제한 사람', scenario: 'connected', route: '#/place/shared-soup/history', ui: {} },
  { id: '4-1', title: '개인 맵 지도 · 연결 전', scenario: 'solo', route: '#/map', ui: {} },
  { id: '4-2', title: '공유 맵 · 핀 → 하단 카드 요약', scenario: 'connected', route: '#/map', ui: { sheet: 'place', selectedPlaceId: 'shared-cafe' } },
  { id: '4-3', title: '맵 전환', scenario: 'connected', route: '#/map', ui: { sheet: 'maps' } },
  { id: '4-4', title: '목록 · 방문 상태·보낸 사람 조회, 미확정 포함', scenario: 'connected', route: '#/map?view=list', ui: {} },
  { id: '4-5', title: '개인 맵 빈 상태', scenario: 'solo-empty', route: '#/map', ui: {} },
  { id: '4-6', title: '공유 맵 빈 상태', scenario: 'connected-empty-shared', route: '#/map', ui: {} },
  { id: '4-7', title: '검색 결과 없음', scenario: 'connected', route: '#/map?view=list', ui: { query: '연남 파스타' } },
  { id: '4-8', title: '지도 로딩 실패 · 목록·원본은 이용 가능', scenario: 'map-error', route: '#/map', ui: {} },
  { id: '6-1', title: '공유 맵 상세 · 정보 카드 (상단)', scenario: 'connected', route: '#/place/shared-cafe', ui: {} },
  { id: '6-2', title: '상세 (스크롤 하단) · 출처·기록·관리', scenario: 'connected', route: '#/place/shared-cafe', ui: { scrollTarget: 'place-sources' } },
  { id: '6-3', title: '이미지 없음 + 원문 접근 불가 · 개인 맵', scenario: 'connected-personal', route: '#/place/pb-bakery', ui: {} },
  { id: '6-4', title: '정보·카테고리·메모 수정', scenario: 'connected', route: '#/place/shared-cafe/edit', ui: {} },
  { id: '6-5', title: '위치 수정', scenario: 'connected-personal', route: '#/place/pb-bakery/location', ui: {} },
  { id: '6-6', title: '이 맵에서 삭제 → 휴지통', scenario: 'connected', route: '#/place/shared-soup', ui: { sheet: 'delete' } },
  { id: '3-1', title: '연결 전 · 개인 맵 저장', scenario: 'link-solo', route: '#/links/new', ui: {} },
  { id: '3-2', title: '연결 후 · 현재 맵 기본, 등록 전 변경', scenario: 'link-shared', route: '#/links/new', ui: {} },
  { id: '3-3', title: '접수 안내 · 아직 저장 전', scenario: 'link-received', route: '#/links/receipt/intake-1', ui: {} },
  { id: '3-4', title: '완료 결과 · 실제 등록한 맵', scenario: 'link-saved', route: '#/links/result/intake-1', ui: {} },
  { id: '3-5', title: '둘 다 · 한쪽만 성공 → 실패 쪽만 재처리', scenario: 'link-partial', route: '#/links/result/intake-1', ui: {} },
  { id: '3-6', title: '미지원 출처 · 블로그 등', scenario: 'link-unsupported', route: '#/links/unsupported/intake-1', ui: {} },
  { id: '3-7', title: '같은 링크 재전달 · 기존 카드로', scenario: 'link-duplicate', route: '#/links/result/intake-1', ui: {} },
  { id: '5-1', title: '처리함 목록 · 상태별', scenario: 'inbox-demo', route: '#/inbox', ui: {} },
  { id: '5-2', title: '항목 상세 · 등록 전 저장 대상 변경', scenario: 'inbox-target', route: '#/inbox/intake-1/target', ui: {} },
  { id: '5-3', title: '동명·지점 모호 · 후보 비교', scenario: 'inbox-ambiguous', route: '#/inbox/intake-1/resolve', ui: {} },
  { id: '5-4', title: '콘텐츠 접근 불가 · 보완', scenario: 'inbox-unreadable', route: '#/inbox/intake-1/supplement', ui: {} },
  { id: '5-5', title: '여러 장소 중 일부만 확인', scenario: 'inbox-multiple', route: '#/inbox/intake-1/multiple', ui: {} },
  { id: '5-6', title: '장소 없는 게시물 / 메뉴 근거 없음', scenario: 'inbox-no-place', route: '#/inbox/intake-1/no-place', ui: { showMenuExample: true } },
  { id: '5-7', title: '처리 지연 · DM 회신 제한 · 분석 실패 재시도', scenario: 'inbox-delayed', route: '#/inbox/intake-1/delayed', ui: {} },
  { id: '5-8', title: '분석 중 공유 권한 종료 · 대상 변경', scenario: 'inbox-ended', route: '#/inbox/intake-1/ended', ui: {} },
  { id: '7-1', title: '후보 없음', scenario: 'appointment-empty', route: '#/appointments', ui: {} },
  { id: '7-2', title: '후보 고르기 · 두 사람의 관심 표시', scenario: 'appointment-choose', route: '#/appointments/choose', ui: {} },
  { id: '7-3', title: '후보 비교', scenario: 'appointment-compare', route: '#/appointments/compare', ui: {} },
  { id: '7-4', title: '후보 3곳 가득 · 교체', scenario: 'appointment-full', route: '#/appointments/replace', ui: {} },
  { id: '7-5', title: '최종 선택 · 길찾기 · 선택 변경', scenario: 'appointment-final', route: '#/appointments', ui: {} },
  { id: '7-6', title: '다녀왔어요 표시', scenario: 'appointment-visited', route: '#/appointments/visited', ui: {} },
  { id: '8-1', title: '맵·설정 홈', scenario: 'settings-home', route: '#/settings', ui: {} },
  { id: '8-2', title: 'DM 기본 저장 위치', scenario: 'settings-default', route: '#/settings/dm', ui: {} },
  { id: '8-3', title: '기록 내보내기', scenario: 'settings-export', route: '#/settings/export', ui: {} },
  { id: '8-4', title: '맵별 휴지통 · 복구', scenario: 'settings-trash', route: '#/settings/trash', ui: {} },
  { id: '8-5', title: '공유 맵 나가기 · 종료 전 개인 복제', scenario: 'settings-leave', route: '#/settings/leave', ui: {} },
  { id: '8-6', title: '종료 후 · 개인 기록 유지', scenario: 'settings-ended', route: '#/settings/ended', ui: {} },
  { id: '8-7', title: '기록 삭제 · 계정 탈퇴 진입', scenario: 'settings-account', route: '#/settings/account', ui: {} },
];

export function catalogState(entry) {
  const state = createScenario(entry.scenario);
  return { ...state, dmAccountVerified: entry.id === '1-4' ? true : state.dmAccountVerified,
    ui: { ...state.ui, view: entry.route.includes('?view=list') ? 'list' : state.ui.view, ...entry.ui } };
}

export function catalogScreen() {
  return appBar('화면 카탈로그 · P0 58개') + '<main class="page stack">' + [
    ['1-', '4.1 시작·연결'], ['2-', '4.2 초기 복제 · 다른 맵에 복제'], ['3-', '4.3 링크 등록'], ['4-', '4.4 개인·공유 지도와 목록'],
    ['5-', '4.5 처리함'], ['6-', '4.6 장소 상세'], ['7-', '4.7 이번 약속'], ['8-', '4.8 맵·설정'],
  ].map(([prefix, heading]) => html`<section><h2 class="catalog-heading">${heading}</h2><ul class="catalog-list">` +
    CATALOG.filter((entry) => entry.id.startsWith(prefix)).map((entry) => html`<li><a href="${entry.route}" data-action="catalog" data-id="${entry.id}"><strong>${entry.id}</strong><span>${entry.title}</span><span aria-hidden="true">›</span></a></li>`).join('') + '</ul></section>').join('') +
    '<a class="button secondary" href="#/demo/dm">시연용 DM 미리보기</a></main>';
}
