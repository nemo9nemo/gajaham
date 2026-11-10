import { html } from '../../html.js';
import { visibleMaps } from '../../logic/maps.js';
import { activePlaces } from '../../logic/places.js';
import { trashedPlaces } from '../../logic/settings.js';
import { appointmentMap } from '../../logic/appointments.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { tabBar } from '../../components/tab-bar.js';
import { mapBadge } from '../../components/map-badge.js';
import { targetOptions, mapAudience, missingItem } from '../../components/complete-shared.js';
import { flowPage } from '../start/layout.js';

const DEFAULT_LABELS = { personal: '개인 맵', shared: '공유 맵', both: '둘 다' };

export function settingsHomeScreen(state) {
  const maps = visibleMaps(state);
  const body = '<h2 class="section-label">내 맵</h2>' + maps.map((map) => '<section class="card"><div class="content-row">' + mapBadge(map.type) + html`<strong>${map.name}</strong></div><p class="caption">${mapAudience(state, map.id)} · 장소 ${activePlaces(state, map.id).length}곳</p>` +
    button('이 맵 보기', { action: 'show-map', id: map.id, variant: 'text' }) + '</section>').join('') +
    '<h2 class="section-label">연결</h2><section class="card"><h2>함께 쓰기</h2>' +
    html`<p class="caption">${appointmentMap(state) ? '공유 맵 연결됨 · 연결 코드 사용 완료' : '공유 맵 연결 전'}</p>` + button('연결 코드 만들기·입력', { href: '#/together', variant: 'text' }) +
    '<h2>DM 계정 연결</h2>' + html`<p class="caption">[보낸 계정 · 자리표시자] · 나의 연결만 표시 · ${state.dmAccountVerified ? '확인됨' : '확인 필요'}</p>` + '</section>' +
    '<h2 class="section-label">DM 기본 저장 위치</h2>' + button(DEFAULT_LABELS[state.dmDefaultTarget], { href: '#/settings/dm', variant: 'secondary' }) +
    button('시연용 DM 접수', { action: 'dm-demo-submit', variant: 'text' }) +
    '<h2 class="section-label">기록</h2><div class="stack">' + button('기록 내보내기', { href: '#/settings/export', variant: 'secondary' }) +
    button('휴지통 · 맵별', { href: '#/settings/trash', variant: 'secondary' }) +
    (appointmentMap(state) ? button('공유 맵 나가기', { href: '#/settings/leave', variant: 'secondary' }) : '') +
    button('기록 삭제 · 계정 탈퇴', { href: '#/settings/account', variant: 'secondary' }) + '</div>';
  return flowPage(appBar('맵·설정'), body, '', 'complete-page with-tabs') + tabBar('설정');
}

export function settingsDmScreen(state) {
  const maps = visibleMaps(state);
  const selected = ['personal', 'shared'].includes(state.ui.dmChoice)
    ? maps.find((map) => map.type === state.ui.dmChoice)?.id : state.ui.dmChoice;
  return flowPage(appBar('DM 기본 저장 위치', { back: '#/settings' }), '<p>서비스 계정에 DM으로 보낸 게시물이 저장될 맵이에요.</p>' +
    targetOptions(state, selected, 'dm-choice') + '<section class="soft"><p>공유 맵 또는 둘 다를 고르면 이후 전달하는 장소가 공유 맵 참여자에게 보여요.</p></section><p class="caption">바꾼 값은 이후 접수 항목부터 적용돼요. 이미 처리 중인 항목은 처리함에서 하나씩 바꿀 수 있어요. 웹에서 보고 있는 맵과는 별개예요.</p>',
    button('저장', { action: 'dm-save' }), 'complete-page');
}

export function settingsExportScreen(state) {
  const preview = state.ui.exportPreview;
  return flowPage(appBar('기록 내보내기', { back: '#/settings' }), '<h2 class="section-label">내보낼 맵 · 접근 가능한 맵만</h2>' +
    visibleMaps(state).map((map) => html`<label class="check-row card"><input type="checkbox" data-action="export-toggle" data-id="${map.id}" ${(state.ui.exportMapIds ?? []).includes(map.id) ? 'checked' : ''}><span>${map.name}</span></label>`).join('') +
    '<section class="soft"><h2>포함하는 기본 기록</h2><p class="caption">장소명 · 지역 · 카테고리 · 메모 · 원본 URL · 방문 상태 등 처리 상태</p></section><section class="card"><h2>포함하지 않는 것</h2><p class="caption">원본 사진·영상 전체. 원본 미디어 영구 보관을 약속하지 않아요.</p></section><p class="caption">파일 형식 미정 · 이 목업에서는 내보낼 기록만 확인해요.</p>' +
    (preview ? '<section class="notice"><h2>요청할 기록을 확인했어요</h2>' + html`<p>${preview.maps.length}개 맵 · 장소 ${preview.maps.reduce((count, map) => count + map.places.length, 0)}곳 · 처리 상태 ${preview.processing.length}건</p>` + '</section>' : ''),
    button('내보내기 요청', { action: 'export-request', disabled: !(state.ui.exportMapIds ?? []).length }), 'complete-page');
}

