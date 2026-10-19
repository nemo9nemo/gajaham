import { html } from '../../html.js';
import { visibleMaps } from '../../logic/maps.js';
import { findJob, ownedJobs, jobTargetChoice } from '../../logic/intake.js';
import { findAccessiblePlace } from '../../logic/place-edit.js';
import { demoSearchOptions } from '../../logic/complete-actions.js';
import { branchCandidates } from '../../data/complete-demo.js';
import { appBar } from '../../components/app-bar.js';
import { button } from '../../components/button.js';
import { tabBar } from '../../components/tab-bar.js';
import { stageChip, mapLabel, targetOptions, missingItem, compactPlace } from '../../components/complete-shared.js';
import { flowPage } from '../start/layout.js';

const path = (id, suffix = '') => `#/inbox/${encodeURIComponent(id)}${suffix}`;
const getJob = (state) => findJob(state, state.ui.params?.id ?? state.ui.activeJobId);
const mapNames = (state, job) => job.targetMapIds.map((id) => '<div class="content-row">' + mapLabel(state, id) + '</div>').join('');
const sourceInfo = (job) => html`<section class="card"><h2 class="section-label">원본 링크</h2><strong>${job.originalUrl ?? job.sourceUrl}</strong><p class="caption">접수 ${job.receivedAt} · ${job.origin === 'dm' ? 'DM으로 받음' : '웹에서 등록'}</p></section>`;

export function inboxScreen(state) {
  const filter = state.ui.inboxFilter;
  const jobs = ownedJobs(state).filter((job) => !job.parentId).filter((job) => filter === '전체' || filter === '완료' ? filter === '전체' || ['saved', 'link-only'].includes(job.stage)
    : filter === '진행 중' ? ['waiting', 'processing'].includes(job.stage) : ['needs-confirmation', 'needs-place', 'failed', 'partial', 'unsupported'].includes(job.stage));
  const filters = '<nav class="chip-row" aria-label="처리 상태">' + ['전체', '진행 중', '확인 필요', '완료'].map((value) =>
    html`<button type="button" class="chip" data-action="inbox-filter" data-id="${value}" aria-pressed="${filter === value}">${value}</button>`).join('') + '</nav>';
  const body = filters + (jobs.length ? jobs.map((job) => '<article class="card">' + stageChip(job.stage) +
    html`<a class="job-title" href="${path(job.id)}">${job.sourceUrl}</a>` + mapNames(state, job) +
    (job.stage === 'waiting' ? '<p class="caption">본인 확인 후 처리돼요</p>' : job.unresolvedNames?.length ? html`<p class="caption">여러 장소 중 일부 저장 · ${job.unresolvedNames.length}곳 확인 필요</p>` : '') +
    button('처리 항목 보기', { action: 'job-open', id: job.id, variant: 'text' }) + '</article>').join('') : '<section class="soft"><h2>처리 항목이 없어요</h2><p class="caption">링크를 등록하면 이곳에서 진행 상태를 확인할 수 있어요.</p></section>') + button('링크 등록', { action: 'link-start', variant: 'secondary' });
  return flowPage(appBar('처리함'), body, '', 'complete-page with-tabs') + tabBar('처리함');
}

