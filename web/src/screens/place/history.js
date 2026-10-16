import { html } from '../../html.js';
import { userName } from '../../data/mock.js';
import { visibleMaps } from '../../logic/maps.js';
import { findAccessiblePlace } from '../../logic/place-edit.js';
import { appBar } from '../../components/app-bar.js';
import { mapBadge } from '../../components/map-badge.js';
import { flowPage } from '../start/layout.js';
import { inaccessiblePlaceScreen, placeHref } from './shared.js';

export function historyLabel(entry, compact = false) {
  return ({ copied: compact ? '복제해 추가' : '복제해서 추가', edited: `${entry.field} 수정`, saved: '저장',
    'source-added': '출처 추가', deleted: '휴지통으로 이동', restored: '되돌림' })[entry.type] ?? '';
}

export function placeHistoryScreen(state) {
  const place = findAccessiblePlace(state, state.ui.params?.id);
  if (!place) return inaccessiblePlaceScreen();
  const map = visibleMaps(state).find((item) => item.id === place.mapId);
  const body = '<h2 class="section-label">이 맵의 기록</h2>' + [...place.history].reverse().map((entry) => {
    const actor = userName(state, entry.actorId);
    const text = entry.type === 'copied' ? `복제한 사람: ${actor}` : entry.type === 'edited' ? `수정한 사람: ${actor}`
      : entry.type === 'saved' ? `저장한 사람: ${actor}` : entry.type === 'source-added' ? `더한 사람: ${actor}` : actor;
    return '<section class="card"><div class="content-row">' + html`<strong>${historyLabel(entry)}</strong><span class="caption">${entry.at ?? '[날짜]'}</span></div><p class="caption">${text}</p>` +
      (entry.type === 'copied' ? html`<p class="caption">원 저장자: ${userName(state, entry.originalSaverId)} · 원래 맵 이름은 표시하지 않아요</p>` : '') + '</section>';
  }).join('') + html`<p class="soft caption">${map.type === 'shared'
    ? '관심 표시·이번 약속·평가는 이 맵에서 새로 시작해요. 원래 카드는 그대로 있고, 서로 자동으로 맞춰지지 않아요.'
    : '이 맵의 수정은 다른 맵의 복제본에 자동으로 반영되지 않아요.'}</p>`;
  return flowPage(appBar(`${place.name} · 기록`, { back: placeHref(place.id), right: mapBadge(map.type) }), body, '', 'place-page');
}
