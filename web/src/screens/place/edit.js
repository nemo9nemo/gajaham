import { html } from '../../html.js';
import { visibleMaps } from '../../logic/maps.js';
import { findAccessiblePlace } from '../../logic/place-edit.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { mapBadge } from '../../components/map-badge.js';
import { sourceTag, menuTitle } from '../../components/source-tag.js';
import { flowPage } from '../start/layout.js';
import { inaccessiblePlaceScreen, placeHref } from './shared.js';

export function placeEditScreen(state) {
  const place = findAccessiblePlace(state, state.ui.params?.id);
  if (!place) return inaccessiblePlaceScreen();
  const map = visibleMaps(state).find((item) => item.id === place.mapId);
  const draft = state.ui.editDraft?.placeId === place.id ? state.ui.editDraft : {};
  const field = (label, key, sourceField, value) => html`<label for="edit-${key}">${label}` + sourceTag(state, place, sourceField) + '</label>' +
    html`<input id="edit-${key}" data-action="edit-field" data-field="${key}" value="${draft[key] ?? value}">`;
  const body = field('장소명', 'name', 'name', place.name) +
    '<span id="category-label" class="field-label">카테고리' + sourceTag(state, place, 'category') + '</span>' +
    '<div class="category-segments" role="radiogroup" aria-labelledby="category-label">' +
    ['맛집', '카페', '놀거리'].map((category) => html`<button type="button" role="radio" aria-checked="${(draft.category ?? place.category) === category}" data-action="edit-category" data-id="${category}">${category}</button>`).join('') + '</div>' +
    field(menuTitle(place), 'menuName', 'menu', place.menu?.name ?? '') +
    html`<label for="edit-memoText">${map.type === 'shared' ? '우리 메모' : '내 메모'}</label><textarea id="edit-memoText" data-action="edit-field" data-field="memoText" rows="3">${draft.memoText ?? place.memo?.text ?? ''}</textarea>` +
    '<p class="soft caption">재분석하거나 새 출처가 더해져도 직접 수정한 내용과 메모는 덮어쓰지 않아요. 수정은 이 맵에만 적용돼요.</p>';
  return flowPage(appBar('정보 수정', { back: placeHref(place.id), right: mapBadge(map.type) }), body,
    button('저장', { action: 'save-edit', id: place.id }), 'place-page place-edit-page');
}
