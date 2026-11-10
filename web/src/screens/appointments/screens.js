import { html } from '../../html.js';
import { appointmentFor, appointmentMap } from '../../logic/appointments.js';
import { activePlaces } from '../../logic/places.js';
import { findAccessiblePlace } from '../../logic/place-edit.js';
import { userName, userInitial } from '../../data/mock.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { tabBar } from '../../components/tab-bar.js';
import { mapBadge } from '../../components/map-badge.js';
import { compactPlace } from '../../components/complete-shared.js';
import { flowPage } from '../start/layout.js';

function noShared() {
  return flowPage(appBar('이번 약속'), '<h1>공유 맵에서 함께 골라요</h1><p>함께 쓰기로 연결하면 공유한 장소에서 후보를 고를 수 있어요.</p>', button('함께 쓰기', { href: '#/together' }), 'complete-page');
}

function comparison(place, state) {
  return '<dl class="record-details"><dt>위치</dt>' + html`<dd>${place.region} · ${place.locationStatus === 'confirmed' ? '위치 확인됨' : '위치 미확정'}</dd><dt>원문 메뉴</dt><dd>${place.menu ? `${place.menu.name} (${place.menu.kind === 'recommended' ? '추천' : '언급'})` : '메뉴 정보 없음'}</dd><dt>메모</dt><dd>${place.memo?.text ?? '없음'}</dd><dt>관심</dt><dd>${place.wantBy.map((id) => userInitial(state, id)).join(' · ') || '아직 없음'}</dd></dl>`;
}

export function appointmentHomeScreen(state) {
  if (!appointmentMap(state)) return noShared();
  const appointment = appointmentFor(state);
  const chosen = appointment.chosenId && findAccessiblePlace(state, appointment.chosenId);
  if (!chosen) return flowPage(appBar('이번 약속', { right: mapBadge('shared') }), html`<h1>${appointment.candidateIds.length ? '후보를 골라 두었어요' : '이번 약속 후보가 아직 없어요'}</h1>` + '<p>우리 공유 맵에 저장된 장소에서 최대 3곳을 골라 비교해요.</p>' +
    '<p class="soft caption">내 개인 맵에만 있는 장소는 먼저 공유 맵에 복제한 뒤 후보에 넣을 수 있어요.</p>',
    button(appointment.candidateIds.length ? `후보 ${appointment.candidateIds.length}곳 이어서 고르기` : '공유 맵에서 후보 고르기', { href: '#/appointments/choose' }) +
    button('내 개인 맵에서 복제해 오기', { action: 'appointment-copy-personal', variant: 'secondary' }), 'complete-page with-tabs') + tabBar('이번 약속');
  return flowPage(appBar('이번 약속', { right: mapBadge('shared') }), '<span class="status-chip ok">최종 장소 선택됨</span><h1>' + html`${chosen.name}` + '</h1>' +
    comparison(chosen, state) + html`<p class="caption">선택: ${userName(state, appointment.selectedBy)}</p>`,
    button('길찾기 · 외부 지도 앱', { action: 'directions', disabled: chosen.locationStatus !== 'confirmed' }) +
    button('상세 보기', { href: `#/place/${encodeURIComponent(chosen.id)}`, variant: 'secondary' }) +
    button('선택 변경', { href: '#/appointments/compare', variant: 'secondary' }) + button('다녀왔어요', { action: 'appointment-visit', variant: 'text' }), 'complete-page with-tabs') + tabBar('이번 약속');
}

