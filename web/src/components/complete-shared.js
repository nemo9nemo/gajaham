import { html } from '../html.js';
import { visibleMaps } from '../logic/maps.js';
import { button } from './button.js';
import { mapBadge } from './map-badge.js';

export const STAGE_LABELS = { waiting: '연결 대기', processing: '분석 중', 'needs-confirmation': '확인 필요',
  'needs-place': '장소 정보 확인 필요', failed: '분석 실패', partial: '일부 완료', saved: '저장 완료',
  unsupported: '분석 미지원 출처', 'link-only': '링크 보관' };

export function stageChip(stage) {
  return html`<span class="status-chip ${stage === 'saved' ? 'ok' : stage === 'failed' ? 'error' : ['partial', 'needs-confirmation', 'needs-place', 'unsupported'].includes(stage) ? 'warn' : 'wait'}">${STAGE_LABELS[stage] ?? stage}</span>`;
}

export function mapLabel(state, id) {
  const map = visibleMaps(state).find((item) => item.id === id);
  return map ? mapBadge(map.type) + html`<span>${map.name}</span>` : '<span class="caption">공유 맵 · 접근 종료</span>';
}

export function mapAudience(state, id) {
  const map = visibleMaps(state).find((item) => item.id === id);
  if (!map) return '접근 종료';
  return map.type === 'personal' ? '나만' : map.memberIds.map((userId) =>
    state.users.find((user) => user.id === userId)?.name ?? '참여자').join(', ');
}

export function targetOptions(state, selected, action, { both = true } = {}) {
  const maps = visibleMaps(state);
  const options = maps.map((map) => ({ id: map.id, title: map.name,
    caption: map.type === 'personal' ? '나만 볼 수 있어요' : `${mapAudience(state, map.id)}에게 보여요`, type: map.type }));
  if (both && maps.some((map) => map.type === 'shared')) options.push({ id: 'both', title: '둘 다', caption: '두 맵에 각각 저장 · 이후 수정은 맵마다 따로', type: null });
  return '<div class="stack" role="radiogroup" aria-label="저장 대상">' + options.map((option) =>
    html`<button type="button" class="save-option ${selected === option.id ? 'selected' : ''}" role="radio" aria-checked="${selected === option.id}" data-action="${action}" data-id="${option.id}"><span class="radio-dot" aria-hidden="true"></span><span class="option-copy">` +
    (option.type ? mapBadge(option.type) : '') + html`<strong>${option.title}</strong><span class="caption">${option.caption}</span></span></button>`).join('') + '</div>';
}

export function missingItem(title = '처리 항목') {
  return '<main class="page stack"><h1>' + html`${title}` + '</h1><p>이 항목을 볼 수 없어요</p><p class="caption">삭제됐거나 접근할 수 없는 항목이에요.</p>' + button('지도로 돌아가기', { href: '#/map' }) + '</main>';
}

export function compactPlace(place, state, { detail = true } = {}) {
  return '<section class="card">' + html`<strong>${place.name}</strong><p class="caption">${place.category} · ${place.region} · ${place.locationStatus === 'confirmed' ? '위치 확인됨' : '위치 미확정 · 지도에 표시 안 됨'}</p>` +
    (detail ? button('카드 보기', { href: `#/place/${encodeURIComponent(place.id)}`, variant: 'secondary' }) : '') + '</section>';
}
