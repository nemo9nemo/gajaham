import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
const root = fileURLToPath(new URL('../../', import.meta.url));
const node = process.execPath;
const env = { ...process.env, GCLOUD_PROJECT: 'demo-gajaham-web', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199', WRANGLER_SEND_METRICS: 'false' };
const children = []; let stopping = false;
function stop() { if (stopping) return; stopping = true; for (const child of children) { if (!child?.pid || child.exitCode !== null) continue; if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); else child.kill('SIGINT'); } }
process.on('SIGINT', () => { stop(); process.exitCode = 130; }); process.on('SIGTERM', stop);
function run(args, cwd = root) { return new Promise((resolve, reject) => { const child = spawn(node, args, { cwd, env, stdio: 'inherit' }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Check failed (${code}): ${args[0]}`))); }); }
const listening = port => new Promise(resolve => { const socket = createConnection({ host: '127.0.0.1', port }); socket.once('connect', () => { socket.destroy(); resolve(true); }); socket.once('error', () => resolve(false)); });
try {
  if (!process.argv.includes('--reuse-emulators')) {
    if ((await Promise.all([9199, 8787].map(listening))).some(Boolean)) throw new Error('Local ports occupied. Stop your process or explicitly pass --reuse-emulators for the known WEB-02 demo suite.');
    const persist = root + 'tmp/codex/WEB-02-local-' + crypto.randomUUID();
    await run(['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.local.jsonc', '--persist-to', persist], root + 'worker');
    children.push(spawn(node, ['-r', './tools/auth-emulator/quiet.cjs', './tools/auth-emulator/node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:start', '--only', 'auth', '--project', 'demo-gajaham-web'], { cwd: root, env, stdio: 'ignore' }));
    children.push(spawn(node, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--config', 'wrangler.local.jsonc', '--persist-to', persist], { cwd: root + 'worker', env, stdio: 'ignore' }));
    for (const child of children) child.on('error', () => { process.exitCode = 1; });
    for (let i = 0; i < 90; i++) { if ((await Promise.all([9199, 8787].map(listening))).every(Boolean)) break; if (children.some(child => child.exitCode !== null)) throw new Error('Local startup failed; check CLI dependencies and ports.'); await new Promise(r => setTimeout(r, 1000)); }
  }
  if (!(await Promise.all([9199, 8787].map(listening))).every(Boolean)) throw new Error('WEB-02 demo suite unavailable.');
  await run(['--test', 'tests/unit.test.mjs', 'tests/release.test.mjs'], root + 'app-web');
  await run(['--test', 'tests/auth.test.mjs', 'tests/service.test.mjs'], root + 'worker');
  await run(['node_modules/@playwright/test/cli.js', 'test'], root + 'app-web');
  await run(['app-web/scripts/check-production.mjs']);
  await run(['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run', '--outdir', 'dist'], root + 'worker');
  console.log('WEB-03 local checks passed. Free plan/production CPU and Galaxy checks remain separate. No deployment.');
} catch (error) { console.error(error.message); process.exitCode = 1; } finally { stop(); }
