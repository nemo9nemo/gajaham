import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { containsPrivateKeyMaterial, httpsOrigin } from './release-config.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const fail = () => { throw new Error('출시 파일 검증 실패: 파일·목록·해시·배포 구성을 확인하고 다시 생성하세요. 내용/비밀은 출력하지 않았습니다.'); };
const within = (parent, target) => { const path = relative(parent, target); return path !== '..' && !path.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) && !isAbsolute(path); };
async function walk(directory, prefix = '') {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) fail();
    const name = prefix + entry.name;
    if (entry.isDirectory()) paths.push(...await walk(join(directory, entry.name), name + '/')); else paths.push(name);
    if (paths.length > 2000) fail();
  }
  return paths;
}
function fileName(value) {
  return typeof value === 'string' && value.length < 512 && !/[\\:\u0000-\u001f\u007f]/u.test(value) && value.split('/').every(segment => segment && segment !== '.' && segment !== '..');
}
export async function verifyRelease(input, expectedManifestHash = '') {
  try {
    const directory = await realpath(resolve(root, input)); if (!within(await realpath(root), directory)) fail();
    const all = await walk(directory);
    const raw = await readFile(join(directory, 'manifest.json')); const digest = sha256(raw);
    if (expectedManifestHash && (!/^[a-f0-9]{64}$/.test(expectedManifestHash) || expectedManifestHash !== digest)) fail();
    const manifest = JSON.parse(raw);
    if (manifest.status !== 'BUILT_NOT_DEPLOYED' || manifest.billingVerified !== false || manifest.operatingChecksPassed !== false || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 1998) fail();
    const names = new Set(); const caseNames = new Set();
    for (const row of manifest.files) {
      if (!row || Object.keys(row).some(key => !['file', 'sha256'].includes(key)) || !fileName(row.file) || !/^[a-f0-9]{64}$/.test(row.sha256)) fail();
      if (names.has(row.file) || caseNames.has(row.file.toLowerCase())) fail(); names.add(row.file); caseNames.add(row.file.toLowerCase());
      if (!(row.file.startsWith('hosting/') || /^migrations\/\d+_[a-zA-Z0-9_-]+\.sql$/.test(row.file) || ['worker/index.js', 'firebase.json', 'wrangler.jsonc', '.firebaserc'].includes(row.file))) fail();
      if (row.file.split('/').some(part => part.startsWith('.') && row.file !== '.firebaserc') || /\.map$/i.test(row.file)) fail();
      const path = await realpath(join(directory, row.file)); if (!within(directory, path) || (await stat(path)).size > 32 * 1024 * 1024) fail();
      const bytes = await readFile(path); if (sha256(bytes) !== row.sha256 || containsPrivateKeyMaterial(bytes.toString('utf8'))) fail();
    }
    for (const required of ['hosting/index.html', 'hosting/privacy/index.html', 'worker/index.js', 'firebase.json', 'wrangler.jsonc', '.firebaserc', 'migrations/0001_documents.sql']) if (!names.has(required)) fail();
    if (all.length !== names.size + 2 || all.some(name => !names.has(name) && !['manifest.json', 'NOT-DEPLOYED.txt'].includes(name))) fail();
    const firebase = JSON.parse(await readFile(join(directory, 'firebase.json'), 'utf8'));
    const worker = JSON.parse(await readFile(join(directory, 'wrangler.jsonc'), 'utf8'));
    const project = JSON.parse(await readFile(join(directory, '.firebaserc'), 'utf8')).projects?.default;
    const allowedWorker = ['name', 'main', 'compatibility_date', 'compatibility_flags', 'workers_dev', 'observability', 'triggers', 'vars', 'd1_databases'];
    if (Object.keys(firebase).some(key => key !== 'hosting') || firebase.hosting?.public !== 'hosting' || Object.keys(firebase.hosting).some(key => !['public', 'ignore', 'headers'].includes(key))) fail();
    if (Object.keys(worker).some(key => !allowedWorker.includes(key)) || worker.main !== 'worker/index.js' || worker.observability?.enabled !== false || worker.workers_dev !== true || worker.d1_databases?.length !== 1 || worker.d1_databases[0].binding !== 'DB' || worker.d1_databases[0].migrations_dir !== 'migrations') fail();
    if (Object.keys(worker.vars ?? {}).some(key => !['FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_NUMBER', 'FIREBASE_APP_ID', 'WEB_ORIGIN'].includes(key))) fail();
    if (project !== worker.vars?.FIREBASE_PROJECT_ID || worker.vars.WEB_ORIGIN !== `https://${project}.web.app` || !worker.vars.FIREBASE_APP_ID?.startsWith(`1:${worker.vars.FIREBASE_PROJECT_NUMBER}:web:`)) fail();
    const csp = firebase.hosting.headers.flatMap(group => group.headers).find(header => header.key === 'Content-Security-Policy')?.value ?? '';
    const connect = csp.split(';').find(value => value.trim().startsWith('connect-src '))?.trim().split(/\s+/) ?? [];
    const api = connect.filter(value => value.endsWith('.workers.dev'));
    if (api.length !== 1 || !httpsOrigin(api[0]) || !api[0].startsWith(`https://${worker.name}.`) || connect.includes('*') || connect.some(value => value.includes('cloudfunctions.net'))) fail();
    const code = await readFile(join(directory, 'worker/index.js'), 'utf8');
    if (['demo-gajaham', '127.0.0.1:9199', 'Bearer owner', 'sourceMappingURL='].some(marker => code.includes(marker))) fail();
    return { files: names.size, manifestSha256: digest, status: manifest.status, operatingChecksPassed: false };
  } catch { fail(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) fail();
    console.log(JSON.stringify(await verifyRelease(process.argv[2], process.argv[3] ?? ''), null, 2));
    console.log('파일 대조만 완료했습니다. 출처 인증·무료 계약·운영 검사·공개 배포 승인을 뜻하지 않습니다.');
  } catch { console.error('출시 파일 검증 실패. 다시 생성하고 원래 보관한 manifest hash와 대조하세요.'); process.exitCode = 1; }
}
