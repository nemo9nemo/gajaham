import { createRemoteJWKSet, jwtVerify, importPKCS8, SignJWT } from 'jose';
import { fail } from '../../functions/src/domain.mjs';

const denied = () => fail('unauthenticated', '다시 로그인해 주세요.');
const unavailable = () => fail('unavailable', '연결을 확인한 뒤 다시 시도해 주세요.');
const authKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const checkKeys = createRemoteJWKSet(new URL('https://firebaseappcheck.googleapis.com/v1/jwks'));
// Injection is for offline signature tests. The production entry always uses Google's keys.
export function tokenVerifier(env, keys = { auth: authKeys, check: checkKeys }) {
  return {
    async auth(token) {
      let payload;
      try { ({ payload } = await jwtVerify(token, keys.auth, { algorithms: ['RS256'], issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`, audience: env.FIREBASE_PROJECT_ID })); } catch { denied(); }
      if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128 || payload.sub.includes('/') || !Number.isFinite(payload.auth_time) || payload.auth_time > Date.now() / 1000 + 30 || !Number.isFinite(payload.iat) || payload.iat > Date.now() / 1000 + 30 || !Number.isFinite(payload.exp)) denied();
      return { ...payload, uid: payload.sub };
    },
    async check(token) {
      try {
        const { payload, protectedHeader } = await jwtVerify(token, keys.check, { algorithms: ['RS256'], issuer: `https://firebaseappcheck.googleapis.com/${env.FIREBASE_PROJECT_NUMBER}`, audience: `projects/${env.FIREBASE_PROJECT_NUMBER}` });
        if (protectedHeader.typ !== 'JWT' || payload.sub !== env.FIREBASE_APP_ID || !Number.isFinite(payload.exp)) denied();
      } catch { denied(); }
    }
  };
}

export function firebaseAdmin(env, request = fetch) {
  let credential; let key; let access; let expires = 0;
  async function oauth() {
    if (access && Date.now() < expires - 300000) return access;
    try {
      credential ??= JSON.parse(env.FIREBASE_ADMIN_CREDENTIALS);
      if (credential.project_id !== env.FIREBASE_PROJECT_ID || typeof credential.client_email !== 'string') unavailable();
      key ??= await importPKCS8(credential.private_key, 'RS256');
      const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/identitytoolkit' }).setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).setIssuer(credential.client_email).setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(key);
      const response = await request('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(12000) });
      const body = await response.json(); if (!response.ok || typeof body.access_token !== 'string' || !Number.isFinite(body.expires_in)) unavailable();
      access = body.access_token; expires = Date.now() + body.expires_in * 1000; return access;
    } catch { unavailable(); }
  }
  async function invoke(action, data) {
    const response = await request(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/accounts:${action}`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${await oauth()}` }, body: JSON.stringify(data), signal: AbortSignal.timeout(12000) });
    const body = await response.json();
    if (!response.ok) {
      if (body.error?.message === 'USER_NOT_FOUND') throw Object.assign(new Error(), { code: 'auth/user-not-found' });
      unavailable();
    }
    return body;
  }
  return {
    async current(uid) { const body = await invoke('lookup', { localId: [uid] }); const user = body.users?.find(value => value.localId === uid); if (!user) denied(); return user; },
    async deleteUser(uid) { await invoke('delete', { localId: uid }); }
  };
}

export async function requireCurrent(token, auth) {
  const user = await auth.current(token.uid);
  if (user.disabled || Number(user.validSince ?? 0) > token.auth_time) denied();
  return token;
}
