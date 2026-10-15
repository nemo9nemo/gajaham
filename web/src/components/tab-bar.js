import { html } from '../html.js';

export function tabBar() {
  return '<nav class="tab-bar" aria-label="주 메뉴">' + [
    ['지도', '#/map'], ['처리함', '#/todo/UI-03/5-1'],
    ['이번 약속', '#/todo/UI-04/7-1'], ['설정', '#/todo/UI-04/8-1'],
  ].map(([label, href], index) => html`<a href="${href}" aria-current="${index === 0 ? 'page' : 'false'}">${label}</a>`).join('') + '</nav>';
}
