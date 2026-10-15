import { html } from '../html.js';
import { appBar } from '../components/app-bar.js';
import { button } from '../components/button.js';

export function placeholderScreen(state) {
  const { briefId, screenId } = state.ui.todo;
  return appBar('가자함') + '<main class="page stack empty"><span class="illustration" aria-hidden="true">◇</span><h2>' +
    (briefId === '정책미정' ? '정책이 정해지지 않은 화면이에요' : '준비 중인 화면이에요') + '</h2>' +
    html`<p>${screenId} · ${briefId}에서 만들어요</p>` + button('지도로 돌아가기', { href: '#/map' }) + '</main>';
}
