import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { flowPage } from '../start/layout.js';

export const placeHref = (id, suffix = '') => `#/place/${encodeURIComponent(id)}${suffix}`;

export function inaccessiblePlaceScreen() {
  return flowPage(appBar('장소', { back: '#/map' }), '<h2>이 장소를 볼 수 없어요</h2><p class="muted">삭제됐거나 이 맵에 접근할 수 없어요.</p>', button('지도로 돌아가기', { href: '#/map' }), 'place-page');
}
