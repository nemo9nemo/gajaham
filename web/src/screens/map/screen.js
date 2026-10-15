import { html } from '../../html.js';
import { userName, userInitial } from '../../data/mock.js';
import { visibleMaps } from '../../logic/maps.js';
import { filterPlaces, pinnable, unconfirmed } from '../../logic/places.js';
import { button } from '../../components/button.js';
import { mapBadge } from '../../components/map-badge.js';
import { chip } from '../../components/chip.js';
import { tabBar } from '../../components/tab-bar.js';
import { notice } from '../../components/notice.js';

function mapHeader(state, map, maps, showTools, noResults) {
  const switcher = maps.some((item) => item.type === 'shared');
  const expanded = state.ui.sheet === 'maps';
  return '<header class="map-header"><div class="map-heading-wrap"><div class="map-heading">' + mapBadge(map.type) +
    (switcher ? html`<button type="button" class="map-title" data-action="open-maps" aria-expanded="${expanded}" aria-controls="map-switcher">${map.name} ${expanded ? '▴' : '▾'}</button>`
      : html`<h1 class="map-title">${map.name}</h1>`) +
    (state.ui.view === 'list' && showTools && !noResults ? button(state.ui.selectionMode ? '선택 취소' : '선택', { action: 'toggle-selection', variant: 'text' }) :
      !switcher ? button('함께 쓰기', { action: 'open-together', href: '#/together', variant: 'text' }) : '') +
    '</div>' + (expanded ? mapDropdown(state, maps) : '') + '</div>' +
    (showTools && !expanded ? '<div class="map-tools"><label class="search-box"><span class="sr-only">장소명·지역 검색</span>' +
      html`<input type="search" id="place-query" data-action="query" placeholder="장소명·지역 검색" value="${state.ui.query}"></label>` +
      (!noResults ? '<div class="chips" aria-label="카테고리">' +
        ['전체', '맛집', '카페', '놀거리'].map((category) => chip(category, 'category', category, state.ui.category === category)).join('') + '</div>' : '') +
      '<nav class="view-toggle" aria-label="보기 방식">' +
      html`<a href="#/map" aria-current="${state.ui.view === 'map' ? 'page' : 'false'}">지도</a><a href="#/map?view=list" aria-current="${state.ui.view === 'list' ? 'page' : 'false'}">목록</a></nav></div>` : '') + '</header>';
}

function listFilters(state, map) {
  return '<div class="list-filters"><div class="chips" aria-label="방문 상태">' +
    [['방문 전체', ''], ['가고 싶어', 'want'], ['다녀왔어요', 'visited']].map(([label, id]) => chip(label, 'visit', id, state.ui.visit === id)).join('') + '</div>' +
    (map.type === 'shared' ? '<div class="chips" aria-label="보낸 사람">' + chip('보낸 사람 전체', 'sender', '', !state.ui.senderId) +
      map.memberIds.map((id) => chip(userName(state, id), 'sender', id, state.ui.senderId === id)).join('') + '</div>' : '') + '</div>';
}

function visitText(state, place) {
  if (place.visit === 'visited') return '다녀왔어요';
  if (place.visit === 'want') return `가고 싶어 · ${place.wantBy.map((id) => userInitial(state, id)).join(', ')}`;
  return '';
}

function placeRows(state, map, places, sources = false) {
  return '<ul class="place-list">' + places.map((place) => '<li class="place-row">' +
    (state.ui.selectionMode ? html`<label class="check-place"><input type="checkbox" data-action="select-place" data-id="${place.id}"` +
      (state.ui.selectedIds.includes(place.id) ? ' checked' : '') + html`><span class="sr-only">${place.name} 선택</span></label>` : '') +
    (!sources ? '<div class="thumb" aria-hidden="true">없음</div>' : '') + '<div class="place-row-body">' +
    html`<button type="button" class="place-name" data-action="open-place" data-id="${place.id}">${place.name}</button>` +
    html`<p class="caption">${place.category}${place.locationStatus === 'confirmed' ? ' · 위치 확인됨' : ''}${map.type === 'shared' ? ` · 보낸 사람 ${userInitial(state, place.senderId)}` : ''}</p>` +
    (place.locationStatus !== 'confirmed' ? '<span class="status-chip warn">위치 미확정 · 지도에 표시 안 됨</span>' : '') +
    (place.visit ? html`<span class="status-chip ${place.visit === 'want' ? 'ok' : 'wait'}">${visitText(state, place)}</span>` : '') + '</div>' +
    (sources ? button('원본', { action: 'source', id: place.id, variant: 'text' }) : '') + '</li>').join('') + '</ul>';
}

