import { html } from '../../html.js';
import { visibleMaps } from '../../logic/maps.js';
import { buildCopyDraft, readableExtras } from '../../logic/copy.js';
import { userName } from '../../data/mock.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { mapBadge } from '../../components/map-badge.js';
import { checkRow } from '../../components/check-row.js';
import { notice } from '../../components/notice.js';
import { flowPage } from '../start/layout.js';

export function missingCopyScreen() {
  return flowPage(appBar('복제'), '<h2>복제할 장소를 먼저 골라 주세요</h2>', button('지도로 돌아가기', { href: '#/map' }), 'copy-page');
}

export function copyPreviewScreen(state) {
  const draft = state.copy.draft;
  if (!draft) return missingCopyScreen();
  const maps = visibleMaps(state);
  const source = maps.find((map) => map.id === draft.sourceMapId);
  const target = maps.find((map) => map.id === draft.targetMapId);
  if (!source || !target) return flowPage(appBar('복제 미리보기', { back: draft.back ?? '#/map' }),
    notice(state.ui.notice || '대상 맵에 접근할 수 없어 복제하지 않았어요. 연결 상태를 확인해 주세요.'),
    button('지도로 돌아가기', { href: '#/map' }), 'copy-page');
  const count = draft.placeIds.length;
  const toShared = draft.direction === 'personal-to-shared';
  const extra = (label, id, caption = '') => checkRow(label, { id, action: 'toggle-extra', checked: draft.extras[id], caption });
  const readable = readableExtras(state, draft.placeIds);
  let body = '<section class="card copy-map-card"><div class="copy-path"><span class="section-label">원래 맵</span>' + mapBadge(source.type) + html`<span>${source.name}</span></div>` +
    '<div class="copy-path"><span class="section-label">대상</span>' + mapBadge(target.type) + html`<span>${target.name}</span></div>`;
  if (toShared) {
    const other = target.memberIds.find((id) => id !== state.currentUserId);
    body += html`<p class="caption">원래 맵 이름은 나에게만 보여요. ${userName(state, other)}에게는 ‘${userName(state, state.currentUserId)}가 복제’로만 표시돼요.</p>`;
  }
  body += '</section><section class="soft">' + html`<strong>${toShared ? `선택한 장소 ${count}곳 · 항상 포함` : count === 1 ? `${state.places.find((place) => place.id === draft.placeIds[0] && place.mapId === source.id && !place.trashed)?.name ?? ''} · 기본 정보 포함` : `선택한 장소 ${count}곳 · 기본 정보 포함`}</strong>` +
    (toShared ? '<p class="caption">장소명·지점·주소·카테고리·위치 상태·게시물 소개·메뉴·원본 링크·출처</p>' : '') + '</section>';
  if (toShared) body += '<h2 class="section-label">개인 추가 정보 · 기본 해제</h2><div>' + extra('내 메모', 'memo') + extra('직접 올린 사진', 'photos') + extra('내 방문 기록', 'visits') +
    '</div><p class="caption">관심 표시·약속·평가는 복제되지 않아요. 원래 장소는 남고, 복제 후 각 맵에서 따로 관리돼요.</p>';
  else {
    body += '<h2 class="section-label">공유 맵 기록 중 가져올 항목 · 읽을 수 있는 항목만</h2><div>';
    if (readable.memo.length) body += readable.memo.length === 1
      ? extra(`우리 메모 “${readable.memo[0].text}”`, 'memo', `${userName(state, readable.memo[0].authorId)} 작성`)
      : extra(`우리 메모 ${readable.memo.length}개`, 'memo');
    if (readable.photos) body += extra(`공유 맵 사진 ${readable.photos}장`, 'photos');
    if (!readable.memo.length && !readable.photos) body += '<p class="caption">가져올 기록이 없어요</p>';
    body += '</div><p class="soft caption">가져오지 않음: 관심 표시 · 이번 약속 · 상대방 평가</p>';
  }
  body += html`<p class="visibility"><strong>누구에게 보이나요</strong><span>${toShared ? target.memberIds.map((id) => userName(state, id)).join(', ') : '나만'}</span></p>`;
  return flowPage(appBar('복제 미리보기', { back: draft.back ?? '#/map' }), body,
    (state.ui.notice ? notice(state.ui.notice) : '') + button(toShared ? `${count}곳 복제하기` : '내 개인 맵에 복제', {
      action: 'copy-execute', disabled: !buildCopyDraft(state, draft).ok,
    }), 'copy-page copy-preview-page');
}
