import { CATALOG } from '../src/screens/catalog.js';
import { parseRoute, ROUTES } from '../src/router.js';

const expected = [[1, 9], [2, 7], [3, 7], [4, 8], [5, 8], [6, 6], [7, 6], [8, 7]].flatMap(([group, count]) => Array.from({ length: count }, (_, index) => `${group}-${index + 1}`));
const ids = CATALOG.map((entry) => entry.id);
const errors = [];
if (ids.length !== 58 || new Set(ids).size !== 58) errors.push('화면 ID는 중복 없이 58개여야 합니다.');
for (const id of expected) if (!ids.includes(id)) errors.push(`누락된 화면: ${id}`);
for (const entry of CATALOG) {
  if (!expected.includes(entry.id)) errors.push(`허용되지 않은 화면: ${entry.id}`);
  const route = parseRoute(entry.route);
  if (route.fallback || !Object.hasOwn(ROUTES, route.path)) errors.push(`등록되지 않은 경로: ${entry.id} ${entry.route}`);
}
if (errors.length) {
  errors.forEach((error) => console.error(error));
  process.exitCode = 1;
} else {
  console.log('58개 화면 확인: 카탈로그 ID·라우트 정합 검사 통과');
}