export function jobDetailScreen(state) {
  const job = getJob(state);
  if (!job) return missingItem();
  let body = stageChip(job.stage) + sourceInfo(job) + '<h2 class="section-label">저장 대상</h2>' + mapNames(state, job);
  let actions = '';
  if (job.stage === 'saved') {
    body += '<p class="caption">이미 저장 완료된 항목은 ‘다른 맵에 복제’로 넣어요.</p>';
    actions += button(job.childIds?.length ? '여러 장소 결과' : '맵별 저장 결과', { href: job.childIds?.length ? path(job.id, '/multiple') : `#/links/result/${job.id}` });
  } else if (job.targetMapIds.some((id) => !visibleMaps(state).some((map) => map.id === id))) {
    body += '<section class="notice warn"><h2>공유 맵 권한이 종료됐어요</h2><p>저장할 곳을 다시 골라 주세요. 종료된 공유 맵에는 저장하지 않아요.</p></section>';
    actions += button('저장 대상 다시 선택', { href: path(job.id, '/ended') });
  } else if (job.stage === 'waiting') {
    body += '<h1>본인 계정 확인이 필요해요</h1><p>연결 전에는 비공개 임시 접수로 보관돼요.</p>';
    actions += button('DM 계정 확인', { action: 'job-verify-account', id: job.id });
  } else if (job.analysis === 'ambiguous') actions += button('어느 지점인지 확인', { href: path(job.id, '/resolve') });
  else if (job.analysis === 'unreadable') actions += button('본문·캡처로 보완', { href: path(job.id, '/supplement') });
  else if (job.analysis === 'no-place') actions += button('장소 직접 연결', { href: path(job.id, '/no-place') });
  else if (job.analysis === 'unsupported') actions += button('미지원 출처 안내', { href: `#/links/unsupported/${job.id}` });
  else if (job.analysis === 'delayed') actions += button('지연 상태·보완 방법', { href: path(job.id, '/delayed') });
  else if (job.unresolvedNames?.length || job.childIds?.length) actions += button('여러 장소 확인', { href: path(job.id, '/multiple') });
  else actions += '<p class="caption">시연 데이터로 처리 결과를 확인할 수 있어요.</p>' + button('처리 결과 확인', { action: 'job-process' });
  if (job.stage !== 'saved') actions += button('저장 대상 변경', { href: path(job.id, '/target'), variant: 'secondary' });
  return flowPage(appBar('처리 항목', { back: '#/inbox' }), body, actions + button('처리 항목 삭제', { action: 'job-delete', variant: 'text' }), 'complete-page');
}

export function jobTargetScreen(state) {
  const job = getJob(state);
  if (!job) return missingItem();
  const selected = jobTargetChoice(state, job);
  const complete = job.stage === 'saved';
  return flowPage(appBar('처리 항목', { back: path(job.id) }), stageChip(job.stage) + sourceInfo(job) +
    '<h2>이 항목의 저장 대상</h2>' + (complete ? '<p>이미 저장된 항목이에요. 장소 상세에서 다른 맵에 복제할 수 있어요.</p>'
      : targetOptions(state, selected, 'job-target-choice')) +
    '<p class="caption">이 항목에만 적용돼요. 이미 저장 완료된 항목은 ‘다른 맵에 복제’로 넣어요.</p><p class="caption">DM 기본값 변경은 이후 접수 건에만 적용돼요.</p>',
    complete ? button('저장 결과 보기', { href: `#/links/result/${job.id}` }) : button('적용', { action: 'job-target-apply' }), 'complete-page');
}

export function jobResolveScreen(state) {
  const job = getJob(state);
  if (!job) return missingItem();
  const candidates = branchCandidates();
  return flowPage(appBar('장소 확인', { back: path(job.id) }), '<span class="status-chip warn">확인 필요</span><h1>어느 지점인가요?</h1>' +
    '<p>게시물에서 ‘예시 파스타’를 찾았지만 같은 이름의 지점이 2곳이에요.</p><p class="caption">고르기 전에는 지도에 핀을 만들지 않아요.</p>' +
    '<div class="stack" role="radiogroup" aria-label="지점 후보">' + candidates.map((place, index) =>
      html`<button type="button" class="candidate-option card ${state.ui.selectedBranch === String(index) ? 'selected' : ''}" role="radio" aria-checked="${state.ui.selectedBranch === String(index)}" data-action="job-branch" data-id="${index}"><strong>${place.name}</strong><span class="caption">${place.region}</span><span class="caption">차이: ${place.difference}</span></button>`).join('') + '</div>' +
    button('둘 다 아니에요 · 장소 검색', { action: 'job-find-place', variant: 'text' }) + mapNames(state, job),
    button('이 지점으로 저장', { action: 'job-save-branch', disabled: state.ui.selectedBranch === null }), 'complete-page');
}

