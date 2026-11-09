import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, exportPKCS8, createLocalJWKSet, SignJWT } from 'jose';
import { tokenVerifier, firebaseAdmin, requireCurrent } from '../src/auth.mjs';
const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
const jwk = { ...await exportJWK(publicKey), kid: 'offline-test', alg: 'RS256', use: 'sig' };
const keys = createLocalJWKSet({ keys: [jwk] });
const env = { FIREBASE_PROJECT_ID: 'test-project', FIREBASE_PROJECT_NUMBER: '123456789', FIREBASE_APP_ID: '1:123456789:web:test' };
const verifier = tokenVerifier(env, { auth: keys, check: keys });
const sign = (claims = {}, check = false, header = {}) => new SignJWT({ auth_time: Math.floor(Date.now() / 1000), ...claims }).setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'offline-test', ...header }).setIssuer(check ? 'https://firebaseappcheck.googleapis.com/123456789' : 'https://securetoken.google.com/test-project').setAudience(check ? 'projects/123456789' : 'test-project').setSubject(check ? env.FIREBASE_APP_ID : 'test-user').setIssuedAt().setExpirationTime('1h').sign(privateKey);
test('production verifier checks RS256 signature, expiry, issuer, audience, app ID and claims', async () => {
  const token = await sign(); assert.equal((await verifier.auth(token)).uid, 'test-user'); await verifier.check(await sign({}, true));
  const parts = token.split('.'); parts[1] = Buffer.from(JSON.stringify({ sub: 'other-user' })).toString('base64url');
  await assert.rejects(verifier.auth(parts.join('.')), { code: 'unauthenticated' });
  await assert.rejects(verifier.auth(await sign({ auth_time: Date.now() / 1000 + 600 })), { code: 'unauthenticated' });
  const wrong = new SignJWT({ auth_time: 1 }).setProtectedHeader({ alg: 'RS256', kid: 'offline-test' }).setIssuer('https://evil.invalid').setAudience('other-project').setSubject('test-user').setIssuedAt().setExpirationTime('1h');
  await assert.rejects(verifier.auth(await wrong.sign(privateKey)), { code: 'unauthenticated' });
  const expired = new SignJWT({ auth_time: 1 }).setProtectedHeader({ alg: 'RS256', kid: 'offline-test' }).setIssuer('https://securetoken.google.com/test-project').setAudience('test-project').setSubject('test-user').setIssuedAt(1).setExpirationTime(2);
  await assert.rejects(verifier.auth(await expired.sign(privateKey)), { code: 'unauthenticated' });
  await assert.rejects(verifier.check(await sign({}, true, { typ: 'other' })), { code: 'unauthenticated' });
  await assert.rejects(tokenVerifier({ ...env, FIREBASE_APP_ID: 'other-app' }, { auth: keys, check: keys }).check(await sign({}, true)), { code: 'unauthenticated' });
  await assert.rejects(requireCurrent({ uid: 'test-user', auth_time: 10 }, { async current() { return { validSince: '11' }; } }), { code: 'unauthenticated' });
});
test('Admin OAuth is cached; lookup/delete use server secret; upstream errors do not escape', async () => {
  const credential = JSON.stringify({ project_id: env.FIREBASE_PROJECT_ID, client_email: 'offline-test@example.invalid', private_key: await exportPKCS8(privateKey) });
  const requests = []; let gone = false;
  const admin = firebaseAdmin({ ...env, FIREBASE_ADMIN_CREDENTIALS: credential }, async (url, init) => {
    requests.push({ url, init });
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'offline-secret', expires_in: 3600 });
    if (url.endsWith(':delete')) { gone = true; return Response.json({}); }
    return Response.json({ users: gone ? [] : [{ localId: 'test-user', validSince: '1' }] });
  });
  await requireCurrent({ uid: 'test-user', auth_time: 2 }, admin); await admin.deleteUser('test-user');
  assert.equal(requests.filter(r => r.url.includes('oauth2')).length, 1);
  assert.equal(JSON.parse(requests[1].init.body).localId[0], 'test-user');
  assert.equal(requests[1].init.headers.Authorization, 'Bearer offline-secret');
  await assert.rejects(requireCurrent({ uid: 'test-user', auth_time: 2 }, admin), { code: 'unauthenticated' });
  const broken = firebaseAdmin({ ...env, FIREBASE_ADMIN_CREDENTIALS: credential }, async () => Response.json({ error: 'private detail' }, { status: 403 }));
  await assert.rejects(broken.current('test-user'), error => error.code === 'unavailable' && !error.message.includes('private detail'));
  const timeout = firebaseAdmin({ ...env, FIREBASE_ADMIN_CREDENTIALS: credential }, async (url, init) => { assert.ok(init.signal instanceof AbortSignal); throw new DOMException('upstream private detail', 'TimeoutError'); });
  await assert.rejects(timeout.current('test-user'), error => error.code === 'unavailable' && !error.message.includes('private detail'));
});
