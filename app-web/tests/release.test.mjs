import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { prepare } from '../scripts/prepare-release.mjs';
import { verifyRelease } from '../scripts/verify-release.mjs';
import { validateRelease, validatePublic, deploymentConfigs, contactLink, toEnv, fromEnv, containsPrivateKeyMaterial } from '../scripts/release-config.mjs';
import { privacyContent } from '../src/privacy-content.mjs';
const config = { apiKey: 'AIza' + 'a'.repeat(35), projectId: 'gajaham-fixture', authDomain: 'gajaham-fixture.firebaseapp.com', appId: '1:123456789:web:abc123', appCheckKey: 'fixture-site-key', origin: 'https://gajaham-fixture.web.app', apiOrigin: 'https://gajaham-fixture-api.fixture.workers.dev', contact: 'https://gajaham-fixture.web.app/contact', operatorName: '가상 운영자', policyDate: '2026-11-10', processingNotice: '가상 처리 조건. 실제 운영 정보가 아님.', projectNumber: '123456789', workerName: 'gajaham-fixture-api', databaseName: 'gajaham-fixture', databaseId: '12345678-1234-4234-8234-123456789012', privacyReviewed: true };
test('release: rejects incomplete/unsafe public settings and inconsistent projects without echoing values', () => {
  assert.ok(validateRelease({}).length); assert.deepEqual(validateRelease(config), []);
  for (const changes of [{ projectNumber: '987654321' }, { authDomain: 'other.firebaseapp.com' }, { origin: 'https://other.web.app' }, { apiOrigin: 'http://localhost:8787' }, { apiOrigin: 'https://trusted.example@evil.workers.dev' }, { workerName: 'different-worker' }, { databaseId: '00000000-0000-4000-8000-000000000000' }, { contact: 'test@gmail.com' }, { contact: 'a@example.invalid' }, { contact: 'name@example.com?subject=attack' }, { policyDate: '2026-02-30' }, { processingNotice: '' }, { operatorName: '' }, { privacyReviewed: false }, { FIREBASE_ADMIN_CREDENTIALS: 'private-test-value' }]) {
    const errors = validateRelease({ ...config, ...changes }); assert.ok(errors.length, JSON.stringify(Object.keys(changes))); assert.ok(!errors.join().includes('private-test-value'));
  }
  assert.ok(validatePublic({ ...config, processingNotice: '-----BEGIN PRIVATE KEY-----' }).length);
  assert.ok(validateRelease({ ...config, apiKey: 'eyJfake.payload.signature' }).length);
  assert.ok(validateRelease({ ...config, appCheckKey: 'ya29.private-test-value' }).length);
  assert.equal(contactLink('javascript:alert(1)'), ''); assert.equal(contactLink('https://username:password@example.com'), '');
  assert.equal(contactLink('a@example.invalid\r\nBcc:secret'), '');
  assert.equal(fromEnv(toEnv(config)).operatorName, config.operatorName);
  assert.equal(containsPrivateKeyMaterial('const header = "-----BEGIN PRIVATE KEY-----";'), false);
  assert.equal(containsPrivateKeyMaterial('-----BEGIN PRIVATE KEY-----\n' + 'A'.repeat(64)), true);
  assert.equal(containsPrivateKeyMaterial('-----BEGIN PRIVATE KEY-----\\n' + 'A'.repeat(64)), true);
});
test('release: generates matched Hosting/CSP/Worker/D1 settings with no paid/default emulator deploy', async () => {
  const hosting = JSON.parse(await readFile(new URL('../../firebase.json', import.meta.url), 'utf8'));
  const worker = JSON.parse(await readFile(new URL('../../worker/wrangler.jsonc', import.meta.url), 'utf8'));
  const result = deploymentConfigs(config, hosting, worker);
  assert.ok(!result.firebase.functions && !result.firebase.firestore && !result.firebase.emulators);
  assert.equal(result.firebase.hosting.public, 'hosting'); assert.ok(!result.firebase.hosting.predeploy);
  const csp = result.firebase.hosting.headers.flatMap(group => group.headers).find(header => header.key === 'Content-Security-Policy').value;
  assert.ok(csp.includes(config.apiOrigin)); assert.ok(!csp.includes('configure-before-use') && !csp.includes('*.workers.dev'));
  assert.equal(result.worker.vars.WEB_ORIGIN, config.origin); assert.equal(result.worker.vars.FIREBASE_PROJECT_ID, config.projectId); assert.equal(result.worker.vars.FIREBASE_APP_ID, config.appId);
  assert.equal(result.worker.d1_databases[0].database_id, config.databaseId); assert.equal(result.worker.main, 'worker/index.js');
  assert.ok(!JSON.stringify(result).includes('private_key'));
  const safe = deploymentConfigs(config, { ...hosting, storage: { rules: 'private.rules' }, functions: {} }, { ...worker, r2_buckets: [{ binding: 'NOT_ALLOWED' }], observability: { enabled: true } });
  assert.ok(!safe.firebase.storage && !safe.firebase.functions && !safe.worker.r2_buckets); assert.equal(safe.worker.observability.enabled, false);
});
test('privacy: public draft is explicit, contact/identity/notice escape markup and preserve retention', () => {
  const draft = privacyContent({}); assert.ok(draft.includes('안내 초안') && draft.includes('등록 준비 중'));
  const content = privacyContent({ ...config, operatorName: '<img src=x onerror=attack()>', processingNotice: '<script>attack()</script>' });
  assert.ok(!content.includes('<img') && !content.includes('<script>')); assert.ok(content.includes('&lt;script&gt;'));
  for (const marker of ['Cloudflare', 'Firebase', '30일', '7일', '2일', '처리 정지', '계정 탈퇴']) assert.ok(content.includes(marker));
  assert.ok(!privacyContent({ contact: 'javascript:alert(1)' }).includes('href="javascript:'));
});
test('release: builds a separate reviewable bundle, hashes files and never deploys or includes credentials/maps', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url)); const name = `tmp/codex/WEB-03-fixture-${crypto.randomUUID()}.json`;
  await mkdir(join(root, 'tmp/codex'), { recursive: true });
  await assert.rejects(prepare('release.config.example.json'));
  await writeFile(join(root, name), JSON.stringify(config));
  const output = resolve(root, await prepare(name));
  const manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.status, 'BUILT_NOT_DEPLOYED'); assert.equal(manifest.billingVerified, false); assert.equal(manifest.operatingChecksPassed, false);
  assert.ok(manifest.files.some(row => row.file === 'hosting/privacy/index.html'));
  for (const row of manifest.files) {
    assert.ok(!/\.map$|\.env|\.dev\.vars|node_modules/.test(row.file));
    const content = await readFile(join(output, row.file)); assert.equal(createHash('sha256').update(content).digest('hex'), row.sha256);
  }
  assert.deepEqual(await readdir(join(output, 'worker')), ['index.js']);
  const source = await readFile(join(output, 'worker/index.js'), 'utf8');
  for (const marker of ['sourceMappingURL=', 'Bearer owner', '127.0.0.1:9199', 'demo-gajaham']) assert.ok(!source.includes(marker));
  const generated = JSON.parse(await readFile(join(output, 'wrangler.jsonc'), 'utf8')); assert.equal(generated.vars.WEB_ORIGIN, config.origin);
  const checked = await verifyRelease(output); assert.equal(checked.files, manifest.files.length);
  assert.equal(checked.operatingChecksPassed, false); assert.equal(checked.status, 'BUILT_NOT_DEPLOYED');
  await verifyRelease(output, checked.manifestSha256);
  await assert.rejects(verifyRelease(output, '0'.repeat(64)));
  const workerFile = join(output, 'worker/index.js');
  await writeFile(workerFile, source + '\n// changed'); await assert.rejects(verifyRelease(output)); await writeFile(workerFile, source);
  const manifestFile = join(output, 'manifest.json'); const originalManifest = await readFile(manifestFile, 'utf8');
  const escaped = structuredClone(manifest); escaped.files[0].file = '../outside';
  await writeFile(manifestFile, JSON.stringify(escaped)); await assert.rejects(verifyRelease(output));
  const duplicated = structuredClone(manifest); duplicated.files.push(duplicated.files[0]);
  await writeFile(manifestFile, JSON.stringify(duplicated)); await assert.rejects(verifyRelease(output));
  await writeFile(manifestFile, originalManifest);
  const extra = join(output, 'hosting/extra.js'); await writeFile(extra, 'unexpected'); await assert.rejects(verifyRelease(output)); await rm(extra);
  const privacy = join(output, 'hosting/privacy/index.html'); const privacyHtml = await readFile(privacy); await rm(privacy); await assert.rejects(verifyRelease(output)); await writeFile(privacy, privacyHtml);
  const wrongProject = JSON.stringify({ projects: { default: 'other-project' } }); const originalProject = await readFile(join(output, '.firebaserc'));
  await writeFile(join(output, '.firebaserc'), wrongProject); const changedManifest = structuredClone(manifest);
  changedManifest.files.find(row => row.file === '.firebaserc').sha256 = createHash('sha256').update(wrongProject).digest('hex');
  await writeFile(manifestFile, JSON.stringify(changedManifest)); await assert.rejects(verifyRelease(output));
  await writeFile(join(output, '.firebaserc'), originalProject); await writeFile(manifestFile, originalManifest);
  await verifyRelease(output, checked.manifestSha256);
});
