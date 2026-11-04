import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { createService } from './service.mjs';
import { DomainError, object } from './domain.mjs';

initializeApp();
setGlobalOptions({ region: 'asia-northeast3', maxInstances: 2, memory: '256MiB', timeoutSeconds: 120 });
const auth = getAuth(); const db = getFirestore(); const service = createService({ db, auth });

export const personalApi = onCall({ enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true', concurrency: 20 }, async request => {
  try {
    object(request.data, ['action', 'payload']);
    // A 256-bit receipt exposes only deletion state after the Auth account is gone.
    // Production App Check still applies. No UID, record or identity is returned.
    if (request.data.action === 'deletionStatus') return await service.deletionStatus(request.data.payload);
    const header = request.rawRequest.headers.authorization ?? '';
    if (!header.startsWith('Bearer ') || !request.auth) throw new HttpsError('unauthenticated', '다시 로그인해 주세요.');
    const token = await auth.verifyIdToken(header.slice(7), true);
    if (token.uid !== request.auth.uid) throw new HttpsError('unauthenticated', '다시 로그인해 주세요.');
    const user = await auth.getUser(token.uid);
    if (user.disabled) throw new HttpsError('unauthenticated', '다시 로그인해 주세요.');
    return await service.handle(token.uid, token.auth_time, request.data.action, request.data.payload ?? {});
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof DomainError) throw new HttpsError(error.code, error.message, error.details);
    if (typeof error.code === 'string' && error.code.startsWith('auth/')) throw new HttpsError('unauthenticated', '다시 로그인해 주세요.');
    // Do not emit request bodies, email, token, UID, or upstream error details.
    throw new HttpsError('unavailable', '연결을 확인한 뒤 다시 시도해 주세요.');
  }
});

export const deleteAccountRecords = onDocumentWritten({ document: 'users/{uid}', retry: true, concurrency: 2 }, async event => {
  if (event.data?.after.data()?.state !== 'deleting') return;
  await service.finishDeletion(event.params.uid);
});
