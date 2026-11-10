import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { normalizeUrl, normalizeInput, editableInput, escaped, TRASH_MS } from '../src/domain.mjs';
import { allGuest, createGuest, mutateGuest, removeTransferredGuest } from '../src/guest.mjs';
const record = { sourceUrl: '', name: '가상 장소', address: '가상 주소', category: 'cafe', memo: '', menu: '', visited: false };
test('guest v1 data survives v2 upgrade and permanently removed requests stay removed', async () => {
  const rid = crypto.randomUUID();
  await new Promise((resolve, reject) => {
    const opening = indexedDB.open('gajaham-web-guest', 1);
    opening.onupgradeneeded = () => { const store = opening.result.createObjectStore('records', { keyPath: 'id' }); store.createIndex('sourceKey', 'sourceKey', { unique: true }); };
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => { const db = opening.result; const tx = db.transaction('records', 'readwrite'); tx.objectStore('records').add({ ...normalizeInput(record), id: rid, sourceKey: `manual:${rid}`, state: 'saved', revision: 1, createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null }); tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error); };
  });
  assert.equal((await allGuest()).find(r => r.id === rid).name, record.name);
  await mutateGuest('trash', { id: rid, revision: 1 }); await mutateGuest('remove', { id: rid, revision: 2 });
  await assert.rejects(createGuest(record, rid), { code: 'failed-precondition' }); assert.equal((await allGuest()).length, 0);
});
test('rejects executable URLs, credentials, unknown owner, invalid fields', () => {
  for (const sourceUrl of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'https://u:p@example.org']) assert.throws(() => normalizeInput({ ...record, sourceUrl }));
  for (const extra of [{ uid: 'other' }, { canonicalSource: 'forged' }, { visited: 'true' }, { memo: '가'.repeat(2001) }, { category: '__proto__' }]) assert.throws(() => normalizeInput({ ...record, ...extra }));
  assert.throws(() => normalizeInput({ name: '주소 없음' }));
  assert.equal(escaped('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('canonicalizes only known Instagram posts and preserves other URL semantics', () => {
  assert.equal(normalizeUrl('https://m.instagram.com/reels/ABC_1/?igsh=a').canonicalSource, 'https://www.instagram.com/reel/ABC_1/');
  assert.notEqual(normalizeUrl('https://instagram.com:444/p/A/?x=1').canonicalSource, normalizeUrl('https://instagram.com/p/A/').canonicalSource);
  assert.notEqual(normalizeUrl('https://example.org/?a=1').canonicalSource, normalizeUrl('https://example.org/?a=2').canonicalSource);
  assert.deepEqual(normalizeInput(editableInput(record)), normalizeInput(record));
});
test('guest IndexedDB commits, detects duplicates/conflicts, and preserves edited transfer source', async () => {
  const rid = crypto.randomUUID(); const input = { ...record, sourceUrl: 'https://www.instagram.com/p/LOCAL_GUEST/?a=1' };
  const first = await createGuest(input, rid); assert.equal(first.record.revision, 1);
  const duplicateId = crypto.randomUUID();
  assert.equal((await createGuest({ ...input, sourceUrl: 'https://instagram.com/p/LOCAL_GUEST/?b=2' }, duplicateId)).duplicate, true);
  assert.equal((await createGuest(input, duplicateId)).duplicate, true);
  await assert.rejects(createGuest({ ...input, sourceUrl: 'https://example.invalid/changed' }, duplicateId), { code: 'already-exists' });
  await mutateGuest('update', { id: rid, revision: 1, record: { ...input, memo: '편집 기록' } });
  await assert.rejects(mutateGuest('update', { id: rid, revision: 1, record: input }), { code: 'aborted' });
  assert.equal(await removeTransferredGuest(rid, 1), false);
  const loaded = (await allGuest()).find(r => r.id === rid); assert.equal(loaded.memo, '편집 기록');
  await mutateGuest('trash', { id: rid, revision: 2 });
  await mutateGuest('restore', { id: rid, revision: 3 });
  assert.equal((await allGuest()).find(r => r.id === rid).state, 'saved');
  assert.equal(await removeTransferredGuest(rid, 4), true);
  await assert.rejects(createGuest(input, rid), { code: 'failed-precondition' });
  await assert.rejects(createGuest(input, duplicateId), { code: 'failed-precondition' });
  assert.equal((await allGuest()).length, 0);
});
test('expired trash is purged on read without uploading anything', async () => {
  const rid = crypto.randomUUID(); await createGuest(record, rid); await mutateGuest('trash', { id: rid, revision: 1 });
  const realNow = Date.now; Date.now = () => realNow() + TRASH_MS + 1000;
  try { assert.equal((await allGuest()).length, 0); await assert.rejects(createGuest(record, rid), { code: 'failed-precondition' }); } finally { Date.now = realNow; }
});
