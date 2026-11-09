import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const env = loadEnv('production', fileURLToPath(new URL('../', import.meta.url)), 'GAJAHAM_');
const errors = [];
for (const key of ['API_KEY', 'PROJECT_ID', 'AUTH_DOMAIN', 'APP_ID', 'APP_CHECK_KEY', 'ORIGIN', 'API_ORIGIN']) if (!env['GAJAHAM_' + key] || /example|fake|public-test|demo-gajaham/i.test(env['GAJAHAM_' + key])) errors.push(`GAJAHAM_${key}: 실제 공개 클라이언트 설정 필요`);
try { const api = new URL(env.GAJAHAM_API_ORIGIN); if (api.protocol !== 'https:' || api.origin !== env.GAJAHAM_API_ORIGIN) errors.push('GAJAHAM_API_ORIGIN: 경로 없는 HTTPS API 주소 필요'); } catch { errors.push('GAJAHAM_API_ORIGIN: 실제 API 주소 필요'); }
const hosting = JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'));
const csp = hosting.hosting.headers.flatMap(item => item.headers).find(item => item.key === 'Content-Security-Policy')?.value ?? '';
const connect = csp.split(';').find(item => item.trim().startsWith('connect-src '))?.trim().split(/\s+/) ?? [];
if (!env.GAJAHAM_API_ORIGIN || !connect.includes(env.GAJAHAM_API_ORIGIN) || connect.includes('https://*.workers.dev')) errors.push('Hosting CSP connect-src: 실제 API origin만 허용하도록 설정 필요');
try { const origin = new URL(env.GAJAHAM_ORIGIN); if (origin.protocol !== 'https:' || origin.origin !== env.GAJAHAM_ORIGIN) errors.push('GAJAHAM_ORIGIN: 경로 없는 HTTPS 정식 주소 필요'); } catch { errors.push('GAJAHAM_ORIGIN: 유효한 HTTPS 주소 필요'); }
const contact = env.GAJAHAM_CONTACT ?? '';
if (!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || /^https:\/\/[^\s]+$/.test(contact)) || /example\.|test@gmail\.com|준비|placeholder/i.test(contact)) errors.push('GAJAHAM_CONTACT: 공개 운영 전 실제 문의처 필요 (개발 미리보기에는 불필요)');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('공개 설정 형식 확인 완료. 운영 Spark/Workers·D1 Free·결제수단 미연결·Auth/App Check/보안/실제 브라우저 검사는 별도로 필요합니다. 배포하지 않았습니다.');