function fakeMap(state, map, places) {
  return html`<div class="fake-map ${map.type}" role="region" aria-label="장소 지도">` +
    pinnable(places).map((place) => {
      const x = Math.min(100, Math.max(0, Number(place.pin.x) || 0));
      const y = Math.min(100, Math.max(0, Number(place.pin.y) || 0));
      return html`<button type="button" class="map-pin" data-action="open-place" data-id="${place.id}" aria-label="${place.name}" aria-pressed="${state.ui.sheet === 'place' && state.ui.selectedPlaceId === place.id}" style="left:${x}%;top:${y}%"><span class="pin-dot" aria-hidden="true"></span><span class="pin-label">${place.name}</span></button>`;
    }).join('') + '</div>';
}

function emptyMap(state, map) {
  return '<section class="empty empty-map">' +
    (map.type === 'personal' ? '<h2>아직 저장한 장소가 없어요</h2><p class="muted">인스타그램에서 본 게시물·릴스를 서비스 계정에 DM으로 보내거나, 링크를 붙여 넣어 저장해요.</p>' +
      button('링크 등록', { href: '#/todo/UI-03/3-1' }) + button('DM으로 보내는 방법', { href: '#/todo/UI-03/3-1', variant: 'secondary' }) :
      '<h2>공유 맵에 아직 장소가 없어요</h2><p class="muted">내 개인 맵에서 함께 볼 장소를 골라 복제하거나, 새 링크를 공유 맵에 등록해요.</p>' +
      button('내 개인 맵에서 복제', { href: '#/todo/UI-02/2-2' }) + button('공유 맵에 링크 등록', { href: '#/todo/UI-03/3-2', variant: 'secondary' }) +
      html`<p class="caption">공유 맵에 넣은 장소는 ${map.memberIds.map((id) => userName(state, id)).join(', ')}에게 보여요.</p>`) + '</section>';
}

function mapDropdown(state, maps) {
  return '<section id="map-switcher" class="map-dropdown" aria-label="맵 전환"><div class="dropdown-heading"><h2>맵 전환</h2>' +
    '<button type="button" class="close-control" data-action="close-sheet" aria-label="맵 전환 닫기">×</button></div>' + maps.map((map) => {
    const count = state.places.filter((place) => place.mapId === map.id).length;
    return html`<button type="button" class="map-option ${map.id === state.currentMapId ? 'current' : ''}" data-action="switch-map" data-id="${map.id}" aria-current="${map.id === state.currentMapId ? 'true' : 'false'}">` +
      mapBadge(map.type) + html`<span class="map-option-body"><strong>${map.name}</strong>` +
      (map.id === state.currentMapId ? '<span class="current-map">지금 보는 맵</span>' : '') +
      html`<span class="caption">${map.type === 'personal' ? '나만' : map.memberIds.map((id) => userName(state, id)).join(', ')} · 장소 ${count}곳</span></span></button>`;
  }).join('') + '<p class="caption">상대방의 개인 맵은 볼 수 없어요. 공유 맵에 넣으려면 각자 복제해요.</p>' +
    '<p class="caption">맵을 바꿔도 DM 기본 저장 위치는 바뀌지 않아요.</p>' + (state.ui.notice ? notice(state.ui.notice) : '') + '</section>';
}

