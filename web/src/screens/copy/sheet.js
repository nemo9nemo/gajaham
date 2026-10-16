import { html } from '../../html.js';
import { copyTargets } from '../../logic/copy.js';
import { activePlaces } from '../../logic/places.js';
import { findAccessiblePlace } from '../../logic/place-edit.js';
import { bottomSheet } from '../../components/bottom-sheet.js';
import { button } from '../../components/button.js';
import { mapBadge } from '../../components/map-badge.js';
import { radioOption } from '../../components/check-row.js';

export function copySheet(state) {
  const one = state.ui.copyScope?.startsWith('one:') ? findAccessiblePlace(state, state.ui.copyScope.slice(4)) : null;
  if (state.ui.copyScope?.startsWith('one:') && !one) return '';
  const sourceMapId = one?.mapId ?? state.currentMapId;
  const target = copyTargets(state, sourceMapId)[0];
  if (!target) return bottomSheet('다른 맵에 복제', '<p class="caption">복제할 다른 맵이 없어요. 함께 쓰기로 공유 맵을 만들면 복제할 수 있어요.</p>' + button('함께 쓰기', { href: '#/together' }));
  const places = activePlaces(state, sourceMapId);
  const count = places.filter((place) => state.ui.selectedIds.includes(place.id)).length;
  return bottomSheet('다른 맵에 복제', '<div class="copy-path"><span class="section-label">대상</span>' + mapBadge(target.type) + html`<span>${target.name}</span></div>` +
    (one ? html`<p class="caption">이 장소 1곳 · ${one.name}</p>` : '<div class="stack" role="radiogroup" aria-label="복제할 장소 범위">' +
      radioOption(`선택한 ${count}곳`, { action: 'copy-scope', id: 'selected', selected: state.ui.copyScope === 'selected', disabled: !count }) +
      radioOption(`이 맵의 전체 장소 ${places.length}곳`, { action: 'copy-scope', id: 'all', selected: state.ui.copyScope === 'all', caption: '개인 추가 정보는 다음 화면에서 따로 확인해요' }) + '</div>') +
    (state.ui.notice ? html`<p class="caption" role="status">${state.ui.notice}</p>` : '') +
    button('미리보기', { action: 'copy-sheet-preview', disabled: !one && !(state.ui.copyScope === 'all' ? places.length : count) }));
}
