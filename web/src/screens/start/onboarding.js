import { html } from '../../html.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { mapBadge } from '../../components/map-badge.js';
import { flowPage } from './layout.js';

export function startScreen() {
  return flowPage('<header class="app-bar"><strong class="wordmark">가자함</strong></header>',
    '<h1 class="hero-title">인스타에서 본 맛집·카페·놀거리, 한곳에 모아 다시 찾기</h1>' +
    '<p class="muted">게시물·릴스를 서비스 계정에 DM으로 보내거나 링크를 붙여 넣으면, 확인할 수 있는 내용에서 장소와 게시물 내용을 정리해 내 맵에 보관해요.</p>' +
    '<ol class="steps card"><li><b>1</b> · DM으로 전달하거나 링크 입력</li><li><b>2</b> · 장소 확인, 필요하면 직접 보완</li><li><b>3</b> · 지도와 목록에서 다시 보기</li></ol>' +
    '<p class="soft caption">혼자 써도 충분해요. 함께 쓰기는 나중에 언제든 연결할 수 있어요.</p>',
    button('첫 링크 저장하기', { href: '#/todo/UI-03/3-1' }) + button('로그인', { action: 'login-start', variant: 'secondary' }) +
    '<p class="caption center">모바일 웹에서 바로 이용 · 앱 설치 없음</p>', 'landing');
}

export function intakeScreen(state) {
  const links = state.intakeLinks;
  const preview = '<section class="dm-preview" aria-label="시연용 DM 대화"><span class="caption">시연용</span>' +
    '<p class="bubble outgoing">[공유한 릴스 · 시연용]</p><p class="bubble">링크를 받았어요. 저장하려면 가자함 페이지에서 본인 확인과 저장할 맵을 확인해 주세요. <a href="#/intake">가자함에서 확인하기</a></p></section>';
  return flowPage(appBar('DM 대화 · 서비스 계정') + preview,
    '<span class="status-chip wait">비공개 임시 접수</span><h2>보내 주신 링크 1개를 임시로 받아 두었어요</h2>' +
    html`<div class="card"><p class="caption">받은 링크</p><p class="link-text">${links[0] ?? 'instagram.com/reel/[시연용]'}</p></div>` +
    '<p class="caption">본인 확인 전에는 어느 맵에도 저장되지 않고, 다른 사람에게 보이지 않아요.</p>',
    button('로그인하고 본인 확인', { action: 'login-intake' }));
}

export function verifyScreen() {
  return flowPage(appBar('본인 확인', { back: '#/intake' }),
    '<ol class="progress"><li class="status-chip ok">1 로그인 완료</li><li class="status-chip warn" aria-current="step">2 DM 계정 확인</li><li class="status-chip wait">3 저장 대상</li></ol>' +
    '<h2>DM을 보낸 계정이 본인 계정인가요?</h2><div class="card"><span class="caption">서비스 계정에 DM을 보낸 인스타그램 계정</span><strong>[보낸 계정 · 시연용 자리표시자]</strong>' +
    '<p class="caption">확인하면 이 계정에서 보내는 게시물이 내 처리함으로 들어와요.</p></div>' +
    '<p class="soft caption">함께 쓰는 사람의 DM 계정은 각자 따로 확인해요. 공유 연결 코드와는 별개예요.</p>',
    button('네, 제 계정이에요', { action: 'verify-account' }) +
    button('제 계정이 아니에요', { href: '#/todo/정책미정/1-3', variant: 'secondary' }));
}

export function saveTargetScreen(state) {
  return flowPage(appBar('저장 대상 확인', { back: '#/verify' }), '<h2>어디에 저장할까요?</h2>' +
    '<div class="save-option selected"><span class="radio-mark" aria-hidden="true"></span><div>' + mapBadge('personal') + '<strong>내 개인 맵</strong><p class="caption">나만 볼 수 있어요</p><span class="sr-only">선택됨</span></div></div>' +
    '<div class="save-option disabled" aria-disabled="true"><span class="radio-mark" aria-hidden="true"></span><div>' + mapBadge('shared') + '<strong>공유 맵</strong><p class="caption">함께 쓰기 연결 후 고를 수 있어요</p></div></div>' +
    '<p class="visibility"><b>누구에게 보이나요</b><span>나만</span></p><div class="card"><p class="caption">이번에 저장할 링크</p>' +
    html`<p class="link-text">${state.intakeLinks[0] ?? 'instagram.com/reel/[시연용]'}</p></div>` +
    '<p class="soft caption">DM으로 보낼 때 기본 저장 위치: <b>개인 맵</b> · 설정에서 바꿀 수 있어요</p>',
    button('내 개인 맵에 저장 요청', { href: '#/todo/UI-03/5-1' }) + '<p class="caption center">요청 후 처리함에서 결과를 확인해요</p>');
}
