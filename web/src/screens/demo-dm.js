import { appBar } from '../components/app-bar.js';
import { button } from '../components/button.js';

export function demoDmScreen() {
  return appBar('DM 대화 미리보기', { back: '#/catalog' }) + '<main class="page stack"><span class="badge personal">시연용</span>' +
    '<p class="caption">서비스 계정과의 대화</p><p class="bubble outgoing">[공유한 릴스 · 시연용]</p>' +
    '<p class="bubble">링크를 받았어요. 저장하려면 가자함 페이지에서 본인 확인과 저장할 맵을 확인해 주세요.</p>' +
    button('가자함에서 확인하기', { action: 'demo-intake', href: '#/intake' }) + '</main>';
}
