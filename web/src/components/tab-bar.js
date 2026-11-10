import { html } from '../html.js';

export function tabBar(active = '지도') {
  return '<nav class="tab-bar" aria-label="주 메뉴">' + [
    ['지도', '#/map'], ['처리함', '#/inbox'],
    ['이번 약속', '#/appointments'], ['설정', '#/settings'],
  ].map(([label, href]) => html`<a href="${href}" aria-current="${label === active ? 'page' : 'false'}">${label}</a>`).join('') + '</nav>';
}
