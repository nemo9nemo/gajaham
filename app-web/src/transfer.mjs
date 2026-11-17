import { editableInput } from './domain.mjs';
import { errorCode } from './feedback.mjs';

// Only the open dialog owns this session. Record/request identities stay in the
// guest store; this object is neither an account cache nor a durable queue.
export async function transferRows({ rows, uid, confirmedDuplicates, current, stopping, create, remove, rearm, requestId, progress, yieldBatch = () => new Promise(resolve => setTimeout(resolve, 0)) }) {
  const result = { moved: 0, duplicates: 0, failed: 0, attempted: 0, total: rows.length, paused: false, canRetry: false, error: null };
  let consecutiveUnavailable = 0;
  for (const row of rows) {
    if (!current()) return result;
    if (stopping()) { result.paused = true; break; }
    if (confirmedDuplicates.has(row.id)) { result.duplicates++; result.attempted++; progress({ ...result }); continue; }
    const rid = requestId(row, uid);
    try {
      const record = Object.fromEntries(['sourceUrl', 'name', 'address', 'category', 'memo', 'menu', 'visited'].map(key => [key, row[key]]));
      const response = await create(uid, { requestId: rid, record: editableInput(record) });
      if (!current()) return result;
      if (response.duplicate) { confirmedDuplicates.add(row.id); result.duplicates++; }
      else if (await remove(row.id, row.revision, { uid, requestId: rid })) result.moved++;
      else result.failed++;
      consecutiveUnavailable = 0;
    } catch (error) {
      if (!current()) return result;
      result.failed++;
      const code = errorCode(error);
      if (code === 'failed-precondition' && error.reason === 'retired-create-request') {
        try { if (await rearm(row.id, row.revision, uid, rid)) result.canRetry = true; } catch { /* The guest original remains. */ }
      }
      const unavailable = !code || ['unavailable', 'network-request-failed'].includes(code);
      consecutiveUnavailable = unavailable ? consecutiveUnavailable + 1 : 0;
      if (code === 'resource-exhausted' || ['session-changed', 'unauthenticated', 'user-token-expired', 'invalid-user-token', 'user-disabled', 'permission-denied'].includes(code) || (code === 'failed-precondition' && error.reason !== 'retired-create-request') || consecutiveUnavailable >= 2) {
        result.paused = true; result.error = error;
      }
    }
    if (!current()) return result;
    result.attempted++;
    if (stopping()) result.paused = true;
    progress({ ...result });
    if (result.paused) break;
    if (result.attempted % 20 === 0) await yieldBatch();
  }
  return result;
}
