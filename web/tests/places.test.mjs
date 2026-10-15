import test from 'node:test';
import assert from 'node:assert/strict';
import { createScenario } from '../src/data/scenarios.js';
import { escapeHtml, html } from '../src/html.js';
import { filterPlaces, matchesQuery, pinnable, unconfirmed } from '../src/logic/places.js';

test('검색은 앞뒤 공백을 자르고 이름과 지역만 찾는다', () => {
  const cafe = createScenario('connected').places.find((place) => place.id === 'shared-cafe');
  for (const query of ['성수', '  성동구  ', '', '   ']) assert.equal(matchesQuery(cafe, query), true);
  for (const query of ['피스타치오', '테라스', '연남 파스타']) assert.equal(matchesQuery(cafe, query), false);
});

test('카테고리·검색·방문·발신자 필터를 함께 적용한다', () => {
  const places = createScenario('connected').places.filter((place) => place.mapId === 'shared-ab');
  const before = structuredClone(places);
  assert.equal(filterPlaces(places, { category: '전체' }).length, 4);
  assert.equal(filterPlaces(places).length, 4);
  assert.deepEqual(filterPlaces(places, { category: '카페', query: '성수', visit: 'want', senderId: 'user-a' }).map((place) => place.id), ['shared-cafe']);
  assert.deepEqual(filterPlaces(places, { visit: 'visited', senderId: 'user-b' }).map((place) => place.id), ['shared-soup']);
  assert.equal(filterPlaces(places, { category: '카페', senderId: 'user-b' })[0].locationStatus, 'unconfirmed');
  assert.deepEqual(places, before);
});

test('미확정이거나 좌표가 없는 장소에는 핀을 만들지 않는다', () => {
  const places = createScenario('solo').places.filter((place) => place.mapId === 'personal-b');
  const unlocated = { ...places[0], locationStatus: 'unconfirmed', pin: { x: 50, y: 50 } };
  assert.equal(pinnable(places).length, 3);
  assert.deepEqual(unconfirmed(places).map((place) => place.name), ['예시 베이커리']);
  assert.equal(pinnable([unlocated, { ...places[0], pin: null }]).length, 0);
});

test('HTML 태그 함수는 모든 데이터 보간을 이스케이프한다', () => {
  assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
  assert.equal(html`<p>${'<script>"&'}</p>`, '<p>&lt;script&gt;&quot;&amp;</p>');
  assert.equal(html`${null}${undefined}${0}`, '0');
});
