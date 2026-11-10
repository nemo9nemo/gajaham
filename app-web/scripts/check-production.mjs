import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { toEnv } from './release-config.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { cwd: root + 'app-web', env: { ...process.env, ...toEnv({ apiKey: 'public-test-api-key', projectId: 'gajaham-production-check', authDomain: 'gajaham-production-check.firebaseapp.com', appId: 'public-test-app-id', appCheckKey: 'public-test-site-key', origin: 'https://gajaham-production-check.web.app', apiOrigin: 'https://gajaham-production-check.fixture.workers.dev' }) }, stdio: 'inherit' });
assert.equal(result.status, 0);
assert.ok((await readFile(root + 'app-web/dist/privacy/index.html', 'utf8')).includes('개인정보와 탈퇴 안내'));
for (const file of await readdir(root + 'app-web/dist/assets')) {
  assert.ok(!file.endsWith('.map'));
  const contents = await readFile(root + 'app-web/dist/assets/' + file, 'utf8');
  for (const marker of ['demo-gajaham-web', '127.0.0.1:9199', '127.0.0.1:8787', 'cloudfunctions.net/personalApi', 'connectAuthEmulator']) assert.ok(!contents.includes(marker), `Emulator/legacy marker in production asset: ${marker}`);
}
const config = JSON.parse(await readFile(root + 'firebase.json', 'utf8'));
assert.ok(!config.functions && !config.firestore, 'Paid Functions/Firestore deployment removed from current configuration');
const headers = Object.fromEntries(config.hosting.headers.find(h => h.source === '**').headers.map(h => [h.key, h.value]));
assert.equal(headers['X-Content-Type-Options'], 'nosniff'); assert.equal(headers['X-Frame-Options'], 'DENY');
for (const value of ["object-src 'none'", "frame-ancestors 'none'", "base-uri 'none'"]) assert.ok(headers['Content-Security-Policy'].includes(value));
assert.ok(!headers['Content-Security-Policy'].includes("'unsafe-eval'"));
assert.ok(!headers['Content-Security-Policy'].includes('https://*.workers.dev'));
console.log('Production bundle excludes demo connections; hosting header configuration checked (live hosting unverified).');
