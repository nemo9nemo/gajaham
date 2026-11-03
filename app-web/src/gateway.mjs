import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, onIdTokenChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail, reload, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';

export const publicConfig = __PUBLIC_CONFIG__;
export const localMode = __LOCAL_EMULATOR__;
let configuration = publicConfig; let local; let appCheck; let auth;
if (__LOCAL_EMULATOR__) { local = await import('./local-emulator.mjs'); configuration = local.config; }
const validOrigin = value => { try { const url = new URL(value); return url.protocol === 'https:' && url.origin === value; } catch { return false; } };
export const canonicalOrigin = validOrigin(publicConfig.origin) ? publicConfig.origin : '';
export const available = localMode || Boolean(configuration.apiKey && /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(configuration.projectId) && configuration.authDomain && configuration.appId && configuration.appCheckKey && canonicalOrigin && location.origin === canonicalOrigin && publicConfig.contact);
if (available) {
  const app = initializeApp(configuration);
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
  if (__LOCAL_EMULATOR__) local.connect(auth);
  else appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(configuration.appCheckKey), isTokenAutoRefreshEnabled: true });
}
export const currentUser = () => auth?.currentUser ?? null;
export function observe(callback) { if (!auth) { queueMicrotask(() => callback(null)); return () => {}; } return onIdTokenChanged(auth, callback); }
function requireUser(uid) { const user = currentUser(); if (!user || user.uid !== uid) throw Object.assign(new Error('SESSION_CHANGED'), { code: 'session-changed' }); return user; }
function requireSession(user) { if (currentUser() !== user) throw Object.assign(new Error('SESSION_CHANGED'), { code: 'session-changed' }); }
export async function authenticate(kind, email, password) {
  if (!available) throw new Error('AUTH_UNAVAILABLE');
  if (kind === 'signup') {
    if (password.length < 12 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw Object.assign(new Error(), { code: 'weak-password' });
    const result = await createUserWithEmailAndPassword(auth, email, password);
    try { await sendEmailVerification(result.user); } catch { /* account exists; resend is available */ }
    return result.user.uid;
  }
  return (await signInWithEmailAndPassword(auth, email, password)).user.uid;
}
export async function logout() { if (auth) await signOut(auth); }
export async function verifyEmail(uid) { await sendEmailVerification(requireUser(uid)); }
export async function refreshUser(uid) { const user = requireUser(uid); await reload(user); requireUser(uid); await user.getIdToken(true); }
export async function resetPassword(email) {
  if (!available) throw new Error('AUTH_UNAVAILABLE');
  try { await sendPasswordResetEmail(auth, email); } catch (error) { if (['auth/network-request-failed', 'auth/too-many-requests'].includes(error.code)) throw error; }
}
export async function reauthenticate(uid, password) { const user = requireUser(uid); await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password)); requireSession(user); }
export async function api(uid, action, payload = {}) {
  const user = requireUser(uid);
  // Bind the token to the user who opened the action. The request never asks the
  // server to trust a client-supplied owner or mutable global account selection.
  const token = await user.getIdToken(); requireSession(user);
  const appToken = appCheck ? (await getToken(appCheck)).token : ''; requireSession(user);
  const result = await send(action, payload, token, appToken); requireSession(user); return result;
}
export async function deletionStatus(receipt) {
  const appToken = appCheck ? (await getToken(appCheck)).token : '';
  return send('deletionStatus', { receipt }, '', appToken);
}
async function send(action, payload, token, appToken) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(localMode ? local.endpoint : `https://asia-northeast3-${configuration.projectId}.cloudfunctions.net/personalApi`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(appToken ? { 'X-Firebase-AppCheck': appToken } : {}) },
      body: JSON.stringify({ data: { action, payload } }), signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'
    });
    const body = await response.json();
    if (!response.ok || body.error) throw Object.assign(new Error(), { code: body.error?.status?.toLowerCase().replaceAll('_', '-') ?? 'unavailable', safeMessage: body.error?.message });
    return body.result ?? body.data;
  } finally { clearTimeout(timer); }
}
export function errorMessage(error) {
  const code = String(error?.code ?? '').replace(/^auth\//, '');
  if (code === 'aborted') return '다른 기기에서 기록이 변경됐어요. 창을 닫고 최신 기록을 확인한 뒤 다시 수정해 주세요.';
  if (code === 'session-changed') return '계정이 바뀌었어요. 현재 계정에서 다시 시작해 주세요.';
  if (code === 'weak-password') return '비밀번호는 영문과 숫자를 포함해 12자 이상으로 만들어 주세요.';
  if (code === 'resource-exhausted' || code === 'too-many-requests') return '요청이 많거나 보관 한도에 도달했어요. 잠시 뒤 다시 시도해 주세요.';
  if (code === 'failed-precondition') return '최근 인증이 필요하거나 기록 상태가 바뀌었어요. 새로 확인한 뒤 다시 시도해 주세요.';
  if (code === 'unauthenticated' || code === 'user-token-expired' || code === 'invalid-user-token' || code === 'user-disabled') return '로그인 상태를 확인할 수 없어요. 다시 로그인해 주세요.';
  if (code === 'invalid-argument') return '입력 길이와 링크, 장소 정보를 확인해 주세요.';
  if (code === 'not-found') return '삭제됐거나 찾을 수 없는 기록이에요. 새로 불러와 주세요.';
  return '요청을 마치지 못했어요. 입력 정보와 연결 상태를 확인하고 다시 시도해 주세요.';
}
