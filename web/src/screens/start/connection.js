import { html } from '../../html.js';
import { CODE_STATUS, UNUSABLE_CODE_MESSAGE, redeemCode } from '../../logic/code.js';
import { hasActiveShared, visibleMaps } from '../../logic/maps.js';
import { userName } from '../../data/mock.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { mapBadge } from '../../components/map-badge.js';
import { notice } from '../../components/notice.js';
import { flowPage } from './layout.js';

const statusTone = (status) => ['available', 'used'].includes(status) ? 'ok' : status === 'superseded' ? 'error' : 'wait';

export function loginRequiredScreen() {
  return flowPage(appBar('받은 코드 입력', { back: '#/start' }), '<h2>로그인 후 연결할 수 있어요</h2>' +
    '<p class="muted">코드를 입력하기 전에 로그인해 주세요. 로그인과 연결 확인을 거친 뒤 공유 맵을 만들어요.</p>',
    button('로그인', { action: 'login-code' }));
}

export function togetherScreen(state) {
  if (!state.loggedIn) return loginRequiredScreen();
  if (hasActiveShared(state)) return alreadySharedScreen(state);
  const code = state.codes.findLast((item) => item.ownerId === state.currentUserId);
  const status = CODE_STATUS[code?.status];
  return flowPage(appBar('함께 쓰기', { back: '#/map' }), '<h2 class="compact-title">함께 쓸 사람과 공유 맵을 만들어요</h2>' +
    '<ul class="guide soft"><li>연결하면 ‘우리 공유 맵’이 새로 생겨요</li><li>내 개인 맵은 그대로 남고 자동으로 공개되지 않아요</li>' +
    '<li>공유 맵에 넣을 장소는 각자 골라 복제해요</li><li>인스타그램 DM 계정 확인은 각자 따로 해요</li></ul>' +
    '<section class="card code-card">' + (status ? html`<span class="status-chip ${statusTone(code.status)}">${status.label}</span>` : '') +
    '<p class="code-value">[연결 코드]</p><p class="caption">상대방이 로그인한 뒤 ‘받은 코드 입력’에 넣으면 연결돼요.</p></section>' +
    (code ? button('코드 복사', { action: 'copy-code', variant: 'secondary', disabled: code.status !== 'available' }) : '') +
    '<div class="button-row">' + (code ? button('코드 취소', { action: 'cancel-code', variant: 'secondary', disabled: code.status !== 'available' }) : '') +
    button(code ? '재발급' : '새 코드 만들기', { action: 'issue-code', variant: 'secondary' }) + '</div><div class="actions">' +
    button('받은 코드 입력', { href: '#/code-enter', variant: 'secondary' }) +
    button('코드 상태 보기', { href: '#/code-status', variant: 'text' }) + '</div>');
}

export function codeStatusScreen() {
  return flowPage(appBar('연결 코드', { back: '#/together' }),
    Object.entries(CODE_STATUS).map(([status, text]) => html`<section class="card status-card ${status === 'superseded' ? 'invalid-code' : ''}"><span class="status-chip ${statusTone(status)}">${text.label}</span><p class="caption">${text.description}</p>` +
      (['expired', 'cancelled'].includes(status) ? button('새 코드 만들기', { action: 'issue-code', href: '#/together', variant: 'secondary' }) : '') + '</section>').join('') +
    '<section class="soft"><h2 class="label-title">입력하는 쪽 안내</h2>' + html`<p class="caption">${UNUSABLE_CODE_MESSAGE}</p>` + '</section>', '', 'code-status-page');
}