function placeSummary(state, map, places) {
  const place = places.find((item) => item.id === state.ui.selectedPlaceId);
  if (!place) return '';
  return '<section class="place-summary" aria-label="장소 요약"><div class="summary-top"><span class="sheet-handle" aria-hidden="true"></span>' +
    '<button type="button" class="close-control" data-action="close-sheet" aria-label="장소 요약 닫기">×</button></div><div class="summary-body">' +
    html`<div class="thumb summary-thumb">${place.hasImage ? '이미지 자리' : '이미지 없음'}</div><div class="summary-copy"><h2>${place.name}</h2>` +
    html`<p class="caption">${place.category} · ${place.region} · ${place.locationStatus === 'confirmed' ? '위치 확인됨' : '위치 미확정 · 지도에 표시 안 됨'}</p><p class="caption">${place.summary}</p></div></div>` +
    (map.type === 'shared' ? html`<p class="caption">보낸 사람 ${userInitial(state, place.senderId)}${place.visit === 'want' ? ` · 가고 싶어: ${place.wantBy.map((id) => userInitial(state, id)).join(', ')}` : place.visit === 'visited' ? ' · 다녀왔어요' : ''}</p>` : '') +
    (state.ui.notice ? notice(state.ui.notice) : '') + '<div class="button-row">' + button('자세히', { href: '#/todo/UI-02/6-1' }) + button('원본', { action: 'source', id: place.id, variant: 'secondary' }) + '</div></section>';
}

export function mapScreen(state) {
  const maps = visibleMaps(state);
  const map = maps.find((item) => item.id === state.currentMapId) ?? maps[0];
  if (!map) return '<main class="page">접근할 수 있는 맵이 없어요.</main>';
  const allPlaces = state.places.filter((place) => place.mapId === map.id);
  const places = filterPlaces(allPlaces, {
    category: state.ui.category, query: state.ui.query,
    visit: state.ui.view === 'list' ? state.ui.visit : '',
    senderId: state.ui.view === 'list' && map.type === 'shared' ? state.ui.senderId : '',
  });
  let content = '';
  if (state.ui.view === 'list' && places.length) content += listFilters(state, map);
  if (!allPlaces.length && !state.ui.query.trim()) {
    content += emptyMap(state, map);
  } else if (!places.length) {
    content += '<section class="empty search-empty">' + html`<h2>${state.ui.query.trim() ? `‘${state.ui.query}’와 맞는 장소가 없어요` : '조건에 맞는 장소가 없어요'}</h2>` +
      '<p class="muted">장소명이나 지역으로 검색해요. 메뉴·메모 내용은 검색되지 않아요.</p>' +
      button(state.ui.query.trim() ? '검색어 지우기' : '필터 지우기', { action: state.ui.query.trim() ? 'clear-query' : 'clear-filters', variant: 'secondary' }) + '</section>';
  } else if (state.ui.view === 'list') {
    content += placeRows(state, map, places);
  } else if (state.ui.mapError) {
    content += '<section class="map-error"><h2 class="status-chip error">지도를 불러오지 못했어요</h2><p>목록과 원본 링크는 그대로 이용할 수 있어요.</p>' +
      button('다시 시도', { action: 'retry-map', variant: 'secondary' }) + '</section>' + placeRows(state, map, places, true);
  } else {
    const count = unconfirmed(places).length;
    content += '<div class="map-canvas">' + fakeMap(state, map, places) +
      (count ? html`<a class="unconfirmed-notice" href="#/map?view=list"><span class="status-chip warn">위치 미확정 ${count}곳</span><span>지도에 표시 안 됨 · 목록에서 보기</span></a>` : '') +
      (state.ui.sheet === 'place' ? placeSummary(state, map, allPlaces) : '') + '</div>';
  }
  if (state.ui.view === 'list' && places.length) content += '<div class="selection-actions">' +
    button('선택해서 복제', { href: '#/todo/UI-02/2-4', variant: 'secondary', disabled: !state.ui.selectedIds.length }) +
    button('전체 복제', { href: '#/todo/UI-02/2-4', variant: 'secondary' }) + '</div>';
  // List/error rows can also open the same nonmodal summary without hiding their controls.
  if (state.ui.sheet === 'place' && (state.ui.view === 'list' || state.ui.mapError)) content += placeSummary(state, map, allPlaces);
  return '<div class="map-page">' + mapHeader(state, map, maps, !!allPlaces.length && !state.ui.mapError, !places.length) +
    '<main class="map-content' + (state.ui.view === 'list' ? ' list-content' : '') + '">' + content + '</main>' +
    (state.ui.sheet === 'maps' ? '<button type="button" class="map-switch-scrim" data-action="close-sheet" aria-label="맵 전환 닫기"></button>' : '') +
    (!state.ui.sheet && places.length && !state.ui.mapError && !state.ui.selectionMode ? button('+ 링크 등록', { href: '#/todo/UI-03/3-1', variant: 'floating' }) : '') + tabBar() + '</div>';
}
