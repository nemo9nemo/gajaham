import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
const env = loadEnv('production', fileURLToPath(new URL('../', import.meta.url)), 'GAJAHAM_');
const errors = [];
for (const key of ['API_KEY', 'PROJECT_ID', 'AUTH_DOMAIN', 'APP_ID', 'APP_CHECK_KEY', 'ORIGIN']) if (!env['GAJAHAM_' + key] || /example|fake|public-test|demo-gajaham/i.test(env['GAJAHAM_' + key])) errors.push(`GAJAHAM_${key}: 실제 공개 클라이언트 설정 필요`);
try { const origin = new URL(env.GAJAHAM_ORIGIN); if (origin.protocol !== 'https:' || origin.origin !== env.GAJAHAM_ORIGIN) errors.push('GAJAHAM_ORIGIN: 경로 없는 HTTPS 정식 주소 필요'); } catch { errors.push('GAJAHAM_ORIGIN: 유효한 HTTPS 주소 필요'); }
const contact = env.GAJAHAM_CONTACT ?? '';
if (!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || /^https:\/\/[^\s]+$/.test(contact)) || /example\.|test@gmail\.com|준비|placeholder/i.test(contact)) errors.push('GAJAHAM_CONTACT: 공개 운영 전 실제 문의처 필요 (개발 미리보기에는 불필요)');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('공개 설정 형식 확인 완료. 운영 Auth/App Check/Rules/리전/결제·예산/실제 브라우저 검사는 별도로 필요합니다. 배포하지 않았습니다.');