export function settingsTrashScreen(state) {
  const maps = visibleMaps(state);
  const selected = maps.find((map) => map.id === state.ui.settingsMapId) ?? maps[0];
  const places = selected ? trashedPlaces(state, selected.id) : [];
  return flowPage(appBar('휴지통', { back: '#/settings' }), '<nav class="chip-row" aria-label="휴지통 맵">' + maps.map((map) =>
    html`<button type="button" class="chip" aria-pressed="${map.id === selected?.id}" data-action="settings-map" data-id="${map.id}">${map.name}</button>`).join('') + '</nav><p class="caption">복구 가능 기간 미정</p>' +
    (places.length ? places.map((place) => '<section class="card">' + html`<strong>${place.name}</strong><span class="status-chip wait">휴지통</span><p class="caption">삭제: ${state.users.find((user) => user.id === place.deletedBy)?.name ?? '기록 없음'} · [삭제 날짜]</p>` +
      button(`${selected.name}에 복구`, { action: 'restore-place', id: place.id, variant: 'secondary' }) + '</section>').join('') : '<section class="soft"><h2>휴지통이 비어 있어요</h2></section>') +
    '<p class="caption">이 맵에서 지운 장소예요. 다른 맵의 복제본은 함께 지워지지 않았어요.</p>', '', 'complete-page');
}

export function settingsLeaveScreen(state) {
  const map = appointmentMap(state);
  if (!map) return settingsEndedScreen(state);
  return flowPage(appBar('공유 맵 나가기', { back: '#/settings' }), html`<h1>${map.name}에서 나갈까요?</h1>` +
    '<ul class="plain-list"><li>나가면 이 공유 맵에 저장·복제할 수 없고, 예전 결과 링크로도 열 수 없어요.</li><li>내 개인 맵과 이미 복제해 둔 장소는 그대로 남아요.</li><li>상대방의 DM 계정 연결은 바뀌지 않아요.</li></ul><section class="soft"><h2>정해지면 안내할 내용</h2><p class="caption">접근 종료 시점 · 남는 공동 기록 세부 범위 · 마지막 참여자 처리</p></section><h2>나가기 전에 내 개인 맵에 복제할까요?</h2><p>지금 볼 수 있는 공유 장소 중 골라 가져와요.</p>',
    button('공유 장소 골라서 복제', { action: 'leave-copy' }) + button('공유 맵 나가기', { action: 'leave-shared', variant: 'danger' }), 'complete-page');
}

export function settingsEndedScreen(state) {
  const ended = state.endedShared;
  if (!ended) return settingsHomeScreen(state);
  const personal = visibleMaps(state).find((map) => map.type === 'personal');
  return flowPage(appBar('맵·설정'), '<span class="status-chip wait">공유 연결 종료됨</span>' +
    (ended.previousDefault !== 'personal' ? '<section class="notice"><h2>DM 기본 저장 위치를 바꿨어요</h2>' + html`<p>‘${DEFAULT_LABELS[ended.previousDefault]}’를 더 이상 쓸 수 없어 ‘개인 맵’으로 바꿨어요. 이후 DM부터 적용돼요.</p>` + '</section>' : '') +
    '<section class="card">' + mapBadge('personal') + html`<h2>${personal?.name ?? '개인 맵'}</h2>` + '<p>그대로 · 공유 맵에서 복제해 온 장소 포함</p></section><section class="card"><span class="status-chip wait">종료</span>' +
    html`<h2>${ended.name}</h2>` + '<p class="caption">열 수 없어요. 예전 결과 링크로도 접근할 수 없고, 저장·복제 대상에 나오지 않아요.</p></section><p class="caption">새 사람과 연결하면 새 공유 맵이 생기고, 이전 공유 기록은 공개되지 않아요.</p>',
    button('새로 함께 쓰기', { href: '#/together' }) + button('내 개인 맵 보기', { action: 'show-map', id: personal?.id, variant: 'secondary' }), 'complete-page with-tabs') + tabBar('설정');
}

export function settingsAccountScreen(state) {
  return flowPage(appBar('기록 삭제 · 계정 탈퇴', { back: '#/settings' }), '<section class="card"><h2>내 개인 맵 기록 삭제</h2><p class="caption">삭제 범위와 복구 가능 여부 미정</p>' +
    button('기록 삭제 진행', { action: 'account-policy', id: 'records', variant: 'danger' }) + '</section><section class="card"><h2>계정 탈퇴</h2><p class="caption">탈퇴 시 삭제되는 범위 · 공유 맵에 남는 공동 기록 · 보관 기간 미정</p>' +
    button('탈퇴 진행', { action: 'account-policy', id: 'account', variant: 'danger' }) + '</section><p class="caption">진행 전에 기록 내보내기로 기본 기록을 확인할 수 있어요.</p>' +
    (state.ui.policyNotice ? html`<p class="notice warn" role="status">${state.ui.policyNotice}</p>` : ''),
    button('기록 내보내기', { href: '#/settings/export', variant: 'secondary' }), 'complete-page');
}
