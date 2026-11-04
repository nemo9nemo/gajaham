import { normalizeInput, id, revision, bytes, fail, MAX_RECORDS, MAX_CREATE_REQUESTS, MAX_BYTES, TRASH_MS } from './domain.mjs';
const request = value => new Promise((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error); });
let database;
async function open() {
  if (database) return database;
  const opening = indexedDB.open('gajaham-web-guest', 2);
  opening.onupgradeneeded = () => {
    if (!opening.result.objectStoreNames.contains('records')) { const store = opening.result.createObjectStore('records', { keyPath: 'id' }); store.createIndex('sourceKey', 'sourceKey', { unique: true }); }
    opening.result.createObjectStore('removedRequests', { keyPath: 'id' });
  };
  database = await request(opening); database.onversionchange = () => { database.close(); database = null; }; return database;
}
async function transaction(callback) {
  const db = await open(); const tx = db.transaction(['records', 'removedRequests'], 'readwrite');
  const done = new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onabort = () => reject(tx.error ?? new Error('저장하지 못했어요.')); tx.onerror = () => {}; });
  try { const result = await callback(tx.objectStore('records'), tx.objectStore('removedRequests')); await done; return result; }
  catch (error) { try { tx.abort(); } catch {} await done.catch(() => {}); throw error; }
}
export async function allGuest() {
  return transaction(async (store, removed) => {
    const rows = await request(store.getAll()); const kept = [];
    for (const row of rows) { if (row.state === 'trash' && Date.now() - row.deletedAt >= TRASH_MS) { removed.put({ id: row.id }); store.delete(row.id); } else kept.push(row); }
    return kept;
  });
}
export async function createGuest(input, requestId) {
  id(requestId);
  const normalized = normalizeInput(input);
  return transaction(async (store, removed) => {
    const receipt = await request(removed.get(requestId));
    if (receipt?.duplicateOf) {
      const target = await request(store.get(receipt.duplicateOf));
      if (!target) fail('failed-precondition', '이전 요청의 기록은 삭제됐어요. 새로 시작해 주세요.');
      if (target.canonicalSource !== normalized.canonicalSource) fail('already-exists', '다른 링크는 새 저장 요청으로 시작해 주세요.');
      return { duplicate: true };
    }
    if (receipt) fail('failed-precondition', '이미 삭제하거나 계정으로 옮긴 요청이에요. 새로 시작해 주세요.');
    const rows = await request(store.getAll()); const old = rows.find(row => row.id === requestId);
    if (old) return { record: old, duplicate: false };
    if (rows.length + await request(removed.count()) >= MAX_CREATE_REQUESTS) fail('resource-exhausted', '브라우저의 누적 저장 요청 한도에 도달했어요.');
    const duplicate = normalized.canonicalSource && rows.find(row => row.canonicalSource === normalized.canonicalSource);
    if (duplicate) { removed.put({ id: requestId, duplicateOf: duplicate.id }); return { duplicate: true }; }
    const row = { id: requestId, ...normalized, sourceKey: normalized.canonicalSource || `manual:${requestId}`, state: normalized.name && normalized.address ? 'saved' : 'inbox', deletedAt: null, createdAt: Date.now(), updatedAt: Date.now(), revision: 1 };
    if (rows.length >= MAX_RECORDS || rows.reduce((sum, r) => sum + bytes(r), 0) + bytes(row) > MAX_BYTES) fail('resource-exhausted', '보관 한도에 도달했어요.');
    store.add(row); return { record: row, duplicate: false };
  });
}
export async function mutateGuest(action, data) {
  if (!['update', 'trash', 'restore', 'remove'].includes(action)) fail('invalid-argument', '지원하지 않는 요청이에요.');
  id(data.id); revision(data.revision);
  return transaction(async (store, removed) => {
    const rows = await request(store.getAll()); const old = rows.find(row => row.id === data.id);
    if (!old) fail('not-found', '기록을 찾을 수 없어요.');
    if (old.revision !== data.revision) fail('aborted', '다른 탭에서 기록이 변경됐어요.');
    if (action === 'remove') { if (old.state !== 'trash') fail('failed-precondition', '휴지통 기록만 지울 수 있어요.'); removed.put({ id: old.id }); store.delete(old.id); return; }
    if (action === 'restore' && (old.state !== 'trash' || Date.now() - old.deletedAt >= TRASH_MS)) fail('failed-precondition', '복원할 수 없는 기록이에요.');
    const input = action === 'update' ? normalizeInput(data.record) : null;
    if (action === 'update' && (old.state === 'trash' || input.sourceUrl !== old.sourceUrl)) fail('failed-precondition', '현재 기록은 수정할 수 없어요.');
    const row = { ...old, ...(input ?? {}), revision: old.revision + 1, updatedAt: Date.now() };
    if (action === 'trash') { row.state = 'trash'; row.deletedAt = Date.now(); }
    else { row.state = row.name && row.address ? 'saved' : 'inbox'; row.deletedAt = null; }
    if (rows.reduce((sum, r) => sum + bytes(r), 0) - bytes(old) + bytes(row) > MAX_BYTES) fail('resource-exhausted', '보관 용량을 초과했어요.');
    store.put(row);
  });
}
export async function removeTransferredGuest(id, expectedRevision) {
  return transaction(async (store, removed) => { const row = await request(store.get(id)); if (!row) return true; if (row.revision !== expectedRevision) return false; removed.put({ id }); store.delete(id); return true; });
}
