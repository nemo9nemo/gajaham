import { readFile, writeFile, mkdir, cp, readdir } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { deploymentConfigs, toEnv, validateRelease, containsPrivateKeyMaterial } from './release-config.mjs';
import { verifyRelease } from './verify-release.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
function run(args, cwd, env = {}) {
  const result = spawnSync(process.execPath, args, { cwd, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: join(root, 'tmp/tool-logs/wrangler-release.log'), ...env }, stdio: 'pipe', encoding: 'utf8' });
  // CLI output can contain expanded public settings. Keep it out of the report.
  if (result.status !== 0) throw new Error('출시 번들 빌드 실패: 의존성과 로컬 빌드 환경을 확인하세요. 설정/CLI 원문은 출력하지 않았습니다.');
}
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('출시 파일에 심볼릭 링크를 포함할 수 없습니다.');
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path)); else result.push(path);
  }
  return result;
}
export async function prepare(inputPath) {
  const path = resolve(root, inputPath); const local = relative(root, path);
  if (local.startsWith('..') || isAbsolute(local)) throw new Error('설정은 프로젝트 안의 로컬 파일만 사용할 수 있습니다.');
  let input; try { input = JSON.parse(await readFile(path, 'utf8')); } catch { throw new Error('설정 JSON을 읽을 수 없습니다. 실제 값은 출력하지 않았습니다.'); }
  const errors = validateRelease(input); if (errors.length) throw new Error(errors.join('\n'));
  const hosting = JSON.parse(await readFile(join(root, 'firebase.json'), 'utf8'));
  const worker = JSON.parse(await readFile(join(root, 'worker/wrangler.jsonc'), 'utf8'));
  const configs = deploymentConfigs(input, hosting, worker);
  const output = join(root, 'tmp/release', `${Date.now()}-${crypto.randomUUID()}`);
  await mkdir(output, { recursive: true });
  const scratch = join(root, 'tmp/release-build', crypto.randomUUID());
  run(['node_modules/vite/bin/vite.js', 'build', '--outDir', join(output, 'hosting')], join(root, 'app-web'), toEnv(input));
  run(['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run', '--config', 'wrangler.jsonc', '--outdir', scratch], join(root, 'worker'));
  // Wrangler creates a local source map even without public upload. Strip it from
  // the reviewable deployment package and remove its dangling reference.
  const workerCode = (await readFile(join(scratch, 'index.js'), 'utf8')).replace(/^\/\/# sourceMappingURL=.*$/gm, '');
  for (const marker of ['127.0.0.1:9199', 'demo-gajaham', 'Bearer owner', 'connectAuthEmulator']) if (workerCode.includes(marker)) throw new Error('운영 Worker 번들에 개발 연결이 포함됐습니다.');
  if (containsPrivateKeyMaterial(workerCode)) throw new Error('운영 Worker 번들에 비밀 인증 자료가 포함됐습니다.');
  // Package only allowlisted files; source maps/README/cache never enter manifest.
  await mkdir(join(output, 'worker'));
  await writeFile(join(output, 'worker/index.js'), workerCode);
  await cp(join(root, 'worker/migrations'), join(output, 'migrations'), { recursive: true });
  await writeFile(join(output, 'firebase.json'), JSON.stringify(configs.firebase, null, 2) + '\n');
  await writeFile(join(output, 'wrangler.jsonc'), JSON.stringify(configs.worker, null, 2) + '\n');
  await writeFile(join(output, '.firebaserc'), JSON.stringify({ projects: { default: input.projectId } }, null, 2) + '\n');
  const allowed = [...await files(join(output, 'hosting')), ...await files(join(output, 'migrations')), 'worker/index.js', 'firebase.json', 'wrangler.jsonc', '.firebaserc'].map(file => isAbsolute(file) ? file : join(output, file));
  const manifest = [];
  for (const file of allowed) {
    const name = relative(output, file).replaceAll('\\', '/'); const content = await readFile(file);
    if (/\.map$|(?:^|\/)\.env|\.dev\.vars/.test(name)) throw new Error('비밀/개발 파일을 출시 목록에 넣을 수 없습니다.');
    manifest.push({ file: name, sha256: createHash('sha256').update(content).digest('hex') });
  }
  // Everything outside manifest is local build material and must not be uploaded.
  await writeFile(join(output, 'manifest.json'), JSON.stringify({ status: 'BUILT_NOT_DEPLOYED', billingVerified: false, operatingChecksPassed: false, files: manifest }, null, 2) + '\n');
  await writeFile(join(output, 'NOT-DEPLOYED.txt'), '로컬 생성만 완료. manifest.json의 파일만 배포 검토 대상입니다. 실제 Spark/Workers Free·결제 미연결·secret·CPU/App Check/메일/실기기 검사 전 배포하지 마세요. 빌드 자료 전체를 웹 루트로 업로드하지 마세요.\n');
  await verifyRelease(output);
  return relative(root, output).replaceAll('\\', '/');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const destination = await prepare(process.argv[2] ?? 'release.config.local.json'); const checked = await verifyRelease(destination); console.log(`출시 번들 생성 완료: ${destination}\nmanifest SHA256: ${checked.manifestSha256}\n공개 배포·원격 리소스 생성·결제 변경은 하지 않았습니다.`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
