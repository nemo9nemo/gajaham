import { html } from '../../html.js';
import { userName, userInitial } from '../../data/mock.js';
import { visibleMaps } from '../../logic/maps.js';
import { findAccessiblePlace } from '../../logic/place-edit.js';
import { button } from '../../components/button.js';
import { mapBadge } from '../../components/map-badge.js';
import { sourceTag, menuTitle } from '../../components/source-tag.js';
import { dialog } from '../../components/dialog.js';
import { flowPage } from '../start/layout.js';
import { copySheet } from '../copy/sheet.js';
import { historyLabel } from './history.js';
import { inaccessiblePlaceScreen, placeHref } from './shared.js';

function deleteDialog(state, place, map) {
  const shared = map.type === 'shared';
  const other = shared ? map.memberIds.find((id) => id !== state.currentUserId) : null;
  return dialog(html`${map.name}에서 삭제할까요?`, html`<p class="caption">${shared
    ? `휴지통으로 이동해요. ${userName(state, other)}의 화면에서도 사라지고, 삭제한 사람은 ‘${userName(state, state.currentUserId)}’로 기록돼요.` : '휴지통으로 이동해요.'}</p>` +
    html`<p class="caption">${shared ? '다른 맵의 복제본은 지워지지 않아요.' : '공유 맵 등 다른 맵의 복제본은 지워지지 않아요.'}</p>` +
    html`<button type="button" class="button danger" data-action="confirm-delete" data-id="${place.id}" data-autofocus>휴지통으로 이동</button>` +
    button('취소', { action: 'close-sheet', variant: 'text' }));
}

