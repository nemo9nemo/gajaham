import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { fromEnv, validatePublic } from './release-config.mjs';
const env = loadEnv('production', fileURLToPath(new URL('../', import.meta.url)), 'GAJAHAM_');
const config = fromEnv(env); const errors = validatePublic(config);
const hosting = JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'));
const csp = hosting.hosting.headers.flatMap(item => item.headers).find(item => item.key === 'Content-Security-Policy')?.value ?? '';
const connect = csp.split(';').find(item => item.trim().startsWith('connect-src '))?.trim().split(/\s+/) ?? [];
if (!config.apiOrigin || !connect.includes(config.apiOrigin) || connect.includes('https://*.workers.dev')) errors.push('Hosting CSP connect-src: 실제 API origin만 허용하도록 설정 필요');
if (hosting.functions || hosting.firestore) errors.push('기본 배포에 이전 유료 서버를 포함할 수 없습니다.');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('공개 설정 형식 확인 완료. 실제 무료 플랜·결제 미연결·secret·개인정보 처리 확정·운영 CPU/App Check/메일/Galaxy 검사는 별도입니다. 배포하지 않았습니다.');
