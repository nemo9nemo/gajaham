import { html } from '../../html.js';
import { visibleMaps } from '../../logic/maps.js';
import { findJob, parseIntakeUrl, webIntakeTarget } from '../../logic/intake.js';
import { findAccessiblePlace } from '../../logic/place-edit.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { mapLabel, mapAudience, targetOptions, missingItem, compactPlace, stageChip } from '../../components/complete-shared.js';
import { flowPage } from '../start/layout.js';

export function linkNewScreen(state) {
  const maps = visibleMaps(state);
  const draft = state.intake.draft;
  const selected = webIntakeTarget(state);
  const shared = maps.some((map) => map.type === 'shared');
  const body = '<form id="link-form" class="stack" data-action="link-submit"><label for="intake-url">게시물·릴스 링크</label>' +
    html`<input id="intake-url" type="text" inputmode="url" autocomplete="off" data-action="link-url" value="${draft.url}" placeholder="게시물·릴스 링크를 붙여 넣어 주세요">` +
    (shared ? '<h2 class="section-label">어디에 저장할까요?</h2>' + targetOptions(state, selected, 'link-target')
      : '<h2 class="section-label">저장할 맵</h2><section class="card">' + mapLabel(state, selected) + '<p class="caption">함께 쓰기 연결 전에는 개인 맵에 저장돼요</p></section>') +
    '<section class="soft"><h2 class="section-label">누구에게 보이나요</h2>' + html`<p>${mapAudience(state, selected === 'both' ? maps.find((map) => map.type === 'shared')?.id : selected)}</p></section>` +
    '<p class="caption">여기서 고른 맵은 이번 등록에만 적용돼요. DM 기본 저장 위치는 설정에서 따로 바꿔요.</p><p class="caption">지금 분석할 수 있는 출처: 인스타그램 게시물·릴스</p>' +
    (state.ui.notice ? html`<p role="status" class="notice warn">${state.ui.notice}</p>` : '') + '</form>';
  const footer = '<button type="submit" form="link-form" class="button primary"' + (!parseIntakeUrl(draft.url) ? ' disabled' : '') + '>등록 요청</button>';
  return flowPage(appBar('링크 등록', { back: '#/map' }), body, footer, 'complete-page');
}

export function linkReceiptScreen(state) {
  const job = findJob(state, state.ui.params?.id);
  if (!job) return missingItem();
  return flowPage(appBar('접수 안내'), '<span class="status-chip wait">접수됨 · 아직 저장 전</span><h1>링크를 접수했어요</h1>' +
    html`<section class="card"><span class="caption">링크</span><strong>${job.sourceUrl}</strong><h2 class="section-label">요청한 저장 대상</h2>` +
    job.targetMapIds.map((id) => '<div class="content-row">' + mapLabel(state, id) + '</div>').join('') + '</section>' +
    '<p>분석이 끝나면 처리함에서 맵별 결과를 확인할 수 있어요.</p><p class="caption">확인이 필요한 부분이 있으면 처리함에서 알려드려요.</p>',
    button('처리함에서 보기', { action: 'job-open', id: job.id }) + button('다른 링크 등록', { action: 'link-start', variant: 'secondary' }), 'complete-page');
}

export function linkResultScreen(state) {
  const job = findJob(state, state.ui.params?.id);
  if (!job) return missingItem();
  if (!job.results.length) return flowPage(appBar('등록 결과'), '<h1>아직 저장 전이에요</h1>', button('처리 항목 보기', { action: 'job-open', id: job.id }), 'complete-page');
  const saved = job.results.filter((result) => result.status === 'saved');
  const maps = visibleMaps(state).filter((map) => saved.some((result) => result.mapId === map.id));
  const duplicate = saved.length === job.results.length && saved.every((result) => result.outcome === 'unchanged');
  let body = stageChip(job.stage) + html`<h1>${duplicate ? '이미 저장된 링크' : job.stage === 'partial' ? '한쪽 맵에만 저장됐어요' : job.stage === 'saved' ? '선택한 맵에 저장했어요' : '저장하지 못했어요'}</h1>`;
  if (duplicate) body += '<p class="caption">새 카드를 만들지 않고 기존 카드로 이동해요.</p>';
  body += '<h2 class="section-label">요청한 대상</h2>' + job.requestedMapIds.map((id) => '<div class="content-row">' + mapLabel(state, id) + '</div>').join('');
  body += '<h2 class="section-label">실제 등록한 맵과 결과</h2>' + job.results.map((result) => {
    const place = result.status === 'saved' && findAccessiblePlace(state, result.placeId);
    return '<section class="card"><div class="content-row">' + mapLabel(state, result.mapId) + '</div>' +
      (place ? '<span class="status-chip ok">저장 완료</span>' + compactPlace(place, state) +
        (result.outcome === 'source-added' ? '<p class="caption">기존 장소에 출처만 추가했어요. 메모·직접 수정·방문 상태는 유지돼요.</p>' : '')
        : '<span class="status-chip error">' + (result.status === 'saved' ? '현재 접근할 수 없어요' : '저장 실패') + '</span><p class="caption">이 맵에는 새로 저장하지 않았어요.</p>') + '</section>';
  }).join('');
  if (job.results.some((result) => result.status === 'failed')) body += '<p class="caption">이미 저장된 맵은 다시 처리하지 않아요.</p>';
  return flowPage(appBar('등록 결과'), body,
    (job.results.some((result) => result.status === 'failed') ? button('실패한 맵에만 다시 저장', { action: 'job-process' }) : '') +
    maps.map((map) => button(`${map.name}에서 보기`, { action: 'show-intake-map', id: map.id, variant: 'secondary' })).join('') +
    button('처리함', { href: '#/inbox', variant: 'text' }), 'complete-page');
}

export function unsupportedLinkScreen(state) {
  const job = findJob(state, state.ui.params?.id);
  if (!job) return missingItem();
  return flowPage(appBar('링크 등록', { back: '#/links/new' }), '<h2 class="section-label">링크</h2>' + html`<section class="card">${job.sourceUrl}</section>` +
    '<span class="status-chip warn">분석 미지원 출처</span><h1>이 출처는 아직 장소 분석을 지원하지 않아요.</h1><p>링크를 보관하거나 장소를 직접 연결할 수 있어요.</p><section class="card"><h2>링크만 보관</h2><p>분석 없이 처리함에 원본 링크를 남겨요</p></section><section class="card"><h2>장소 직접 검색해 연결</h2><p>고른 맵에 장소 카드로 저장해요</p></section>',
    button('보관하기', { action: 'job-keep' }) + button('장소 직접 검색해 연결', { action: 'job-find-place', variant: 'secondary' }) +
    button('원본 링크 확인', { action: 'job-open', id: job.id, variant: 'text' }), 'complete-page');
}