export function codeEntryScreen(state) {
  if (!state.loggedIn) return loginRequiredScreen();
  if (hasActiveShared(state)) return alreadySharedScreen(state);
  const result = state.ui.codeChecked || state.ui.codeResult
    ? redeemCode(state, state.ui.codeInput.trim(), state.currentUserId) : null;
  if (result?.reason === 'already-shared') return alreadySharedScreen(state);
  let content = '';
  if (result?.ok) {
    const owner = result.owner;
    content = '<section class="card connection-target"><div class="person">' + html`<span class="avatar">${owner.initial}</span><div><strong>${owner.name}</strong>` +
      '<p class="caption">이 사람과 공유 맵을 만들까요?</p></div></div><ul class="guide"><li>새 ‘우리 공유 맵’이 생겨요</li>' +
      '<li>내 개인 맵의 기존 장소는 그대로, 비공개로 남아요</li>' + html`<li>${owner.name}는 내 개인 맵을 볼 수 없어요</li>` +
      '<li>인스타그램 DM 계정은 이 연결로 이어지지 않아요</li></ul></section>';
  } else if (result) {
    content = notice(result.reason === 'own-code' ? '내가 만든 코드는 입력할 수 없어요.' : UNUSABLE_CODE_MESSAGE, 'error');
  }
  return flowPage(appBar('받은 코드 입력', { back: '#/together' }), '<form data-action="check-code" class="code-form">' +
    html`<label for="connection-code">연결 코드</label><input id="connection-code" name="code" data-action="code-input" placeholder="[연결 코드]" autocomplete="off" value="${state.ui.codeInput}">` +
    '<button type="submit" class="button secondary">코드 확인</button></form>' + content,
    (result?.ok ? button('연결하기', { action: 'confirm-connect' }) : '') +
    button('취소', { href: '#/map', variant: 'secondary' }));
}

export function connectedScreen(state) {
  if (!state.loggedIn) return loginRequiredScreen();
  const maps = visibleMaps(state);
  const shared = maps.find((map) => map.type === 'shared');
  if (!shared) return codeEntryScreen(state);
  const target = state.dmDefaultTarget === 'shared' ? '공유 맵' : '개인 맵';
  return flowPage(appBar('연결 완료'), '<h2>연결됐어요</h2>' +
    '<section class="card">' + mapBadge('personal') + '<h2>내 개인 맵</h2><p>그대로 유지 · 나만 볼 수 있어요</p></section>' +
    '<section class="card">' + mapBadge('shared') + html`<h2>${shared.name}</h2><p>새로 생김 · ${shared.memberIds.map((id) => userName(state, id)).join(', ')}</p></section>` +
    '<p class="muted">이제 내 개인 장소 중 공유 맵에 넣을 장소를 골라요. 상대방은 내 선택을 기다리지 않고 바로 쓸 수 있어요.</p>' +
    html`<p class="caption">DM 기본 저장 위치는 그대로 ‘${target}’이에요.</p>`, button('공유 맵에 넣을 장소 고르기', { href: '#/todo/UI-02/2-1' }) +
    button('나중에 할게요', { action: 'show-shared', href: '#/map', variant: 'text' }));
}

export function alreadySharedScreen(state) {
  const shared = visibleMaps(state).find((map) => map.type === 'shared');
  const partnerId = shared?.memberIds.find((id) => id !== state.currentUserId);
  return flowPage(appBar('받은 코드 입력', { back: '#/map' }), '<span class="status-chip warn">이미 공유 맵에 참여 중</span>' +
    '<h2>이미 함께 쓰는 공유 맵이 있어요</h2>' + (shared ? '<section class="card">' + mapBadge('shared') +
      html`<h2>${shared.name}</h2><p>${userName(state, partnerId)}와 함께 쓰는 중</p></section>` : '') +
    '<p class="muted">공유 맵은 한 번에 하나만 쓸 수 있어요. 새 코드로 자동으로 바꾸지 않아요. 새 사람과 연결하려면 먼저 지금 공유 맵에서 나가야 해요.</p>',
    (shared ? button('지금 공유 맵 보기', { action: 'show-shared', href: '#/map' }) : button('지도로 돌아가기', { href: '#/map' })) +
    button('공유 맵 나가기 안내', { href: '#/todo/UI-04/8-5', variant: 'secondary' }));
}
