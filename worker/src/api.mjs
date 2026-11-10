import { createService } from './service.mjs';
import { DomainError, fail, object } from '../../functions/src/domain.mjs';
import { requireCurrent } from './auth.mjs';

const statuses = { 'invalid-argument': 400, unauthenticated: 401, 'permission-denied': 403, 'not-found': 404, 'already-exists': 409, aborted: 409, 'failed-precondition': 400, 'resource-exhausted': 429, unavailable: 503 };
async function readBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail('invalid-argument', '입력 형식을 확인해 주세요.');
  const reader = request.body?.getReader(); if (!reader) fail('invalid-argument', '입력 항목을 확인해 주세요.');
  const chunks = []; let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 32768) { await reader.cancel(); fail('invalid-argument', '입력 길이를 확인해 주세요.'); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) { if (error instanceof DomainError) throw error; fail('invalid-argument', '입력 형식을 확인해 주세요.'); }
}
export function createApi({ db, auth, verifier, origin }) {
  const service = createService({ db, auth });
  const finish = uid => service.finishDeletion(uid).catch(() => { /* Pending state persists; scheduled retries resume it. No request/identity logging. */ });
  return {
    async fetch(request, context) {
      const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', Vary: 'Origin' };
      const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
      try {
        const suppliedOrigin = request.headers.get('origin');
        if (suppliedOrigin && suppliedOrigin !== origin) fail('permission-denied', '허용되지 않은 접속 주소예요.');
        if (suppliedOrigin === origin) Object.assign(headers, { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'Content-Type, Authorization, X-Firebase-AppCheck' });
        if (new URL(request.url).pathname !== '/personalApi') return respond({ error: { status: 'NOT_FOUND', message: '요청 주소를 확인해 주세요.' } }, 404);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
        if (request.method !== 'POST') return respond({ error: { status: 'INVALID_ARGUMENT', message: '요청 방식을 확인해 주세요.' } }, 405);
        await verifier.check(request.headers.get('x-firebase-appcheck') ?? '');
        const body = await readBody(request); object(body, ['data']); object(body.data, ['action', 'payload']);
        const { action, payload = {} } = body.data;
        if (action === 'deletionStatus') return respond({ result: await service.deletionStatus(payload) });
        const header = request.headers.get('authorization') ?? '';
        if (!header.startsWith('Bearer ')) fail('unauthenticated', '다시 로그인해 주세요.');
        const token = await requireCurrent(await verifier.auth(header.slice(7)), auth);
        const result = await service.handle(token.uid, token.auth_time, action, payload);
        if (action === 'startDeletion') context.waitUntil(finish(token.uid));
        return respond({ result });
      } catch (error) {
        const known = error instanceof DomainError; const code = known ? error.code : error.code === 'auth/user-not-found' ? 'unauthenticated' : 'unavailable';
        return respond({ error: { status: code.toUpperCase().replaceAll('-', '_'), message: known ? error.message : '연결을 확인한 뒤 다시 시도해 주세요.', ...(known && error.details ? { details: error.details } : {}) } }, statuses[code] ?? 503);
      }
    },
    async scheduled() {
      let incomplete = false;
      let pending; try { pending = await db.pending(); } catch { throw new Error('ACCOUNT_CLEANUP_PENDING'); }
      // Continue other jobs when one provider/DB operation fails. A fixed error
      // marks the scheduled event as failed without logging identity or content.
      for (const uid of pending) {
        try { await db.markAttempt(uid); await service.finishDeletion(uid); } catch { incomplete = true; }
      }
      try { await db.expired(Date.now()); } catch { incomplete = true; }
      if (incomplete) throw new Error('ACCOUNT_CLEANUP_PENDING');
    }
  };
}
