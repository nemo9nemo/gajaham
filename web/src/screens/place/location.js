import { html } from '../../html.js';
import { findAccessiblePlace } from '../../logic/place-edit.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { flowPage } from '../start/layout.js';
import { inaccessiblePlaceScreen, placeHref } from './shared.js';

export function placeLocationScreen(state) {
  const place = findAccessiblePlace(state, state.ui.params?.id);
  if (!place) return inaccessiblePlaceScreen();
  return flowPage(appBar('위치 수정', { back: placeHref(place.id) }),
    html`<div class="location-search"><input type="search" aria-label="장소명·지역 검색" value="${place.name}"></div>` +
    '<div class="location-map" role="img" aria-label="위치를 정할 지도"><div class="location-marker"><span class="pin-dot" aria-hidden="true"></span><span class="pin-label">여기로 옮기기</span></div></div>',
    '<p class="caption">검색 결과를 고르거나 지도를 움직여 위치를 정해요. 이 맵에만 적용돼요.</p>' +
    button('이 위치로 저장', { action: 'save-location', id: place.id }), 'place-page place-location-page');
}
