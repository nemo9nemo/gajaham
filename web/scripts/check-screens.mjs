import { CATALOG } from '../src/screens/catalog.js';
import { parseRoute, ROUTES } from '../src/router.js';

const expected = [...Array.from({ length: 9 }, (_, index) => `1-${index + 1}`), ...Array.from({ length: 8 }, (_, index) => `4-${index + 1}`)];
const ids = CATALOG.map((entry) => entry.id);
const errors = [];
if (ids.length !== 17 || new Set(ids).size !== 17) errors.push('화면 ID는 중복 없이 17개여야 합니다.');
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
  console.log('17개 화면 확인: 카탈로그 ID·라우트 정합 검사 통과');
}