export function appointmentChooseScreen(state) {
  const map = appointmentMap(state);
  if (!map) return noShared();
  const appointment = appointmentFor(state);
  const body = html`<span class="status-chip wait">후보 ${appointment.candidateIds.length}/3</span>` +
    activePlaces(state, map.id).map((place) => {
      const selected = appointment.candidateIds.includes(place.id);
      return '<section class="card ' + (selected ? 'selected' : '') + '">' + html`<strong>${place.name}</strong><p class="caption">${place.category} · ${place.region} · 가고 싶어: ${place.wantBy.map((id) => userInitial(state, id)).join(' · ') || '아직 없음'}</p>` +
        '<div class="button-row">' + html`<button type="button" class="button secondary" data-action="toggle-want" data-id="${place.id}" aria-pressed="${place.wantBy.includes(state.currentUserId)}">가고 싶어</button>` +
        button(selected ? '후보에서 빼기' : '이번 약속 후보', { action: 'candidate-toggle', id: place.id, variant: selected ? 'secondary' : 'primary' }) + '</div></section>';
    }).join('');
  return flowPage(appBar('후보 고르기', { back: '#/appointments', right: mapBadge('shared') }), body || '<p>공유 맵에 장소를 먼저 담아 주세요.</p>',
    button(`후보 ${appointment.candidateIds.length}곳 비교하기`, { href: '#/appointments/compare', disabled: !appointment.candidateIds.length }), 'complete-page');
}

export function appointmentCompareScreen(state) {
  if (!appointmentMap(state)) return noShared();
  const appointment = appointmentFor(state);
  const places = appointment.candidateIds.map((id) => findAccessiblePlace(state, id));
  return flowPage(appBar(`후보 비교 · ${places.length}곳`, { back: '#/appointments/choose' }),
    places.length ? places.map((place) => '<section class="card">' + html`<h2>${place.name}</h2>` + comparison(place, state) +
      button('이곳으로 정하기', { action: 'appointment-select', id: place.id }) + '</section>').join('') : '<p>비교할 후보를 먼저 골라 주세요.</p>',
    button('후보 다시 고르기', { href: '#/appointments/choose', variant: 'secondary' }), 'complete-page');
}

export function appointmentReplaceScreen(state) {
  if (!appointmentMap(state)) return noShared();
  const appointment = appointmentFor(state);
  const pending = findAccessiblePlace(state, state.ui.pendingCandidateId);
  if (!pending || pending.mapId !== appointmentMap(state).id) return appointmentChooseScreen(state);
  return flowPage(appBar('후보 고르기', { back: '#/appointments/choose', right: mapBadge('shared') }),
    '<span class="status-chip warn">후보 3/3</span><h1>후보는 최대 3곳이에요</h1>' + html`<p>‘${pending.name}’과 바꿀 후보를 골라 주세요.</p>` +
    '<div class="stack" role="radiogroup" aria-label="교체할 후보">' + appointment.candidateIds.map((id) => {
      const place = findAccessiblePlace(state, id);
      return html`<button type="button" class="candidate-option card ${id === state.ui.replacementId ? 'selected' : ''}" data-action="candidate-replace-choice" data-id="${id}" role="radio" aria-checked="${id === state.ui.replacementId}">${place.name}</button>`;
    }).join('') + '</div>', button('고른 후보와 바꾸기', { action: 'candidate-replace', disabled: !state.ui.replacementId }) +
    button('취소', { href: '#/appointments/choose', variant: 'secondary' }), 'complete-page');
}

export function appointmentVisitedScreen(state) {
  if (!appointmentMap(state)) return noShared();
  const appointment = appointmentFor(state);
  const place = appointment.chosenId && findAccessiblePlace(state, appointment.chosenId);
  if (!place || place.visit !== 'visited') return appointmentHomeScreen(state);
  return flowPage(appBar('이번 약속', { right: mapBadge('shared') }), '<span class="status-chip ok">다녀왔어요 · 우리 공유 맵</span>' +
    html`<h1>${place.name}에 다녀왔어요</h1>` + '<p>방문 표시는 우리 공유 맵에만 기록돼요. 내 개인 맵의 복제본은 바뀌지 않아요.</p>' +
    '<section class="card"><h2>기록</h2>' + html`<p class="caption">다녀왔어요 표시: ${appointment.visitedBy ? userName(state, appointment.visitedBy) : '공유 맵 기록'} · ${appointment.visitedAt ?? '[날짜]'}</p>` + '</section>',
    button('새 약속 후보 고르기', { action: 'appointment-reset' }), 'complete-page');
}
