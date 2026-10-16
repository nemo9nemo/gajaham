import { html } from '../../html.js';
import { visibleMaps } from '../../logic/maps.js';
import { copySources } from '../../logic/copy.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { mapBadge } from '../../components/map-badge.js';
import { checkRow, radioOption } from '../../components/check-row.js';
import { flowPage } from '../start/layout.js';

function mapsForCopy(state) {
  const maps = visibleMaps(state);
  return { personal: maps.find((map) => map.type === 'personal'), shared: maps.find((map) => map.type === 'shared') };
}

function noShared(header) {
  return flowPage(header, '<h2>공유 맵이 아직 없어요</h2>', button('함께 쓰기', { href: '#/together' }), 'copy-page');
}

export function initialCopyScreen(state) {
  const header = appBar('초기 복제');
  if (!mapsForCopy(state).shared) return noShared(header);
  return flowPage(header, '<h2>공유 맵에 내 장소를 넣을까요?</h2><p class="caption">내 개인 맵 장소만 고를 수 있어요. 상대방의 개인 장소는 보이지 않아요.</p>' +
    '<div class="stack" role="radiogroup" aria-label="초기 복제 선택">' + [
      ['none', '지금 복제 안 함', '나중에 ‘다른 맵에 복제’로 언제든 넣을 수 있어요'],
      ['selected', '선택한 장소 복제', '내 개인 맵에서 골라요'],
      ['all', '전체 장소 복제', `장소 ${copySources(state).length}곳 전체 · 메모·사진·방문 기록은 다음 단계에서 따로 골라요`],
    ].map(([id, label, caption]) => radioOption(label, { action: 'copy-choice', id, caption, selected: state.ui.copyChoice === id })).join('') +
    '</div><p class="caption">상대방은 내 선택을 기다리지 않고 공유 맵을 쓸 수 있어요.</p>',
    button('다음', { action: 'copy-initial-next' }), 'copy-page');
}

export function selectCopyScreen(state) {
  const header = appBar('복제할 장소 선택', { back: '#/copy/initial' });
  const { personal, shared } = mapsForCopy(state);
  if (!shared) return noShared(header);
  const places = copySources(state);
  const count = places.filter((place) => state.ui.copyPick.includes(place.id)).length;
  return flowPage(header, '<div class="copy-path">' + mapBadge('personal') + html`<span>${personal?.name}에서</span><span>→</span>` +
    mapBadge('shared') + html`<span>${shared.name}으로</span></div>` +
    '<div class="copy-pick-list">' + places.map((place) => checkRow(place.name, {
      action: 'copy-pick', id: place.id, checked: state.ui.copyPick.includes(place.id),
      caption: `${place.category} · ${place.locationStatus === 'confirmed' ? '위치 확인됨' : '위치 미확정 · 미확정 상태로 복제돼요'}${place.memo ? ' · 내 메모 있음' : ''}`,
    })).join('') + '</div>', button(`${count}곳 미리보기`, { action: 'copy-pick-preview', disabled: !count }), 'copy-page');
}
