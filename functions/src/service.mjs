import { createHash } from 'node:crypto';
import { Timestamp, FieldPath } from 'firebase-admin/firestore';
import { DomainError, fail, object, normalizeInput, id, revision, bytes, publicRecord, MAX_BYTES, MAX_RECORDS, MAX_CREATE_REQUESTS, TRASH_MS } from './domain.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const fingerprint = value => digest(JSON.stringify(value));
const active = data => { if (data?.state !== 'active') fail('failed-precondition', '계정 삭제가 진행 중이거나 이용할 수 없어요.'); };

export function createService({ db, auth, now = Date.now }) {
  const profileRef = uid => db.collection('users').doc(uid);
  const recordRef = (uid, recordId) => profileRef(uid).collection('records').doc(recordId);
  const removedRef = (uid, recordId) => profileRef(uid).collection('removedRequests').doc(recordId);
  const sourceRef = (uid, canonical) => profileRef(uid).collection('sources').doc(digest(canonical));
  async function profile(uid) {
    const ref = profileRef(uid);
    return db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists) return snap.data();
      const value = { state: 'active', count: 0, createdCount: 0, operationCount: 0, bytes: 0, createdAt: now(), updatedAt: now() };
      tx.create(ref, value); return value;
    });
  }
  async function rateLimit(uid, action) {
    const ref = db.collection('apiLimits').doc(uid); const time = now();
    const cost = 1;
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref); const data = snap.data();
      const units = data && time - data.windowStart < 60000 ? data.units + cost : cost;
      if (units > 120) fail('resource-exhausted', '잠시 쉬었다가 다시 시도해 주세요.');
      tx.set(ref, { windowStart: data && time - data.windowStart < 60000 ? data.windowStart : time, units, purgeAt: Timestamp.fromMillis(time + 2 * 86400000) });
    });
  }
  async function create(uid, data) {
    object(data, ['requestId', 'record']); const requestId = id(data.requestId); const input = normalizeInput(data.record); const hash = fingerprint(input);
    const ref = recordRef(uid, requestId); const user = profileRef(uid); const source = input.canonicalSource ? sourceRef(uid, input.canonicalSource) : null;
    return db.runTransaction(async tx => {
      const [meta, old, existing, removed] = await Promise.all([tx.get(user), tx.get(ref), source ? tx.get(source) : Promise.resolve(null), tx.get(removedRef(uid, requestId))]);
      active(meta.data());
      if (removed.data()?.duplicateOf) {
        const target = await tx.get(recordRef(uid, removed.data().duplicateOf));
        if (!target.exists) fail('failed-precondition', '이전 요청의 대상 기록은 삭제됐어요. 새 저장은 새로 시작해 주세요.', { reason: 'retired-create-request' });
        if (target.data().canonicalSource !== input.canonicalSource) fail('already-exists', '다른 링크는 새 저장 요청으로 시작해 주세요.');
        return { duplicate: true, id: removed.data().duplicateOf };
      }
      if (removed.exists) fail('failed-precondition', '이 저장 요청의 기록은 이미 삭제됐어요. 이전 요청으로 다시 만들 수 없어요.', { reason: 'retired-create-request' });
      if (old.exists) {
        if (old.data().createFingerprint !== hash) fail('already-exists', '같은 요청으로 다른 내용을 저장할 수 없어요.');
        return { record: publicRecord(old.data()), duplicate: false };
      }
      const state = meta.data(); const createdCount = state.createdCount ?? state.count;
      const operationCount = state.operationCount ?? createdCount;
      if (operationCount >= MAX_CREATE_REQUESTS) fail('resource-exhausted', '계정의 누적 저장 요청 한도에 도달했어요. 문의 창구를 이용해 주세요.');
      if (existing?.exists) {
        tx.set(removedRef(uid, requestId), { duplicateOf: existing.data().recordId });
        tx.update(user, { operationCount: operationCount + 1, updatedAt: now() });
        return { duplicate: true, id: existing.data().recordId };
      }
      const value = { id: requestId, ...input, state: input.name && input.address ? 'saved' : 'inbox', deletedAt: null, createdAt: now(), updatedAt: now(), revision: 1, createRequestId: requestId, lastRequestId: requestId, createFingerprint: hash, lastFingerprint: hash };
      const size = bytes(value);
      if (state.count >= MAX_RECORDS || state.bytes + size > MAX_BYTES) fail('resource-exhausted', '보관 한도에 도달했어요. 휴지통을 정리한 뒤 다시 시도해 주세요.');
      tx.create(ref, value); if (source) tx.create(source, { recordId: requestId });
      tx.update(user, { count: state.count + 1, createdCount: createdCount + 1, operationCount: operationCount + 1, bytes: state.bytes + size, updatedAt: now() });
      return { record: publicRecord(value), duplicate: false };
    });
  }
  async function mutate(uid, action, data) {
    object(data, action === 'update' ? ['id', 'revision', 'requestId', 'record'] : ['id', 'revision', 'requestId']);
    const recordId = id(data.id); const requestId = id(data.requestId); const expected = revision(data.revision);
    const input = action === 'update' ? normalizeInput(data.record) : null;
    const hash = fingerprint({ action, recordId, input }); const ref = recordRef(uid, recordId); const user = profileRef(uid);
    return db.runTransaction(async tx => {
      const [meta, snap] = await Promise.all([tx.get(user), tx.get(ref)]); active(meta.data());
      if (!snap.exists) fail('not-found', '삭제됐거나 찾을 수 없는 기록이에요. 새로 불러와 주세요.');
      const old = snap.data();
      if (old.lastRequestId === requestId && old.lastFingerprint === hash) return { record: publicRecord(old) };
      if (old.revision !== expected) fail('aborted', '다른 곳에서 기록이 변경됐어요. 최신 기록을 확인한 뒤 다시 저장해 주세요.');
      if (action === 'update' && (old.state === 'trash' || input.sourceUrl !== old.sourceUrl)) fail('failed-precondition', '휴지통 기록이나 원본 링크는 이 화면에서 수정할 수 없어요.');
      if (action === 'trash' && old.state === 'trash') fail('failed-precondition', '이미 휴지통에 있어요.');
      if (['restore', 'remove'].includes(action) && old.state !== 'trash') fail('failed-precondition', '휴지통의 기록만 처리할 수 있어요.');
      if (action === 'restore' && now() - old.deletedAt >= TRASH_MS) fail('failed-precondition', '복원 기한이 지났어요.');
      if (action === 'remove') {
        tx.set(removedRef(uid, recordId), { removed: true });
        tx.delete(ref); if (old.canonicalSource) tx.delete(sourceRef(uid, old.canonicalSource));
        tx.update(user, { count: Math.max(0, meta.data().count - 1), bytes: Math.max(0, meta.data().bytes - bytes(old)), updatedAt: now() });
        return { removed: recordId };
      }
      const value = { ...old, ...(input ?? {}), revision: old.revision + 1, updatedAt: now(), lastRequestId: requestId, lastFingerprint: hash };
      if (action === 'update' || action === 'restore') { value.state = value.name && value.address ? 'saved' : 'inbox'; value.deletedAt = null; }
      if (action === 'trash') { value.state = 'trash'; value.deletedAt = now(); }
      const total = meta.data().bytes - bytes(old) + bytes(value);
      if (total > MAX_BYTES) fail('resource-exhausted', '보관 용량을 초과했어요. 메모를 줄이거나 휴지통을 정리해 주세요.');
      tx.set(ref, value); tx.update(user, { bytes: total, updatedAt: now() }); return { record: publicRecord(value) };
    });
  }
  async function list(uid, data) {
    object(data, ['cursor']); const cursor = data.cursor === undefined ? '' : id(data.cursor);
    active((await profileRef(uid).get()).data());
    let query = profileRef(uid).collection('records').orderBy(FieldPath.documentId()).limit(200);
    if (cursor) query = query.startAfter(cursor);
    const snaps = await query.get(); active((await profileRef(uid).get()).data());
    const items = [];
    for (const snap of snaps.docs) {
      const value = snap.data();
      if (value.state === 'trash' && now() - value.deletedAt >= TRASH_MS) {
        try { await mutate(uid, 'remove', { id: value.id, revision: value.revision, requestId: crypto.randomUUID() }); } catch (error) { if (!(error instanceof DomainError)) throw error; }
      } else items.push(publicRecord(value));
    }
    return { items, nextCursor: snaps.size === 200 ? snaps.docs.at(-1).id : '' };
  }
  function receiptHash(receipt) {
    if (typeof receipt !== 'string' || !/^[a-f0-9]{64}$/.test(receipt)) fail('invalid-argument', '삭제 확인 정보를 다시 확인해 주세요.');
    return digest(receipt);
  }
  async function deletionStatus(data) {
    object(data, ['receipt']); const ref = db.collection('deletionJobs').doc(receiptHash(data.receipt)); const snap = await ref.get();
    return { state: snap.exists ? snap.data().state : 'unknown' };
  }
  async function startDeletion(uid, authTime, data) {
    object(data, ['receipt']); const hash = receiptHash(data.receipt);
    if (!Number.isFinite(authTime) || Math.abs(now() / 1000 - authTime) > 300) fail('failed-precondition', '최근 비밀번호 확인이 필요해요. 다시 인증해 주세요.');
    const ref = profileRef(uid);
    return db.runTransaction(async tx => {
      const snap = await tx.get(ref); const data = snap.data();
      if (data?.state === 'deleted') return { state: 'deleted' };
      const hashes = data?.deletionReceiptHashes ?? [];
      if (!hashes.includes(hash) && hashes.length >= 8) fail('resource-exhausted', '삭제 확인 요청이 많아요. 기존 요청 탭이나 문의 창구를 이용해 주세요.');
      if (!hashes.includes(hash)) tx.create(db.collection('deletionJobs').doc(hash), { state: 'deleting', requestedAt: now() });
      if (data?.state !== 'deleting') {
        tx.set(ref, { ...(data ?? { count: 0, bytes: 0, createdAt: now() }), state: 'deleting', deletionReceiptHashes: [hash], deletionRequestedAt: now(), updatedAt: now() });
      } else tx.update(ref, { deletionRetryAt: now(), deletionReceiptHashes: hashes.includes(hash) ? hashes : hashes.concat(hash) });
      return { state: 'deleting' };
    });
  }
  async function finishDeletion(uid) {
    const ref = profileRef(uid); const meta = await ref.get();
    if (meta.data()?.state !== 'deleting') return;
    await db.recursiveDelete(ref.collection('records'));
    await db.recursiveDelete(ref.collection('sources'));
    await db.recursiveDelete(ref.collection('removedRequests'));
    try { await auth.deleteUser(uid); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
    await db.collection('apiLimits').doc(uid).delete();
    const completed = { state: 'deleted', deletedAt: now(), purgeAt: Timestamp.fromMillis(now() + 7 * 86400000) };
    await db.runTransaction(async tx => {
      const latest = await tx.get(ref); if (latest.data()?.state !== 'deleting') return;
      tx.set(ref, completed);
      for (const hash of latest.data().deletionReceiptHashes ?? []) tx.set(db.collection('deletionJobs').doc(hash), completed);
    });
  }
  async function handle(uid, authTime, action, data = {}) {
    if (!['list', 'create', 'update', 'trash', 'restore', 'remove', 'startDeletion', 'deletionStatus'].includes(action)) fail('invalid-argument', '지원하지 않는 요청이에요.');
    if (action === 'deletionStatus') return deletionStatus(data);
    const meta = await profile(uid);
    if (action !== 'startDeletion') active(meta);
    await rateLimit(uid, action);
    if (action === 'startDeletion') return startDeletion(uid, authTime, data);
    if (action === 'list') return list(uid, data);
    if (action === 'create') return create(uid, data);
    return mutate(uid, action, data);
  }
  return { handle, finishDeletion, deletionStatus };
}
