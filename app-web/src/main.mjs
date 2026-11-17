import { privacyContent } from './privacy-content.mjs';
import './style.css';
import { CATEGORIES, escaped as e, editableInput as normalizeInput, normalizeUrl } from './domain.mjs';
import * as gateway from './gateway.mjs';
import { allGuest, createGuest, mutateGuest, guestTransferId, rearmGuestTransfer, removeTransferredGuest } from './guest.mjs';
import { transferRows } from './transfer.mjs';

const app = document.querySelector('#app');
const state = { owner: 'loading', user: null, records: [], tab: 'all', category: 'all', query: '', loading: true, failure: '', guestCount: 0, deleting: false, displayLimit: 50, connection: 'checking' };
let epoch = 0; let refreshGeneration = 0; let busyToken = null; let dialog = null; let lastRefresh = 0; let toastTimer;
let transferSession = null;
let pendingDeletion = null;
try { const saved = JSON.parse(sessionStorage.getItem('gajaham-deletion') ?? 'null'); if (saved && /^[a-f0-9]{64}$/.test(saved.receipt) && typeof saved.uid === 'string') pendingDeletion = saved; } catch {}
function rememberDeletion(value) { pendingDeletion = value; try { if (value) sessionStorage.setItem('gajaham-deletion', JSON.stringify(value)); else sessionStorage.removeItem('gajaham-deletion'); } catch {} }
const snapshot = () => ({ epoch, owner: state.owner });
const same = current => current.epoch === epoch && current.owner === state.owner;
const button = (action, label, cls = 'button secondary', attrs = '') => `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
const date = value => Number.isFinite(value) ? new Intl.DateTimeFormat('ko', { month: 'long', day: 'numeric' }).format(value) : '';
const categoryOptions = selected => Object.entries(CATEGORIES).map(([value, name]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${name}</option>`).join('');
const glyph = { food: '♧', cafe: '☕', play: '✦', stay: '⌂', other: '◇' };