export function jobSearchScreen(state) {
  const job = getJob(state);
  if (!job) return missingItem();
  const places = demoSearchOptions(state, state.ui.resolveQuery);
  return flowPage(appBar('장소 검색', { back: path(job.id) }), '<label for="resolve-query">장소명·지역 검색</label>' +
    html`<input id="resolve-query" type="search" value="${state.ui.resolveQuery}" data-action="job-search" placeholder="장소명이나 지역을 입력해 주세요">` +
    '<p class="caption">시연용 장소에서 선택해요. 직접 고른 정보로 저장돼요.</p>' +
    (places.length ? places.map((place, index) => '<section class="card">' + html`<strong>${place.name}</strong><p class="caption">${place.region} · ${place.locationStatus === 'confirmed' ? '위치 확인됨' : '위치 미확정'}</p>` +
      (place.existingPlaceId ? '<div class="content-row">' + mapLabel(state, place.mapId) + '<span class="caption">기존 카드</span></div>' : '') +
      button('이 장소로 연결', { action: 'job-resolve', id: String(index), variant: 'secondary' }) + '</section>').join('') : '<p class="soft">검색 결과가 없어요. 다른 장소명이나 지역으로 찾아 주세요.</p>'), '', 'complete-page');
}

export function jobSupplementScreen(state) {
  const job = getJob(state);
  if (!job) return missingItem();
  return flowPage(appBar('보완하기', { back: path(job.id) }), '<h1>콘텐츠를 읽을 수 없어요</h1><p>비공개 계정이거나 접근이 막힌 게시물일 수 있어요.</p><p class="caption">장소·메뉴를 추측하지 않았어요. 원본 링크는 보관돼 있어요.</p>' +
    '<h2 class="section-label">보완 방법</h2><label for="supplement-text">게시물 본문 붙여넣기</label>' +
    html`<textarea id="supplement-text" data-action="job-supplement" placeholder="본문 내용을 붙여 넣어 주세요">${job.supplement}</textarea>` +
    button(job.captureAdded ? '캡처 보완 선택됨' : '캡처 이미지 올리기', { action: 'job-capture', variant: 'secondary' }) +
    '<p class="caption">이 목업은 실제 파일을 업로드하거나 분석하지 않아요.</p>' + button('장소 직접 검색', { action: 'job-find-place', variant: 'secondary' }),
    button('보완 내용으로 다시 분석', { action: 'job-reanalyze', disabled: !job.supplement.trim() && !job.captureAdded }) + button('처리 항목 삭제', { action: 'job-delete', variant: 'text' }), 'complete-page');
}

export function jobMultipleScreen(state) {
  const job = getJob(state);
  if (!job) return missingItem();
  const jobs = [job, ...(job.childIds ?? []).map((id) => findJob(state, id)).filter(Boolean)];
  const places = jobs.flatMap((item) => item.results.filter((result) => result.status === 'saved').map((result) => findAccessiblePlace(state, result.placeId)).filter(Boolean));
  const unresolved = job.unresolvedNames ?? [];
  const pending = jobs.filter((item) => !item.primaryComplete).flatMap((item) => item.targetMapIds.filter((mapId) =>
    !item.results.some((result) => result.mapId === mapId && result.status === 'saved')).map((mapId) => ({ item, mapId })));
  return flowPage(appBar('처리 결과', { back: '#/inbox' }), '<span class="status-chip warn">' + (unresolved.length ? '일부 완료 · 여러 장소 확인 필요' : '장소 확인 완료') + '</span>' +
    '<h1>게시물의 장소를 확인해 주세요</h1>' + html`<p>맵에 저장한 카드 ${new Set(places.map((place) => place.id)).size}개를 확인해요.</p>` +
    '<h2 class="section-label">저장됨 · 지도에 표시</h2>' + places.map((place) => '<div class="stack"><div class="content-row">' + mapLabel(state, place.mapId) + '</div>' + compactPlace(place, state) + '</div>').join('') +
    pending.map(({ item, mapId }) => '<section class="card"><span class="status-chip error">미완료 · 저장 확인 필요</span>' +
      mapLabel(state, mapId) + button('미완료 대상만 다시 저장', { action: 'job-retry', id: item.id, variant: 'secondary' }) + '</section>').join('') +
    (unresolved.length ? '<h2 class="section-label">미확정 · 지도에 표시 안 됨</h2>' + unresolved.map((name) => html`<section class="card"><strong>${name}</strong><span class="status-chip warn">확인 필요</span></section>`).join('') : '') +
    (unresolved.length ? button('장소 검색해서 연결 · + 장소 추가', { action: 'job-add-place', variant: 'secondary' }) :
      visibleMaps(state).filter((map) => places.some((place) => place.mapId === map.id)).map((map) =>
        button(`${map.name}에서 보기`, { action: 'show-intake-map', id: map.id })).join('')), '', 'complete-page');
}

