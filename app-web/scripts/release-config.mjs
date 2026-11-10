// Public settings only. Credentials must never enter this module's input or output.
export const publicFields = ['apiKey', 'projectId', 'authDomain', 'appId', 'appCheckKey', 'origin', 'apiOrigin', 'contact', 'operatorName', 'policyDate', 'processingNotice'];
export const envNames = Object.fromEntries(publicFields.map(key => [key, 'GAJAHAM_' + key.replace(/[A-Z]/g, char => '_' + char).toUpperCase()]));
export const fromEnv = env => Object.fromEntries(publicFields.map(key => [key, env[envNames[key]] ?? '']));
export const toEnv = config => Object.fromEntries(publicFields.map(key => [envNames[key], config[key] ?? '']));
export const containsPrivateKeyMaterial = source => /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----(?:\r?\n|\\n)[A-Za-z0-9+/=]{24,}/.test(source);
const placeholder = value => typeof value !== 'string' || !value.trim() || /configure-before-use|example-project|example-api|public-test|demo-gajaham|placeholder|준비\s*중/i.test(value);
export function httpsOrigin(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && url.origin === value && !url.username && !url.password; } catch { return false; }
}
export function contactLink(value) {
  if (typeof value !== 'string' || /[\s\u0000-\u001f\u007f]/u.test(value)) return '';
  if (/^[a-zA-Z0-9.!+_-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(value)) return `mailto:${value}`;
  try { const url = new URL(value); if (url.protocol === 'https:' && !url.username && !url.password) return url.href; } catch { /* no unsafe URL fallback */ }
  return '';
}
export function validatePublic(config) {
  const errors = [];
  for (const key of publicFields) if (placeholder(config[key]) || typeof config[key] !== 'string' || config[key].length > (key === 'processingNotice' ? 4000 : 1024) || /[\u0000-\u001f\u007f]/u.test(config[key])) errors.push(`${key}: 공개 운영 정보 필요`);
  if (!/^AIza[A-Za-z0-9_-]{35}$/.test(config.apiKey ?? '')) errors.push('apiKey: Firebase 콘솔의 공개 웹 API key 필요');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId ?? '') || config.projectId?.startsWith('demo-')) errors.push('projectId: 실제 Firebase 프로젝트 필요');
  if (config.authDomain !== `${config.projectId}.firebaseapp.com`) errors.push('authDomain: 현재 프로젝트의 기본 Firebase 인증 도메인 필요');
  if (config.origin !== `https://${config.projectId}.web.app`) errors.push('origin: 현재 프로젝트의 무료 web.app 기본 주소 필요');
  if (!httpsOrigin(config.apiOrigin) || !/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(config.apiOrigin ?? '')) errors.push('apiOrigin: Workers 무료 기본 주소 필요');
  if (!contactLink(config.contact) || /@example\.(?:com|invalid|org|net)$|\.invalid(?:[\/:#?]|$)|^test@gmail\.com$/i.test(config.contact ?? '')) errors.push('contact: 실제 공개 문의처 필요');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(config.policyDate ?? '') || Number.isNaN(Date.parse(config.policyDate)) || new Date(config.policyDate).toISOString().slice(0, 10) !== config.policyDate) errors.push('policyDate: 유효한 시행일 필요');
  if (Object.values(config).some(value => typeof value === 'string' && /-----BEGIN .*PRIVATE KEY-----|refresh_token|service_account/i.test(value))) errors.push('설정에 비밀 인증 자료를 넣을 수 없습니다.');
  if (Object.values(config).some(value => typeof value === 'string' && /(?:eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|ya29\.[A-Za-z0-9._-]+)/.test(value))) errors.push('설정에 인증 토큰을 넣을 수 없습니다.');
  return [...new Set(errors)];
}
export function validateRelease(input) {
  const keys = [...publicFields, 'projectNumber', 'workerName', 'databaseName', 'databaseId', 'privacyReviewed'];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['설정 JSON 객체 필요'];
  const errors = validatePublic(input);
  if (Object.keys(input).some(key => !keys.includes(key))) errors.push('허용하지 않은 설정 항목: 공개 설정만 입력하세요.');
  if (!/^[1-9][0-9]{5,20}$/.test(input.projectNumber ?? '') || !new RegExp(`^1:${input.projectNumber}:web:[a-f0-9]+$`).test(input.appId ?? '')) errors.push('projectNumber/appId: 같은 Firebase 프로젝트의 값 필요');
  if (!/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/.test(input.workerName ?? '') || typeof input.apiOrigin !== 'string' || !input.apiOrigin.startsWith(`https://${input.workerName}.`)) errors.push('workerName/apiOrigin: 같은 Worker의 값 필요');
  if (!/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/.test(input.databaseName ?? '') || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.databaseId ?? '') || /^00000000-/.test(input.databaseId ?? '')) errors.push('databaseName/databaseId: 실제 D1 연결 정보 필요');
  if (input.privacyReviewed !== true) errors.push('privacyReviewed: 운영자가 실제 처리/국외 이전 안내를 확인해야 합니다.');
  return [...new Set(errors)];
}
export function deploymentConfigs(input, hostingTemplate, workerTemplate) {
  const errors = validateRelease(input); if (errors.length) throw new Error(errors.join('\n'));
  const firebase = { hosting: structuredClone(hostingTemplate.hosting) };
  // Allowlist deployment capabilities so later template additions cannot silently
  // introduce extra services or application request logging into this release.
  const worker = { compatibility_date: workerTemplate.compatibility_date, compatibility_flags: ['nodejs_compat'], workers_dev: true, observability: { enabled: false }, triggers: { crons: ['*/5 * * * *'] } };
  firebase.hosting.public = 'hosting'; delete firebase.hosting.predeploy;
  for (const group of firebase.hosting.headers) for (const header of group.headers) {
    if (header.key === 'Content-Security-Policy') header.value = header.value.replace('https://configure-before-use.workers.dev', input.apiOrigin);
  }
  if (!firebase.hosting.headers.flatMap(group => group.headers).find(header => header.key === 'Content-Security-Policy')?.value.includes(input.apiOrigin)) throw new Error('Hosting API 허용 주소 생성 실패');
  worker.name = input.workerName; worker.main = 'worker/index.js';
  worker.vars = { FIREBASE_PROJECT_ID: input.projectId, FIREBASE_PROJECT_NUMBER: input.projectNumber, FIREBASE_APP_ID: input.appId, WEB_ORIGIN: input.origin };
  worker.d1_databases = [{ binding: 'DB', database_name: input.databaseName, database_id: input.databaseId, migrations_dir: 'migrations' }];
  return { firebase, worker };
}