function toast(message) { const target = document.querySelector('#toast'); target.textContent = message; target.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => target.classList.remove('visible'), 4500); }
const recordValues = form => Object.fromEntries([...form.elements].filter(field => field.name && !field.name.startsWith('merge-')).map(field => [field.name, field.type === 'checkbox' ? field.checked : field.value]));
const dirty = () => { const form = dialog?.querySelector('form[data-form="record"]'); return Boolean(dialog?.duplicateDraftPending || (form && form.dataset.initial !== JSON.stringify(recordValues(form)))); };
function closeDialog(force = false) {
  if (!dialog) return true;
  if (!force && (busyToken || (dirty() && !window.confirm('입력한 내용을 버리고 닫을까요?')))) return false;
  const returnFocus = dialog.returnFocus;
  dialog.querySelectorAll('input[type=password]').forEach(input => { input.value = ''; }); dialog.close(); dialog.remove(); dialog = null; transferSession = null;
  if (returnFocus?.isConnected) returnFocus.focus(); else document.querySelector('[data-action="new-record"]')?.focus();
  return true;
}
function openDialog(title, body, kind = '', force = false) {
  const returnFocus = dialog?.returnFocus ?? document.activeElement;
  if (!closeDialog(force)) return null;
  dialog = document.createElement('dialog'); dialog.className = 'sheet'; dialog.dataset.kind = kind; dialog.dataset.epoch = String(epoch); dialog.returnFocus = returnFocus;
  dialog.setAttribute('aria-labelledby', 'sheet-title'); dialog.setAttribute('aria-modal', 'true');
  dialog.innerHTML = `<div class="sheet-heading"><h2 id="sheet-title" tabindex="-1">${e(title)}</h2>${button('close-dialog', '✕', 'icon-button', 'aria-label="닫기"')}</div>${body}<p id="sheet-error" class="form-error" role="alert" tabindex="-1"></p><div class="error-actions"></div>`;
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); }); document.body.append(dialog); dialog.showModal();
  const opened = dialog; queueMicrotask(() => { if (dialog === opened) (['record', 'privacy'].includes(kind) ? opened.querySelector('#sheet-title') : opened.querySelector('input:not([readonly]):not([disabled])') ?? opened.querySelector('#sheet-title'))?.focus(); });
  return dialog;
}
function showError(error) {
  const slot = dialog?.querySelector('.form-error');
  if (!slot) { toast(gateway.errorMessage(error)); return; }
  slot.textContent = gateway.errorMessage(error);
  for (const field of dialog.querySelectorAll('input,textarea,select')) { field.setAttribute('aria-describedby', 'sheet-error'); if (['invalid-argument', 'weak-password', 'auth/invalid-email'].includes(error.code)) field.setAttribute('aria-invalid', 'true'); }
  const actions = dialog.querySelector('.error-actions');
  if (actions) actions.innerHTML = ['record-limit', 'storage-limit'].includes(error.reason) ? button('trash-tab', '휴지통 보기', 'button secondary') : error.reason === 'operation-limit' ? button('privacy', '문의 안내 보기', 'button secondary') : '';
  slot.focus();
}
function setBusy(token, busy) {
  if (busy) { busyToken = token; document.documentElement.classList.add('busy'); }
  else { if (busyToken !== token) return; busyToken = null; document.documentElement.classList.remove('busy'); }
  document.querySelectorAll('button, input, textarea, select').forEach(target => {
    if (busy && target.dataset.action === 'pause-transfer') return;
    if (busy) { if (target.dataset.preBusy === undefined) target.dataset.preBusy = String(target.disabled); target.disabled = true; }
    else if (target.dataset.preBusy !== undefined) { target.disabled = target.dataset.preBusy === 'true'; delete target.dataset.preBusy; }
  });
}
async function run(task, success, target = snapshot(), onError) {
  if (busyToken || !same(target)) return;
  const token = Symbol(); setBusy(token, true);
  try { const result = await task(); if (same(target)) await success?.(result); }
  catch (error) {
    if (same(target)) { if (onError) await onError(error); else showError(error); }
  } finally { setBusy(token, false); }
}
async function refresh(target = snapshot(), render = true) {
  if (state.owner === 'loading' || !same(target)) return;
  const generation = ++refreshGeneration;
  const current = () => same(target) && generation === refreshGeneration;
  state.loading = true; state.failure = ''; state.connection = 'checking'; if (render) renderApp();
  try {
    let records = [];
    if (target.owner === 'guest') records = await allGuest();
    else {
      let cursor = ''; let pages = 0;
      do { const result = await gateway.api(target.owner, 'list', cursor ? { cursor } : {}); records.push(...result.items); cursor = result.nextCursor; if (!current()) return; } while (cursor && ++pages < 26);
    }
    if (!current()) return;
    let guestCount = 0;
    if (target.owner !== 'guest') { try { guestCount = (await allGuest()).filter(row => row.state !== 'trash').length; } catch {} }
    if (!current()) return;
    state.records = records; state.guestCount = guestCount; state.deleting = false; state.connection = 'ready'; lastRefresh = Date.now();
  } catch (error) {
    if (!current()) return;
    state.failure = gateway.errorMessage(error); state.connection = 'failed';
    if (target.owner !== 'guest' && String(error.code).includes('failed-precondition')) {
      state.deleting = true;
    }
    state.records = [];
  } finally { if (current()) { state.loading = false; if (render) renderApp(); } }
}
function counts() { const live = state.records.filter(row => row.state !== 'trash'); return { all: live.length, inbox: live.filter(row => row.state === 'inbox').length, visited: live.filter(row => row.visited && row.state === 'saved').length, trash: state.records.length - live.length }; }
function visibleRecords() {
  const query = state.query.toLocaleLowerCase('ko');
  return state.records.filter(row => {
    if (state.tab === 'trash' ? row.state !== 'trash' : row.state === 'trash') return false;
    if (state.tab === 'inbox' && row.state !== 'inbox') return false;
    if (state.tab === 'visited' && (!row.visited || row.state !== 'saved')) return false;
    if (state.category !== 'all' && row.category !== state.category) return false;
    return [row.name, row.address, row.memo, row.menu, row.sourceUrl].join(' ').toLocaleLowerCase('ko').includes(query);
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}
function card(row) {
  return `<article class="place-card ${row.state === 'inbox' ? 'is-inbox' : ''}" data-record="${e(row.id)}">
    <div class="card-top"><span class="category-symbol ${e(row.category)}" aria-hidden="true">${glyph[row.category] ?? '◇'}</span><span class="category-label">${e(CATEGORIES[row.category] ?? '기타')}</span><span class="card-date">${e(date(row.createdAt))}</span></div>
    <h3>${e(row.name || '장소 확인이 필요한 링크')}</h3><p class="address">${e(row.address || '이름과 주소를 추가해 두면 다시 찾기 쉬워요.')}</p>
    ${row.memo ? `<p class="memo">${e(row.memo)}</p>` : '<p class="memo empty-memo">가고 싶은 이유를 한 줄 남겨 보세요.</p>'}
    ${row.menu ? `<p class="menu-note"><span>기억할 메뉴</span> ${e(row.menu)}</p>` : ''}
    <div class="card-bottom"><span class="record-state ${row.visited ? 'is-visited' : ''}">${row.state === 'trash' ? '휴지통' : row.state === 'inbox' ? '장소 확인 전' : row.visited ? '✓ 다녀온 곳' : '가고 싶은 곳'}</span>${button('open-record', row.state === 'trash' ? '기록 보기 ↗' : row.state === 'inbox' ? '장소 확인 →' : '자세히 →', 'text-button', `data-id="${e(row.id)}"`)}</div>
  </article>`;
}
function renderCards() {
  const target = document.querySelector('#record-grid'); if (!target) return;
  const records = visibleRecords();
  target.innerHTML = state.loading ? '<div class="empty-state"><span class="empty-symbol">◌</span><h3>기록을 불러오고 있어요</h3></div>'
    : state.failure ? `<div class="empty-state"><span class="empty-symbol">↻</span><h3>기록을 불러오지 못했어요</h3><p>${e(state.failure)}</p>${button('refresh', '다시 불러오기', 'button primary')}</div>`
    : records.length ? records.slice(0, state.displayLimit).map(card).join('') + (records.length > state.displayLimit ? `<div class="more-records">${button('more-records', `50개 더 보기 · 남은 ${records.length - state.displayLimit}개`, 'button secondary')}</div>` : '')
    : `<div class="empty-state"><div class="empty-illustration" aria-hidden="true"><i></i><b>♡</b><span>✦</span></div><h3>${state.query || state.category !== 'all' ? '찾는 기록이 없어요' : state.tab === 'trash' ? '휴지통이 비어 있어요' : state.tab === 'visited' ? '다녀온 곳을 기록해 보세요' : state.tab === 'inbox' ? '확인할 링크가 없어요' : '다음에 갈 곳, 여기 담아 두세요'}</h3><p>${state.query || state.category !== 'all' ? '검색어나 분류를 바꿔 보세요.' : state.tab === 'trash' ? '삭제한 기록은 30일 동안 복원할 수 있어요.' : '링크와 함께 가고 싶은 이유를 남기면\n다음 약속을 고르기가 조금 더 쉬워져요.'}</p>${!['trash', 'visited'].includes(state.tab) ? button('new-record', '+ 첫 장소 담기', 'button primary') : ''}</div>`;
  const resultCount = document.querySelector('#result-count'); if (resultCount) resultCount.textContent = `${records.length}개`;
}
function renderApp() {
  const count = counts(); const account = state.owner !== 'guest' && state.owner !== 'loading';
  const labels = { all: ['나의 보관함', '가고 싶은 곳과 기억할 이유를 한곳에.'], inbox: ['확인할 링크', '먼저 담아 둔 링크에 장소 정보를 채워 주세요.'], visited: ['다녀온 곳', '함께한 순간도, 다시 가고 싶은 이유도.'], trash: ['휴지통', '30일이 지난 기록은 복원할 수 없어요. 다음 접속 때 정리합니다.'] };
  const navigation = Object.entries({ all: ['◇', '모든 장소'], inbox: ['↗', '확인할 링크'], visited: ['✓', '다녀온 곳'], trash: ['⌫', '휴지통'] }).map(([key, [icon, label]]) => `<button class="nav-item ${state.tab === key ? 'active' : ''}" data-action="tab" data-tab="${key}" ${state.tab === key ? 'aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${label}<small>${count[key]}</small></button>`).join('');
  app.innerHTML = `${gateway.localMode ? '<div class="environment-note">로컬 검증 환경 · 실제 이메일은 발송되지 않습니다.</div>' : ''}
    <div class="workspace"><aside class="sidebar"><a class="brand" href="/"><img src="/icon.svg" alt="" width="32" height="32"><strong>가자함<span>가고 싶은 곳을 담아요</span></strong></a><div class="space-label">MY PLACES</div><div class="private-map"><span>◉</span><div><strong>나의 개인 보관함</strong><small>나만 볼 수 있어요</small></div><span class="lock-mark">♧</span></div><nav aria-label="기록 목록">${navigation}</nav><div class="sidebar-bottom">${button('settings', '⚙ 설정과 계정', 'nav-item')}<p>모아 둔 곳이<br>다음 약속이 될 때까지.</p><small>가자함 · PERSONAL PLACES</small></div></aside>
    <main><header class="topbar"><a class="mobile-brand" href="/">가자함<span>내가 담은 곳</span></a><div class="breadcrumb">나의 공간 <span>/</span> 개인 보관함</div><div class="account-pill" role="status"><span class="status-dot"></span>${account ? state.deleting ? '계정 삭제 진행 중' : state.connection === 'ready' ? '계정에 보관 중' : state.connection === 'checking' ? '계정 연결 확인 중' : '로그인됨 · 연결 확인 필요' : '이 브라우저에 보관 중'} ${button('settings', account ? '계정' : '로그인', 'pill-button')}</div></header>
    <section class="content"><div class="section-heading"><div><span class="eyebrow">MY OWN LITTLE MAP</span><h1>${labels[state.tab][0]}<span class="heading-dot">.</span></h1><p>${labels[state.tab][1]}</p></div>${button('new-record', '<span aria-hidden="true">＋</span> 장소 담기', 'button primary add-button', state.deleting || state.owner === 'loading' ? 'disabled' : '')}</div>
    ${!account && !state.loading ? `<div class="guest-notice"><span aria-hidden="true">♧</span><p>지금은 이 브라우저에만 저장돼요. 시크릿·인앱 브라우저 이용 종료나 사이트 데이터 삭제로 기록을 잃을 수 있어요.<br><strong>로그인 후 계정에 담기를 선택하면 다른 기기에서도 볼 수 있어요.</strong></p>${gateway.available ? button('login', '로그인하기 →', 'text-button') : '<span class="notice-small">계정 이용 준비 중</span>'}</div>` : ''}
    ${account && state.guestCount ? `<div class="guest-notice"><p>이 브라우저에 계정에 담지 않은 기록 ${state.guestCount}개가 있어요.</p>${button('transfer', '계정에 담기 →', 'text-button')}</div>` : ''}
    ${state.deleting || pendingDeletion ? `<div class="deletion-notice"><strong>계정 삭제 요청을 확인해 주세요.</strong><p>처리 결과 확인 정보가 이 탭에 남아 있어요.</p>${pendingDeletion ? button('check-deletion', '처리 결과 확인', 'button secondary') : '<p>요청한 탭에서 확인하거나 문의 창구를 이용해 주세요.</p>'}</div>` : ''}
    <div class="toolbar"><label class="search-box"><span aria-hidden="true">⌕</span><input type="search" id="search" placeholder="장소, 주소, 메모에서 찾아보세요" aria-label="기록 검색" value="${e(state.query)}" maxlength="200"></label>${button('refresh', '↻', 'refresh-button', 'aria-label="최신 기록 불러오기"')}</div>
    <div class="category-row" role="group" aria-label="장소 분류">${[['all', '전체'], ...Object.entries(CATEGORIES)].map(([value, label]) => `<button class="filter ${state.category === value ? 'selected' : ''}" data-action="category" data-category="${value}" aria-pressed="${state.category === value}">${label}</button>`).join('')}</div>
    <div class="list-heading"><strong>${state.tab === 'all' ? '차곡차곡 모은 곳' : labels[state.tab][0]} <span id="result-count"></span></strong><span>최근 수정순</span></div><div id="record-grid" class="record-grid"></div><footer class="content-footer">기억하고 싶은 곳에, 나만의 이유를 더해요.<span>모든 개인 기록은 나만 볼 수 있어요.</span></footer></section></main>
    <nav class="mobile-nav" aria-label="모바일 기록 메뉴">${[['all', '◇', '보관함'], ['inbox', '↗', '확인할 링크'], ['visited', '✓', '다녀온 곳']].map(([value, icon, label]) => `<button class="${state.tab === value ? 'active' : ''}" data-action="tab" data-tab="${value}"><span>${icon}</span>${label}</button>`).join('')}${button('settings', '<span>⚙</span>설정', '')}</nav></div>`;
  renderCards(); if (busyToken) setBusy(busyToken, true);
}
function recordDialog(row = null, duplicateDraft = null) {
  const current = snapshot();
  const opened = openDialog(row ? row.state === 'trash' ? '휴지통의 기록' : '담아 둔 장소' : '가고 싶은 곳 담기', `<form data-form="record" data-id="${e(row?.id ?? '')}" data-revision="${row?.revision ?? 0}" data-request="${crypto.randomUUID()}">
    <p class="form-intro">${row?.state === 'trash' ? '휴지통에 담은 지 30일 이내에 복원할 수 있어요.' : '링크만 먼저 담아도 좋아요. 이름과 주소를 적으면 장소로 확정돼요.'}</p>
    <label>원본 링크<input name="sourceUrl" type="url" maxlength="2048" placeholder="https://www.instagram.com/…" value="${e(row?.sourceUrl)}" ${row ? 'readonly' : ''}></label>
    <div class="form-columns"><label>장소 이름<input name="name" maxlength="120" placeholder="어디에 가고 싶나요?" value="${e(row?.name)}" ${row?.state === 'trash' ? 'readonly' : ''}></label><label>분류<select name="category" ${row?.state === 'trash' ? 'disabled' : ''}>${categoryOptions(row?.category ?? 'other')}</select></label></div>
    <label>주소<input name="address" maxlength="300" placeholder="지점을 구분할 수 있는 주소를 적어 주세요" value="${e(row?.address)}" ${row?.state === 'trash' ? 'readonly' : ''}></label>
    <label>가고 싶은 이유<textarea name="memo" rows="3" maxlength="2000" placeholder="무엇이 마음에 들었나요?" ${row?.state === 'trash' ? 'readonly' : ''}>${e(row?.memo)}</textarea></label>
    <label>기억할 메뉴·할 일<input name="menu" maxlength="500" placeholder="먹고 싶은 메뉴, 해 보고 싶은 것" value="${e(row?.menu)}" ${row?.state === 'trash' ? 'readonly' : ''}></label>
    <label class="check-label"><input type="checkbox" name="visited" ${row?.visited ? 'checked' : ''} ${row?.state === 'trash' ? 'disabled' : ''}>다녀온 곳으로 표시</label>
    ${row?.sourceUrl ? `<a class="external-link" href="${e(normalizeUrl(row.sourceUrl).sourceUrl)}" target="_blank" rel="noopener noreferrer">원본 링크 열기 ↗</a>` : ''}
    ${row?.address ? `<a class="external-link" href="https://map.kakao.com/link/search/${encodeURIComponent([row.name, row.address].join(' '))}" target="_blank" rel="noopener noreferrer">외부 지도에서 주소 검색 ↗</a>` : ''}
    <div class="sheet-actions">${row?.state === 'trash' ? button('restore-record', '기록 복원', 'button primary', `data-id="${e(row.id)}"`) + button('remove-record', '영구 삭제', 'button danger', `data-id="${e(row.id)}"`) : '<button class="button primary" type="submit">' + (row ? '변경 저장' : '내 보관함에 담기') + '</button>' + (row ? button('trash-record', '휴지통으로', 'button danger', `data-id="${e(row.id)}"`) : '')}</div>
    <p class="form-footnote">${current.owner === 'guest' ? '이 브라우저에만 저장돼요. 사이트 데이터를 지우면 사라질 수 있어요. 로그인 후 계정에 담기를 선택해야 다른 기기에서 볼 수 있어요.' : '서버 저장이 확인되면 같은 계정의 다른 기기에서도 볼 수 있어요.'}</p><div class="duplicate-notice" hidden></div><div class="conflict-panel" hidden></div></form>`, 'record', Boolean(duplicateDraft));
  if (!opened) return;
  const form = opened.querySelector('form'); form.dataset.initial = JSON.stringify(recordValues(form));
  if (duplicateDraft) {
    opened.duplicateDraft = duplicateDraft; opened.duplicateDraftPending = true;
    const slot = opened.querySelector('.duplicate-notice'); slot.hidden = false;
    slot.innerHTML = `<h3>방금 입력한 메모와 비교해 주세요</h3><p>기존 메모</p><pre>${e(row.memo || '메모 없음')}</pre><p>방금 입력한 메모</p><pre>${e(duplicateDraft.memo || '메모 없음')}</pre>${row.state === 'trash' ? '<p>기록을 먼저 명시적으로 복원하면 메모를 반영할 수 있어요.</p>' : button('use-duplicate-memo', '방금 입력한 메모 사용', 'button secondary')}${button('discard-duplicate-draft', '방금 입력한 메모 버리기', 'button secondary')}<p>내용을 확인한 뒤 변경 저장을 눌러야 반영돼요.</p>`;
  }
}

function updateCooldowns() {
  if (!dialog) return;
  for (const target of dialog.querySelectorAll('[data-mail-kind]')) {
    const until = gateway.mailRetryAt(target.dataset.mailKind, target.dataset.mailKind === 'verification' ? state.owner : '');
    const seconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    target.textContent = seconds ? `${target.dataset.mailLabel} · ${seconds}초 뒤` : target.dataset.mailLabel;
    if (busyToken && target.dataset.preBusy !== undefined) target.dataset.preBusy = String(seconds > 0);
    else target.disabled = seconds > 0;
  }
  const resume = dialog.querySelector('[data-action="confirm-transfer"]');
  if (transferSession && resume && !busyToken) {
    const seconds = Math.max(0, Math.ceil(((transferSession.retryAt ?? 0) - Date.now()) / 1000));
    resume.disabled = seconds > 0 || transferSession.blocked;
    if (seconds) resume.textContent = `남은 기록 다시 담기 · ${seconds}초 뒤`;
    else if (transferSession.paused) resume.textContent = '남은 기록 다시 담기';
  }
}
setInterval(updateCooldowns, 1000);
function loginDialog(kind = 'login') {
  if (!gateway.available) { toast('계정 이용을 준비하고 있어요. 지금은 이 브라우저에 보관할 수 있어요.'); return; }
  const reset = kind === 'reset'; const signup = kind === 'signup';
  openDialog(reset ? '비밀번호 재설정' : signup ? '가자함 시작하기' : '다시 만나서 반가워요', `<p class="form-intro">${reset ? '가입에 사용한 이메일을 입력해 주세요.' : '로그인하면 모아 둔 기록을 어디서든 이어서 볼 수 있어요.'}</p><form data-form="auth" data-kind="${kind}"><label>이메일<input name="email" type="email" required maxlength="254" autocomplete="email" placeholder="이메일 주소"></label>${reset ? '' : `<label>비밀번호<input name="password" type="password" required ${signup ? 'minlength="12"' : ''} maxlength="128" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="${signup ? '영문 소문자·숫자를 포함한 12~128자' : '비밀번호'}"></label>`}<button class="button primary full-width" type="submit" ${reset ? 'data-mail-kind="reset" data-mail-label="재설정 메일 요청"' : ''}>${reset ? '재설정 메일 요청' : signup ? '이메일로 시작하기' : '로그인'}</button></form><div class="auth-links">${button(signup ? 'login' : 'signup', signup ? '이미 계정이 있어요' : '처음이신가요? 가입하기', 'text-button')}${!reset ? button('reset', '비밀번호를 잊었어요', 'text-button') : button('login', '로그인으로 돌아가기', 'text-button')}</div><p class="form-footnote">개인 기록은 나만 볼 수 있어요. 가입 전에 ${button('privacy', '저장과 개인정보 안내', 'inline-button')}를 확인해 주세요.</p>`, 'auth');
  updateCooldowns();
}
function settingsDialog(force = false) {
  const account = state.owner !== 'guest' && state.owner !== 'loading';
  openDialog('설정과 계정', `<div class="account-summary"><span class="avatar">${account ? '◉' : '◇'}</span><div><strong>${account ? '나의 계정' : '로그인 없이 이용 중'}</strong><p>${e(account ? state.user?.email ?? '' : '이 브라우저에만 기록이 남아요.')}</p></div></div>${account ? `<p class="settings-copy">개인 기록은 계정에 저장돼요. 같은 계정으로 다른 기기에서도 볼 수 있어요.</p>${!state.user?.emailVerified ? `<div class="verification-box"><p>이메일 확인을 마쳐 주세요.</p>${button('send-verification', '확인 메일 보내기', 'text-button', 'data-mail-kind="verification" data-mail-label="확인 메일 보내기"')}${button('refresh-verification', '확인했어요', 'text-button')}</div>` : '<p class="verified">✓ 이메일 확인 완료</p>'}${state.guestCount ? button('transfer', `브라우저 기록 ${state.guestCount}개 계정에 담기`, 'button secondary full-width') : ''}${button('logout', '로그아웃', 'button secondary full-width')}${button('delete-account', '계정 탈퇴', 'button danger full-width')}` : `<p class="settings-copy">로그인하면 다른 기기에서도 기록을 이어서 볼 수 있어요. 이미 담은 브라우저 기록은 선택해서 계정에 옮길 수 있어요.</p>${button('login', gateway.available ? '로그인 / 가입' : '계정 이용 준비 중', 'button primary full-width', gateway.available ? '' : 'disabled')}`}
    <hr>${button('trash-tab', '휴지통 보기', 'settings-link')}${button('privacy', '저장과 개인정보 안내', 'settings-link')}<p class="form-footnote">현재는 개인 보관함을 제공해요. 링크의 장소는 직접 확인해 주세요.</p>`, 'settings', force);
  updateCooldowns();
}
function privacyDialog() {
  openDialog('저장과 개인정보 안내', `<div class="privacy-copy">${privacyContent(gateway.publicConfig)}<p><a class="external-link" href="/privacy/" target="_blank" rel="noopener noreferrer">별도 페이지에서 개인정보와 탈퇴 안내 보기</a></p></div>`, 'privacy');
}
async function transfer() {
  const target = snapshot(); if (target.owner === 'guest') return;
  const opened = openDialog('브라우저 기록을 계정에 담을까요?', `<p class="form-intro">현재 브라우저의 휴지통을 제외한 기록을 <strong>${e(state.user?.email)}</strong> 계정으로 보냅니다. 서버 저장을 확인한 기록만 브라우저에서 정리해요. 중복과 실패한 기록은 그대로 남아요.</p><p id="transfer-status" role="status"></p><div class="sheet-actions">${button('confirm-transfer', '이 계정에 담기', 'button primary')}${button('pause-transfer', '현재 항목 처리 후 중단', 'button secondary', 'hidden')}</div>`, 'transfer');
  if (opened) transferSession = { target, opened, duplicates: new Set(), stopping: false, paused: false, retryAt: 0 };
}
async function startTransfer() {
  const session = transferSession;
  if (!session || busyToken || !same(session.target) || session.retryAt > Date.now()) return;
  const current = () => same(session.target) && dialog === session.opened && transferSession === session;
  session.stopping = false; session.paused = false;
  const stop = dialog.querySelector('[data-action="pause-transfer"]'); stop.hidden = false; stop.disabled = false;
  const status = dialog.querySelector('#transfer-status');
  await run(async () => transferRows({
    rows: (await allGuest()).filter(row => row.state !== 'trash'), uid: session.target.owner, confirmedDuplicates: session.duplicates,
    current, stopping: () => session.stopping, requestId: guestTransferId,
    create: async (uid, payload) => { const result = await gateway.api(uid, 'create', payload); if (current() && result.record) { refreshGeneration++; state.records = state.records.filter(row => row.id !== result.record.id).concat(result.record); } return result; }, remove: removeTransferredGuest, rearm: rearmGuestTransfer,
    progress: result => { if (current()) status.textContent = `${result.moved}개 저장 확인 · ${result.duplicates}개 중복 · ${result.failed}개 실패 · ${result.attempted}/${result.total}개 처리`; }
  }), async result => {
    if (!current()) return;
    stop.hidden = true;
    if (result.paused) {
      session.paused = true;
      session.blocked = result.error?.reason === 'operation-limit';
      session.retryAt = result.error?.reason === 'rate-limited' ? result.error.retryAt || Date.now() + 60000 : 0;
      status.textContent += ' · 멈췄어요. 중복과 실패, 아직 보내지 않은 기록은 이 브라우저에 남아 있어요.';
      if (result.error) showError(result.error);
      if (!result.error) await refresh(session.target, false);
      else {
        // A failed transfer must stop network work, including an extra list
        // request that could otherwise spend another full fetch timeout.
        try { const count = (await allGuest()).filter(row => row.state !== 'trash').length; if (current()) state.guestCount = count; } catch { /* Keep the guest original and existing count. */ }
        if (current()) { state.loading = false; state.connection = result.error.code === 'resource-exhausted' ? 'ready' : 'failed'; }
      }
      if (current()) renderApp();
      return;
    }
    closeDialog(true); toast(`${result.moved}개를 계정에 담았어요. ${result.duplicates}개 중복, ${result.failed}개 실패는 브라우저에 남겼어요.${result.canRetry ? ' 삭제된 대상의 기록은 계정에 담기를 다시 확인해 새로 저장할 수 있어요.' : ''}`);
    await refresh(session.target);
  }, session.target);
  if (current()) { stop.hidden = true; updateCooldowns(); }
}
const mergeFields = { name: '장소 이름', address: '주소', category: '분류', memo: '가고 싶은 이유', menu: '기억할 메뉴·할 일', visited: '방문 상태' };
async function showConflict(form, input, target) {
  const opened = dialog;
  await refresh(target, false);
  if (!same(target) || dialog !== opened || !form.isConnected) return;
  const latest = state.records.find(row => row.id === form.dataset.id);
  if (!latest || latest.state === 'trash' || state.failure) { showError({ code: state.failure ? 'unavailable' : 'not-found' }); return; }
  form.conflictLatest = latest;
  const slot = form.querySelector('.conflict-panel'); slot.hidden = false;
  slot.innerHTML = `<h3 tabindex="-1">내 입력과 최신 기록 비교</h3><p>각 항목에서 내 입력을 적용할지 선택해 주세요. 선택하지 않은 항목은 최신 기록을 유지해요.</p>${Object.entries(mergeFields).map(([key, label]) => `<div class="conflict-field"><h4>${e(label)}</h4><p>최신 기록</p><pre>${e(key === 'visited' ? latest[key] ? '다녀옴' : '미방문' : key === 'category' ? CATEGORIES[latest[key]] : latest[key] || '내용 없음')}</pre><p>내 입력</p><pre>${e(key === 'visited' ? input[key] ? '다녀옴' : '미방문' : key === 'category' ? CATEGORIES[input[key]] : input[key] || '내용 없음')}</pre><label class="check-label"><input type="checkbox" name="merge-${key}">${e(label)}에 내 입력 적용</label></div>`).join('')}<div class="sheet-actions">${button('resolve-conflict', '선택한 내용으로 다시 저장', 'button primary')}</div>`;
  showError({ code: 'aborted' }); slot.querySelector('h3').focus();
}
async function submitRecord(form) {
  const target = snapshot(); if (dialog?.dataset.epoch !== String(target.epoch)) return;
  const values = new FormData(form); let record;
  try { record = normalizeInput({ sourceUrl: values.get('sourceUrl'), name: values.get('name'), address: values.get('address'), category: values.get('category'), memo: values.get('memo'), menu: values.get('menu'), visited: values.has('visited') }); }
  catch { showError({ code: 'invalid-argument' }); return; }
  const requestId = form.dataset.request; const recordId = form.dataset.id;
  const payload = recordId ? { id: recordId, revision: Number(form.dataset.revision), requestId, record } : { requestId, record };
  await run(() => target.owner === 'guest' ? recordId ? mutateGuest('update', payload) : createGuest(record, requestId) : gateway.api(target.owner, recordId ? 'update' : 'create', payload), async result => {
    if (result?.duplicate) {
      const opened = dialog; await refresh(target, false);
      if (!same(target) || opened !== dialog) return;
      opened.duplicateDraft = record; opened.duplicateDraftPending = true;
      const slot = form.querySelector('.duplicate-notice'); slot.hidden = false; slot.setAttribute('role', 'status');
      const row = state.records.find(row => row.id === result.id);
      slot.innerHTML = `<p>이미 담아 둔 링크예요.${row?.state === 'trash' ? ' 기존 기록이 휴지통에 있어요.' : ''} 방금 입력한 내용은 자동 반영하지 않았어요.</p>${row ? button('view-duplicate', '기존 기록 보기', 'button secondary', `data-id="${e(result.id)}"`) : '<p>대상을 찾지 못했어요. 삭제되었거나 조회에 실패했을 수 있으니 새로 불러와 확인해 주세요.</p>'}`;
      slot.scrollIntoView({ block: 'nearest' }); return;
    }
    closeDialog(true); toast(target.owner === 'guest' ? '이 브라우저에 담았어요. 사이트 데이터를 지우면 사라질 수 있어요. 로그인 후 계정에 담기를 선택해 옮겨 주세요.' : '계정에 저장했어요.');
    if (target.owner === 'guest') await refresh(target);
    else { refreshGeneration++; state.loading = false; state.failure = ''; state.connection = 'ready'; state.records = state.records.filter(row => row.id !== result.record.id).concat(result.record); renderApp(); }
  }, target, error => error.code === 'aborted' && recordId ? showConflict(form, record, target) : showError(error));
}
async function submitAuth(form) {
  const values = new FormData(form); const kind = form.dataset.kind;
  if (kind === 'reset') {
    await run(() => gateway.resetPassword(String(values.get('email')).trim()), () => { closeDialog(true); toast('가입된 이메일이라면 재설정 안내를 받을 수 있어요.'); }); return;
  }
  const token = Symbol(); if (busyToken) return; setBusy(token, true);
  const openedDialog = dialog; const initialEpoch = epoch;
  try {
    const uid = await gateway.authenticate(kind, String(values.get('email')).trim(), String(values.get('password')));
    if (gateway.currentUser()?.uid !== uid || epoch > initialEpoch + 1) return;
    if (dialog === openedDialog) closeDialog(true);
    toast(kind === 'signup' ? '계정을 만들었어요. 이메일 확인을 마쳐 주세요.' : '계정에 로그인했어요.');
  }
  catch (error) { if (dialog === openedDialog) showError(error); }
  finally { form.querySelectorAll('input[type=password]').forEach(input => { input.value = ''; }); setBusy(token, false); }
}
async function checkDeletion(target = snapshot()) {
  const pending = pendingDeletion; if (!pending) return;
  const result = await gateway.deletionStatus(pending.receipt);
  if (!same(target) || pendingDeletion !== pending) return;
  if (result.state === 'deleted') {
    rememberDeletion(null);
    if (gateway.currentUser()?.uid === pending.uid) await gateway.logout();
    closeDialog(true); renderApp(); toast('계정과 서버 기록을 삭제했어요.');
  } else toast(result.state === 'unknown' ? '접수 상태를 확인할 수 없어요. 요청한 계정과 연결 상태를 확인해 주세요.' : '삭제를 처리 중이에요. 잠시 뒤 결과를 다시 확인해 주세요.');
}
document.addEventListener('submit', event => {
  const form = event.target.closest('form[data-form]'); if (!form) return; event.preventDefault();
  if (form.dataset.form === 'record') void submitRecord(form);
  if (form.dataset.form === 'auth') void submitAuth(form);
  if (form.dataset.form === 'delete') {
    const target = snapshot(); const password = form.elements.password.value;
    const receipt = form.dataset.receipt ||= pendingDeletion?.uid === target.owner ? pendingDeletion.receipt : Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
    void run(async () => { await gateway.reauthenticate(target.owner, password); form.elements.password.value = ''; if (!same(target)) throw Object.assign(new Error(), { code: 'session-changed' }); rememberDeletion({ uid: target.owner, receipt }); return gateway.api(target.owner, 'startDeletion', { receipt }); }, async result => {
      if (result.state === 'deleted') { rememberDeletion(null); closeDialog(true); await gateway.logout(); toast('계정과 서버 기록을 삭제했어요.'); return; }
      closeDialog(true); state.deleting = true; state.records = []; renderApp(); toast('삭제 요청을 접수했어요. 서버 처리 결과를 확인하고 있어요.');
      for (let attempts = 0; attempts < 25 && same(target); attempts++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (!same(target)) break;
        try { const result = await gateway.deletionStatus(receipt); if (!same(target)) break; if (result.state === 'deleted') { rememberDeletion(null); await gateway.logout(); toast('계정과 서버 기록을 삭제했어요.'); break; } } catch { toast('처리 결과를 확인하지 못했어요. 다시 확인해 주세요.'); break; }
      }
    }, target).finally(() => { form.elements.password.value = ''; });
  }
});
document.addEventListener('input', event => { if (event.target.id === 'search') { state.query = event.target.value; state.displayLimit = 50; renderCards(); } if (event.target.matches('input,textarea,select')) event.target.removeAttribute('aria-invalid'); });
window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]'); if (!target || target.disabled) return;
  const action = target.dataset.action; const current = snapshot();
  if (action === 'close-dialog') { closeDialog(); return; }
  if (action === 'new-record') { recordDialog(); return; }
  if (action === 'open-record') { const row = state.records.find(row => row.id === target.dataset.id); if (row) recordDialog(row); return; }
  if (action === 'tab') { state.tab = target.dataset.tab; state.query = ''; state.category = 'all'; state.displayLimit = 50; renderApp(); return; }
  if (action === 'category') { state.category = target.dataset.category; state.displayLimit = 50; renderApp(); return; }
  if (action === 'more-records') { state.displayLimit += 50; renderCards(); return; }
  if (action === 'refresh') { if (!busyToken) void refresh(); return; }
  if (action === 'settings') { settingsDialog(); return; }
  if (['login', 'signup', 'reset'].includes(action)) { loginDialog(action); return; }
  if (action === 'privacy') { privacyDialog(); return; }
  if (action === 'trash-tab') { if (!closeDialog()) return; state.tab = 'trash'; state.displayLimit = 50; renderApp(); return; }
  if (action === 'logout') { void run(gateway.logout, () => closeDialog(true)); return; }
  if (action === 'send-verification') { void run(() => gateway.verifyEmail(current.owner), () => { updateCooldowns(); toast('확인 메일을 요청했어요. 잠시 뒤 메일함을 확인해 주세요.'); }); return; }
  if (action === 'refresh-verification') { void run(() => gateway.refreshUser(current.owner), () => { settingsDialog(true); toast(state.user?.emailVerified ? '이메일 확인을 마쳤어요.' : '아직 이메일 확인 전이에요. 메일의 안내를 따라 주세요.'); }); return; }
  if (action === 'transfer') { void transfer(); return; }
  if (action === 'confirm-transfer') { void startTransfer(); return; }
  if (action === 'pause-transfer') { if (transferSession) { transferSession.stopping = true; target.disabled = true; dialog.querySelector('#transfer-status').textContent += ' · 현재 항목 처리 후 멈추고 있어요.'; } return; }
  if (action === 'view-duplicate') { const draft = dialog.duplicateDraft; void run(async () => { await refresh(current, false); return state.records.find(row => row.id === target.dataset.id); }, row => { if (row) recordDialog(row, draft); else showError({ code: 'not-found' }); }, current); return; }
  if (action === 'use-duplicate-memo') { const field = dialog.querySelector('[name="memo"]'); field.value = dialog.duplicateDraft.memo; dialog.duplicateDraftPending = false; field.focus(); return; }
  if (action === 'discard-duplicate-draft') { const form = dialog.querySelector('form[data-form="record"]'); form.elements.memo.value = JSON.parse(form.dataset.initial).memo; dialog.duplicateDraft = null; dialog.duplicateDraftPending = false; dialog.querySelector('.duplicate-notice').hidden = true; form.elements.memo.focus(); return; }
  if (action === 'resolve-conflict') {
    const form = dialog.querySelector('form[data-form="record"]'); const latest = form.conflictLatest; if (!latest || busyToken) return;
    for (const key of Object.keys(mergeFields)) if (!form.elements[`merge-${key}`]?.checked) { if (key === 'visited') form.elements[key].checked = latest[key]; else form.elements[key].value = latest[key]; }
    form.dataset.revision = String(latest.revision); form.dataset.request = crypto.randomUUID();
    form.querySelector('.conflict-panel').hidden = true; void submitRecord(form); return;
  }
  if (action === 'delete-account') { openDialog('계정과 기록을 삭제할까요?', '<p class="form-intro">계정의 모든 개인 기록을 서버에서 지운 뒤 인증 계정을 삭제해요. 복구할 수 없습니다. 이 브라우저의 게스트 기록은 유지돼요.</p><form data-form="delete"><label>현재 비밀번호<input type="password" name="password" required maxlength="128" autocomplete="current-password"></label><button class="button danger full-width" type="submit">계정과 서버 기록 삭제</button></form>', 'delete'); return; }
  if (action === 'check-deletion') { void run(() => checkDeletion(current)); return; }
  if (['trash-record', 'restore-record', 'remove-record'].includes(action)) {
    const row = state.records.find(row => row.id === target.dataset.id); if (!row) return;
    if (action === 'remove-record' && !window.confirm(`${dirty() ? '저장하지 않은 입력도 버려집니다. ' : ''}이 기록을 영구 삭제할까요? 복구할 수 없습니다.`)) return;
    if (action === 'trash-record' && dirty() && !window.confirm('저장하지 않은 입력은 반영하지 않고 이 기록을 휴지통으로 옮길까요?')) return;
    const command = { 'trash-record': 'trash', 'restore-record': 'restore', 'remove-record': 'remove' }[action];
    const payload = { id: row.id, revision: row.revision, requestId: crypto.randomUUID() };
    const duplicateDraft = dialog?.duplicateDraft;
    void run(() => current.owner === 'guest' ? mutateGuest(command, payload) : gateway.api(current.owner, command, payload), async result => {
      if (command === 'restore' && duplicateDraft) {
        // Use the committed acknowledgement; a later list failure must never
        // destroy an input that has not yet been saved to the restored record.
        if (!result?.record || result.record.id !== row.id) { showError({ code: 'unavailable' }); return; }
        refreshGeneration++; state.loading = false; state.failure = ''; state.connection = 'ready'; state.records = state.records.filter(record => record.id !== row.id).concat(result.record);
        renderApp(); recordDialog(result.record, duplicateDraft); toast('기록을 복원했어요. 방금 입력한 메모를 확인한 뒤 저장해 주세요.'); return;
      }
      closeDialog(true); toast(command === 'trash' ? '휴지통으로 옮겼어요.' : command === 'restore' ? '기록을 복원했어요.' : '기록을 영구 삭제했어요.'); await refresh(current);
    });
  }
});
window.addEventListener('focus', () => { if (!dialog && !busyToken && state.owner !== 'loading' && Date.now() - lastRefresh > 15000) void refresh(); });
window.addEventListener('online', () => { if (!dialog && !busyToken) void refresh(); });
window.addEventListener('offline', () => { if (state.owner !== 'guest') { state.connection = 'failed'; renderApp(); } });
window.addEventListener('storage', event => { if (event.key === 'gajaham-guest-updated' && state.owner === 'guest' && !dialog && !busyToken) void refresh(); });

if (!gateway.localMode && gateway.canonicalOrigin && location.origin !== gateway.canonicalOrigin) {
  app.innerHTML = `<main class="origin-screen"><img src="/icon.svg" alt="가자함" width="56"><h1>가자함 정식 주소에서 이어가세요</h1><p>한곳에서 기록을 안전하게 관리할 수 있도록 정식 주소로 접속해 주세요.</p><a class="button primary" href="${e(gateway.canonicalOrigin)}">가자함 열기 →</a></main>`;
} else {
  renderApp(); gateway.observe(user => {
    const owner = user?.uid ?? 'guest'; state.user = user;
    if (owner === state.owner) return;
    epoch++; state.owner = owner; state.records = []; state.guestCount = 0; state.deleting = false; state.failure = ''; state.query = ''; state.tab = 'all'; state.category = 'all'; state.displayLimit = 50; state.connection = 'checking';
    busyToken = null; document.documentElement.classList.remove('busy'); closeDialog(true); void refresh(snapshot());
  });
}
