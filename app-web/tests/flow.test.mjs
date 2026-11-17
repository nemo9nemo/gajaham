import test from 'node:test';
import assert from 'node:assert/strict';
import { transferRows } from '../src/transfer.mjs';
const record = { name: '가상 장소', address: '가상 주소', sourceUrl: '', memo: '', menu: '', category: 'cafe', visited: false };
const rows = n => Array.from({ length: n }, () => ({ ...record, id: crypto.randomUUID(), revision: 1 }));
const options = data => ({ uid: 'test-account', rows: data, confirmedDuplicates: new Set(), current: () => true, stopping: () => false, requestId: row => row.id, create: async () => ({}), remove: async () => true, rearm: async () => false, progress() {}, yieldBatch: async () => {} });

test('transfer: 150 rows pause at a rate limit, retain request identity and resume only remaining rows', async () => {
  const original = rows(150); const remaining = new Map(original.map(row => [row.id, row])); const attempts = []; let limited = true;
  const setup = options(original);
  setup.create = async (uid, payload) => { assert.equal(uid, setup.uid); attempts.push(payload.requestId); if (limited && attempts.length === 121) throw Object.assign(new Error(), { code: 'resource-exhausted', reason: 'rate-limited', retryAt: 1000 }); return {}; };
  setup.remove = async id => remaining.delete(id);
  const first = await transferRows(setup);
  assert.equal(first.paused, true); assert.equal(first.moved, 120); assert.equal(attempts.length, 121); assert.equal(remaining.size, 30);
  limited = false; setup.rows = [...remaining.values()];
  const second = await transferRows(setup);
  assert.equal(second.moved, 30); assert.equal(second.paused, false); assert.equal(remaining.size, 0); assert.equal(attempts[120], attempts[121]);
});

test('transfer: permanent limits and repeated unavailable responses bound requests without discarding originals', async () => {
  for (const reason of ['record-limit', 'storage-limit', 'operation-limit']) {
    let calls = 0; const setup = options(rows(150)); setup.create = async () => { calls++; throw Object.assign(new Error(), { code: 'resource-exhausted', reason }); }; setup.remove = async () => assert.fail('Failure must keep the guest original');
    const result = await transferRows(setup); assert.equal(calls, 1); assert.equal(result.error.reason, reason); assert.equal(result.paused, true);
  }
  let calls = 0; const setup = options(rows(150)); setup.create = async () => { calls++; throw Object.assign(new Error(), { code: 'unavailable' }); }; setup.remove = async () => assert.fail('Unavailable request must keep the original');
  assert.equal((await transferRows(setup)).paused, true); assert.equal(calls, 2);
});

test('transfer: stop awaits the in-flight acknowledgement; changed sessions neither remove nor continue', async () => {
  let stop = false; let removed = 0; const setup = options(rows(20)); setup.stopping = () => stop;
  setup.create = async () => { stop = true; return {}; }; setup.remove = async () => { removed++; return true; };
  const result = await transferRows(setup); assert.equal(result.attempted, 1); assert.equal(removed, 1); assert.equal(result.paused, true);
  let same = true; setup.current = () => same; setup.stopping = () => false;
  setup.create = async () => { same = false; return {}; }; setup.remove = async () => assert.fail('Stale session must not clean up guest data');
  assert.equal((await transferRows(setup)).attempted, 0);
});

test('transfer: numeric DOMException timeout/network errors stop after two attempts and preserve every original', async () => {
  for (const name of ['AbortError', 'TimeoutError', 'NetworkError']) {
    let calls = 0; const setup = options(rows(150)); setup.create = async () => { calls++; throw new DOMException('Synthetic transport failure', name); }; setup.remove = async () => assert.fail('Timed-out requests must preserve originals');
    const result = await transferRows(setup); assert.equal(calls, 2); assert.equal(result.paused, true); assert.equal(result.failed, 2); assert.equal(result.attempted, 2);
  }
});

test('transfer: confirmed duplicates are retained and skipped on resume, lost responses reuse the same ID', async () => {
  const data = rows(3); const setup = options(data); const calls = [];
  setup.create = async (_uid, payload) => { calls.push(payload.requestId); if (payload.requestId === data[0].id) return { duplicate: true }; throw Object.assign(new Error(), { code: 'unavailable' }); };
  setup.remove = async () => assert.fail('Duplicates and lost replies must keep originals');
  assert.equal((await transferRows(setup)).paused, true); assert.equal(setup.confirmedDuplicates.has(data[0].id), true);
  calls.length = 0; await transferRows(setup); assert.deepEqual(calls, [data[1].id, data[2].id]);
});