export function jobNoPlaceScreen(state) {
  const job = getJob(state);
  if (!job) return missingItem();
  let body = '<span class="status-chip warn">장소 정보 확인 필요</span>' +
    (job.reselectionRequired ? '<h1>장소를 다시 골라 주세요</h1><p>선택한 기존 카드가 삭제됐거나 접근할 수 없어요. 새 카드를 자동으로 만들지 않았어요.</p>' :
      '<h1>게시물에서 장소를 찾지 못했어요</h1><p>링크는 보관돼 있어요. 직접 장소를 연결하면 맵에 저장돼요.</p>') +
    button('장소 검색해서 연결', { action: 'job-find-place' }) + button('링크만 보관', { action: 'job-keep', variant: 'secondary' });
  if (state.ui.showMenuExample) {
    const example = state.places.find((place) => place.name === '예시 국밥집' && visibleMaps(state).some((map) => map.id === place.mapId));
    if (example) body += '<section class="soft"><h2>별도 저장 예시 · 메뉴 정보 없음</h2><p class="caption">장소는 확인했지만 게시물에 메뉴 근거가 없어 메뉴를 비워 두었어요.</p></section>' + compactPlace(example, state);
  }
  return flowPage(appBar('처리 항목', { back: '#/inbox' }), body, '', 'complete-page');
}

export function jobDelayedScreen(state) {
  const job = getJob(state);
  if (!job) return missingItem();
  const retry = findJob(state, state.ui.retryJobId);
  return flowPage(appBar('처리함', { back: '#/inbox' }), '<section class="notice warn"><h2>DM 회신이 늦거나 오지 않을 수 있어요</h2><p>진행 상태는 이 처리함에서 확인할 수 있어요.</p></section>' +
    '<span class="status-chip wait">분석 중 · 평소보다 오래 걸리고 있어요</span>' + sourceInfo(job) + '<p>완료 시간은 약속드리기 어려워요.</p><p class="caption">기다리거나 직접 장소를 연결할 수 있어요.</p>' +
    button('장소 직접 검색해 저장', { action: 'job-find-place' }) + '<p class="soft caption">분석 실패 항목은 보완 방법을 확인하거나 다시 처리할 수 있어요. 임의의 완료 시간·재시도 횟수를 약속하지 않아요.</p>' +
    (retry ? '<section class="card">' + stageChip(retry.stage) + html`<strong>${retry.sourceUrl}</strong><p class="caption">이번에는 분석하지 못했어요.</p>` +
      button('다시 시도', { action: 'job-retry', id: retry.id, variant: 'secondary' }) + '</section>' : ''),
    button('처리 항목 보기', { action: 'job-open', id: job.id, variant: 'secondary' }) + button('삭제', { action: 'job-delete', variant: 'text' }), 'complete-page');
}

export function jobEndedScreen(state) {
  const job = getJob(state);
  if (!job) return missingItem();
  return flowPage(appBar('저장 대상 변경', { back: '#/inbox' }), '<span class="status-chip error">공유 맵 권한 종료</span><h1>저장할 곳을 다시 골라 주세요</h1><p>분석 중 공유 맵 연결이 종료됐어요. 종료된 공유 맵에는 저장할 수 없어요.</p><p class="caption">이 항목은 내 처리함에만 남아 있어요.</p>' +
    job.results.map((result) => '<section class="card">' + mapLabel(state, result.mapId) + (result.status === 'saved' ? '<span class="status-chip ok">저장 완료</span>' : '<span class="status-chip error">저장 불가</span>') + '</section>').join('') +
    targetOptions(state, jobTargetChoice(state, job), 'job-target-choice', { both: false }),
    button('개인 맵 저장만 유지 · 적용', { action: 'job-target-apply' }) + button('링크만 보관', { action: 'job-keep', variant: 'secondary' }), 'complete-page');
}
