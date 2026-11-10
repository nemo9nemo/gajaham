import { html } from '../html.js';
import { userName } from '../data/mock.js';

export function sourceTag(state, place, field, userInput = false) {
  if ((field === 'menu' && !place.menu) || (field === 'memo' && !place.memo)) return '';
  userInput ||= place.inputOrigin === 'manual';
  const actor = place.edits[field];
  const label = actor ? `직접 수정됨 · ${userName(state, actor)}` : userInput ? '사용자 입력'
    : place.sourceAccess === 'unavailable' ? '자동 추출 · 저장 당시' : '자동 추출';
  return html`<span class="source-tag ${actor || userInput ? 'user' : 'auto'}">${label}</span>`;
}

export const menuTitle = (place) => !place.menu ? '메뉴 정보 없음' : place.menu.kind === 'recommended' ? '게시물 추천 메뉴' : '언급 메뉴';
