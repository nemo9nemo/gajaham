import { html } from '../../html.js';
import { visibleMaps } from '../../logic/maps.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { notice } from '../../components/notice.js';
import { flowPage } from '../start/layout.js';
import { missingCopyScreen } from './preview.js';

export function copyResultScreen(state) {
  const result = state.copy.result;
  if (!result) return missingCopyScreen();
  const target = visibleMaps(state).find((map) => map.id === result.targetMapId);
  if (!target) return flowPage(appBar('복제 결과'), '<p>대상 맵에 접근할 수 없어요.</p>', button('지도로 돌아가기', { href: '#/map' }), 'copy-page');
  const failed = result.total - result.done;
  const status = !failed ? `완료 · ${result.total}곳` : result.done ? `일부 완료 · ${result.total}곳 중 ${result.done}곳` : '복제하지 못했어요';
  const body = html`<span class="status-chip ${!failed ? 'ok' : result.done ? 'warn' : 'error'}">${status}</span>` + result.items.map((item) => {
    let label, caption = '', tone;
    if (item.outcome === 'failed') { label = '실패'; caption = '복제하지 못했어요.'; tone = 'error'; }
    else if (item.outcome === 'unchanged') { label = '이미 있음'; caption = '이미 같은 장소가 있어 바뀐 내용이 없어요.'; tone = 'wait'; }
    else if (item.outcome === 'source-added') { label = '출처 추가'; caption = `같은 지점이 이미 있어 출처만 더했어요. 기존 ${target.type === 'shared' ? '우리' : '내'} 메모·수정·방문 상태는 그대로예요.`; tone = 'ok'; }
    else if (item.unconfirmed) { label = '위치 미확정'; caption = '미확정 상태로 복제. 지도 핀 없이 목록에 있어요.'; tone = 'warn'; }
    else { label = '새 장소'; tone = 'ok'; }
    return html`<section class="card copy-result-card ${item.outcome === 'failed' ? 'copy-failed' : ''}"><div class="content-row"><strong>${item.name}</strong><span class="status-chip ${tone}">${label}</span></div>` +
      (caption ? html`<p class="caption">${caption}</p>` : '') + '</section>';
  }).join('');
  return flowPage(appBar(`복제 결과 · ${target.name}`), body, (state.ui.notice ? notice(state.ui.notice) : '') +
    (failed ? button(`실패한 ${failed}곳만 다시 복제`, { action: 'copy-retry' }) : '') +
    button(`${target.name}에서 보기`, { action: 'copy-done', variant: failed ? 'secondary' : 'primary' }), 'copy-page copy-result-page');
}
