import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
const root = fileURLToPath(new URL('../../', import.meta.url));
const node = process.execPath;
const env = { ...process.env, GCLOUD_PROJECT: 'demo-gajaham-web', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199' };
let emulator; let stopping = false;
function stop() { if (stopping) return; stopping = true; if (!emulator?.pid || emulator.exitCode !== null) return; if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(emulator.pid), '/T', '/F'], { stdio: 'ignore' }); else emulator.kill('SIGINT'); }
process.on('SIGINT', () => { stop(); process.exitCode = 130; }); process.on('SIGTERM', stop);
function run(args, cwd = root) { return new Promise((resolve, reject) => { const child = spawn(node, args, { cwd, env, stdio: 'inherit' }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Check failed (${code}): ${args[0]}`))); }); }
const listening = port => new Promise(resolve => { const socket = createConnection({ host: '127.0.0.1', port }); socket.once('connect', () => { socket.destroy(); resolve(true); }); socket.once('error', () => resolve(false)); });
try {
  if (!process.argv.includes('--reuse-emulators')) {
    if ((await Promise.all([9199, 8180, 5101].map(listening))).some(Boolean)) throw new Error('Emulator ports already occupied. Stop your process or explicitly pass --reuse-emulators for the known demo suite.');
    emulator = spawn(node, ['-r', './tools/auth-emulator/quiet.cjs', './tools/auth-emulator/node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:start', '--only', 'auth,firestore,functions', '--project', 'demo-gajaham-web'], { cwd: root, env, stdio: 'ignore' });
    emulator.on('error', () => { process.exitCode = 1; });
    for (let i = 0; i < 90; i++) { if ((await Promise.all([9199, 8180, 5101].map(listening))).every(Boolean)) break; if (emulator.exitCode !== null) throw new Error('Emulator startup failed; check Java21+, CLI installation and ports.'); await new Promise(r => setTimeout(r, 1000)); }
  }
  if (!(await Promise.all([9199, 8180, 5101].map(listening))).every(Boolean)) throw new Error('Demo emulator suite unavailable.');
  await run(['--test', 'tests/unit.test.mjs', 'tests/rules.test.mjs'], root + 'app-web');
  await run(['--test', 'tests/integration.test.mjs'], root + 'functions');
  await run(['node_modules/@playwright/test/cli.js', 'test'], root + 'app-web');
  await run(['app-web/scripts/check-production.mjs']);
  console.log('WEB-01 local checks passed. Production/Galaxy verification remains separate.');
} catch (error) { console.error(error.message); process.exitCode = 1; } finally { stop(); }