export function placeDetailScreen(state) {
  const place = findAccessiblePlace(state, state.ui.params?.id);
  if (!place) return inaccessiblePlaceScreen();
  const map = visibleMaps(state).find((item) => item.id === place.mapId);
  const shared = map.type === 'shared';
  const memoTitle = shared ? '우리 메모' : '내 메모';
  const header = '<header class="app-bar">' + html`<button type="button" class="back back-button" data-action="show-map" data-id="${map.id}" aria-label="지도로 돌아가기">‹</button>` +
    mapBadge(map.type) + html`<span class="caption">${map.name}</span></header>`;
  let body = place.hasImage ? '<div class="place-image image-placeholder">대표 이미지 · 원본에서 확보 가능한 경우</div>' :
    html`<div class="place-image text-image"><strong>${place.name}</strong><span>이미지를 가져오지 못해 텍스트 카드로 보여요</span></div>`;
  if (place.locationStatus === 'confirmed') body += html`<div class="place-heading"><h1>${place.name}</h1><p class="caption">${place.category} · ${place.region} · 위치 확인됨</p><p class="caption">위치 확인은 지점 확인이에요. 영업 정보가 최신이라는 뜻은 아니에요.</p></div>`;
  else body += html`<p class="caption">${place.category} · 위치 미확정 · 지도에 핀 없음</p>`;
  if (place.sourceAccess === 'unavailable') body += '<section class="card source-unavailable"><span class="status-chip warn">원문에 접근할 수 없어요</span><p class="caption">원문이 삭제됐거나 비공개로 바뀐 것 같아요. 이미 저장한 정보와 내 메모는 그대로 볼 수 있어요.</p></section>';
  body += '<section class="soft"><h2 class="section-label">' + (place.inputOrigin === 'manual' ? '직접 연결한 장소' : '게시물 소개') + sourceTag(state, place, 'summary') + '</h2>' + html`<p class="info-text">${place.summary}</p></section>` +
    '<section class="card"><h2 class="section-label">' + html`${menuTitle(place)}` + sourceTag(state, place, 'menu') + '</h2>' +
    (place.menu ? html`<strong class="menu-name">${place.menu.name}</strong><p class="caption">${place.menu.kind === 'recommended' ? place.menu.basis : '추천 근거 없음'}</p>` : '') + '</section>';
  if (place.tip) body += html`<section class="card"><h2 class="section-label">방문 팁 · 게시물 작성자의 경험</h2><p class="info-text">${place.tip}</p></section>`;
  body += '<section class="card memo-card"><h2 class="section-label">' + html`${memoTitle}` + sourceTag(state, place, 'memo', true) + '</h2>' +
    html`<p class="${place.memo ? 'info-text' : 'caption'}">${place.memo?.text ?? '아직 메모가 없어요'}</p><p class="caption">${shared ? (place.memo ? `작성: ${userName(state, place.memo.authorId)}` : '') : '나만 볼 수 있어요'}</p></section>`;
  if (place.locationStatus !== 'confirmed') body += button('위치 직접 정하기', { href: placeHref(place.id, '/location') });
  const want = place.wantBy.includes(state.currentUserId);
  body += html`<div class="visit-actions ${shared ? '' : 'visit-actions-two'}"><button type="button" class="visit-action" data-action="toggle-want" data-id="${place.id}" aria-pressed="${want}">가고 싶어</button>` +
    (shared ? html`<button type="button" class="visit-action" data-action="candidate-from-detail" data-id="${place.id}">이번 약속 후보</button>` : '') +
    html`<button type="button" class="visit-action" data-action="toggle-visited" data-id="${place.id}" aria-pressed="${place.visit === 'visited'}">다녀왔어요</button></div>`;
  body += html`<section id="place-sources" class="stack"><h2 class="section-label">참고 글 ${place.sources.length}개</h2>` +
    place.sources.map((source, index) => '<article class="card"><div class="content-row">' + html`<strong>출처 ${index + 1} · ${['게시물', '릴스'].includes(source.kind) ? `인스타 ${source.kind}` : `원본 ${source.kind}`}</strong>` +
      button('원본', { action: 'source-entry', id: String(index), variant: 'text' }) + '</div>' +
      html`<p class="caption">보낸 사람 ${userInitial(state, source.senderId)} · 저장 ${source.savedAt}${source.postedAt ? ` · 게시일 ${source.postedAt}` : ''}${source.fetchedAt ? ` · 가져온 시각 ${source.fetchedAt}` : ''}</p>` +
      (source.basis ? html`<p class="caption">근거: ${source.basis}</p>` : '') + (source.menuNote ? html`<p class="caption">${source.menuNote}</p>` : '') + '</article>').join('') +
    html`<p class="soft caption">새 출처가 더해져도 ${shared ? '우리' : '내'} 메모와 직접 수정한 내용은 바뀌지 않아요.</p></section>`;
  body += '<h2 class="section-label">이 맵의 기록</h2>' + html`<p class="caption">${place.history.map((entry) => `${historyLabel(entry, true)} ${userName(state, entry.actorId)}`).join(' · ')}</p>` +
    (place.history.some((entry) => entry.type === 'copied') ? html`<p class="caption">복제한 사람: ${userName(state, place.history.findLast((entry) => entry.type === 'copied').actorId)}</p>` : '') +
    button('기록 전체 보기', { href: placeHref(place.id, '/history'), variant: 'text' }) +
    '<h2 class="section-label">이 맵에서 관리</h2><div class="manage-actions">' +
    button('정보·메모 수정', { href: placeHref(place.id, '/edit'), variant: 'secondary' }) +
    button('위치 수정', { href: placeHref(place.id, '/location'), variant: 'secondary' }) +
    button('다른 맵에 복제', { action: 'open-copy', id: `one:${place.id}`, variant: 'secondary' }) +
    button('이 맵에서 삭제', { action: 'open-delete', id: place.id, variant: 'danger' }) + '</div>';
  const footer = '<div class="button-row detail-footer">' + button('길찾기 · 외부 지도 앱', { action: 'directions', disabled: place.locationStatus !== 'confirmed' }) +
    button('원본', { action: 'source', id: place.id, variant: 'secondary' }) + '</div>';
  const page = flowPage(header, body, footer, 'place-page place-detail-page');
  const modal = state.ui.sheet === 'copy' || state.ui.sheet === 'delete';
  return (modal ? '<div inert>' + page + '</div>' : page) +
    (state.ui.sheet === 'copy' ? copySheet(state) : state.ui.sheet === 'delete' ? deleteDialog(state, place, map) : '');
}
