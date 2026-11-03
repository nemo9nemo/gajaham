import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createService } from '../src/service.mjs';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8180' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9199' || process.env.GCLOUD_PROJECT !== 'demo-gajaham-web') throw new Error('Only isolated demo emulators are allowed.');
const app = initializeApp({ projectId: 'demo-gajaham-web' }); const db = getFirestore(app); const auth = getAuth(app);
const service = createService({ db, auth }); const uid = `test-${crypto.randomUUID()}`; const uidB = `test-${crypto.randomUUID()}`;
const input = { sourceUrl: '', name: '가상 장소', address: '가상 주소', category: 'food', memo: '', menu: '', visited: false };
const call = (user, action, data = {}) => service.handle(user, Date.now() / 1000, action, data);
const receipt = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
after(async () => { for (const user of [uid, uidB]) { await db.recursiveDelete(db.doc(`users/${user}`)); await db.doc(`apiLimits/${user}`).delete(); await auth.deleteUser(user).catch(() => {}); } await deleteApp(app); });
test('UID isolation, strict inputs, race-safe duplicates, revision conflict, idempotent write', async () => {
  const rid = crypto.randomUUID(); const created = await call(uid, 'create', { requestId: rid, record: input });
  assert.equal(created.record.revision, 1); assert.equal((await call(uidB, 'list')).items.length, 0);
  await assert.rejects(call(uidB, 'update', { id: rid, revision: 1, requestId: crypto.randomUUID(), record: input }), { code: 'not-found' });
  await assert.rejects(call(uid, 'create', { requestId: crypto.randomUUID(), record: { ...input, uid: uidB } }), { code: 'invalid-argument' });
  const linked = { ...input, sourceUrl: 'https://instagram.com/p/INTEGRATION/' };
  const results = await Promise.all([1, 2].map(() => call(uid, 'create', { requestId: crypto.randomUUID(), record: linked })));
  assert.equal(results.filter(r => r.duplicate).length, 1);
  const payload = { id: rid, revision: 1, requestId: crypto.randomUUID(), record: { ...input, memo: '<script>safe text</script>' } };
  const updated = await call(uid, 'update', payload); assert.equal(updated.record.revision, 2);
  assert.equal((await call(uid, 'update', payload)).record.revision, 2);
  await assert.rejects(call(uid, 'update', { ...payload, requestId: crypto.randomUUID() }), { code: 'aborted' });
  assert.equal((await call(uid, 'list')).items.find(r => r.id === rid).memo, '<script>safe text</script>');
  await call(uid, 'trash', { id: rid, revision: 2, requestId: crypto.randomUUID() });
  await call(uid, 'restore', { id: rid, revision: 3, requestId: crypto.randomUUID() });
  assert.equal((await call(uid, 'list')).items.find(r => r.id === rid).revision, 4);
});
test('server caps and persistent deletion fence, retry cleanup with no record resurrection', async () => {
  await db.doc(`users/${uidB}`).update({ count: 5000 });
  await assert.rejects(call(uidB, 'create', { requestId: crypto.randomUUID(), record: input }), { code: 'resource-exhausted' });
  await auth.createUser({ uid: uidB });
  await assert.rejects(service.handle(uidB, Date.now() / 1000 - 600, 'startDeletion', { receipt }), { code: 'failed-precondition' });
  assert.equal((await call(uidB, 'startDeletion', { receipt })).state, 'deleting');
  await assert.rejects(call(uidB, 'create', { requestId: crypto.randomUUID(), record: input }), { code: 'failed-precondition' });
  await service.finishDeletion(uidB); await service.finishDeletion(uidB);
  assert.equal((await service.deletionStatus({ receipt })).state, 'deleted');
  assert.equal((await service.deletionStatus({ receipt: 'f'.repeat(64) })).state, 'unknown');
  assert.equal((await db.doc(`users/${uidB}`).collection('records').get()).size, 0);
  await assert.rejects(auth.getUser(uidB), { code: 'auth/user-not-found' });
  await assert.rejects(call(uidB, 'list'), { code: 'failed-precondition' });
});
test('HTTP token verification rejects disabled and expired sessions', async () => {
  const response = await fetch('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-local-key', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `security-${crypto.randomUUID()}@example.invalid`, password: 'EmulatorOnlyPassword123', returnSecureToken: true }) });
  const { idToken, localId } = await response.json(); assert.equal(response.status, 200);
  const post = token => fetch('http://127.0.0.1:5101/demo-gajaham-web/asia-northeast3/personalApi', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ data: { action: 'list', payload: {} } }) });
  try {
    assert.equal((await post(idToken)).status, 200);
    const parts = idToken.split('.'); const claims = JSON.parse(Buffer.from(parts[1], 'base64url')); claims.exp = 1;
    parts[1] = Buffer.from(JSON.stringify(claims)).toString('base64url'); assert.equal((await post(parts.join('.'))).status, 401);
    await auth.updateUser(localId, { disabled: true }); assert.equal((await post(idToken)).status, 401);
  } finally { await auth.deleteUser(localId); await db.recursiveDelete(db.doc(`users/${localId}`)); await db.doc(`apiLimits/${localId}`).delete(); }
});
