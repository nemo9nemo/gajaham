import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, onIdTokenChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification, sendPasswordResetEmail, reload, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';
export { errorMessage } from './feedback.mjs';

export const publicConfig = __PUBLIC_CONFIG__;
export const localMode = __LOCAL_EMULATOR__;
let configuration = publicConfig; let local; let appCheck; let auth;
if (__LOCAL_EMULATOR__) { local = await import('./local-emulator.mjs'); configuration = local.config; }
const validOrigin = value => { try { const url = new URL(value); return url.protocol === 'https:' && url.origin === value; } catch { return false; } };
export const canonicalOrigin = validOrigin(publicConfig.origin) ? publicConfig.origin : '';
export const available = localMode || Boolean(configuration.apiKey && /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(configuration.projectId) && configuration.authDomain && configuration.appId && configuration.appCheckKey && validOrigin(configuration.apiOrigin) && canonicalOrigin && location.origin === canonicalOrigin && publicConfig.contact);
if (available) {
  const app = initializeApp(configuration);
  auth = initializeAuth(app, { persistence: browserLocalPersistence });
  auth.languageCode = 'ko';
  if (__LOCAL_EMULATOR__) local.connect(auth);
  else appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(configuration.appCheckKey), isTokenAutoRefreshEnabled: true });
}
export const currentUser = () => auth?.currentUser ?? null;
const mailCooldowns = new Map();
export const mailRetryAt = (kind, uid = '') => mailCooldowns.get(`${kind}:${uid}`) ?? 0;
async function mailRequest(kind, uid, request) {
  const retryAt = mailRetryAt(kind, uid);
  if (retryAt > Date.now()) throw Object.assign(new Error(), { code: 'mail-cooldown', retryAt });
  mailCooldowns.set(`${kind}:${uid}`, Date.now() + 60000);
  return request();
}
export function observe(callback) { if (!auth) { queueMicrotask(() => callback(null)); return () => {}; } return onIdTokenChanged(auth, callback); }
function requireUser(uid) { const user = currentUser(); if (!user || user.uid !== uid) throw Object.assign(new Error('SESSION_CHANGED'), { code: 'session-changed' }); return user; }
function requireSession(user) { if (currentUser() !== user) throw Object.assign(new Error('SESSION_CHANGED'), { code: 'session-changed' }); }
export async function authenticate(kind, email, password) {
  if (!available) throw new Error('AUTH_UNAVAILABLE');
  if (kind === 'signup') {
    if (password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[0-9]/.test(password)) throw Object.assign(new Error(), { code: 'weak-password' });
    const result = await createUserWithEmailAndPassword(auth, email, password);
    try { await mailRequest('verification', result.user.uid, () => sendEmailVerification(result.user)); } catch { /* Account exists; a later explicit resend is available. */ }
    return result.user.uid;
  }
  return (await signInWithEmailAndPassword(auth, email, password)).user.uid;
}
export async function logout() { if (auth) await signOut(auth); }
export async function verifyEmail(uid) { const user = requireUser(uid); await mailRequest('verification', uid, () => sendEmailVerification(user)); requireSession(user); }
export async function refreshUser(uid) { const user = requireUser(uid); await reload(user); requireUser(uid); await user.getIdToken(true); }
export async function resetPassword(email) {
  if (!available) throw new Error('AUTH_UNAVAILABLE');
  try { await mailRequest('reset', '', () => sendPasswordResetEmail(auth, email)); } catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
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
    const response = await fetch(localMode ? local.endpoint : `${configuration.apiOrigin}/personalApi`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(appToken ? { 'X-Firebase-AppCheck': appToken } : {}) },
      body: JSON.stringify({ data: { action, payload } }), signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer'
    });
    const body = await response.json();
    if (!response.ok || body.error) throw Object.assign(new Error(), { code: body.error?.status?.toLowerCase().replaceAll('_', '-') ?? 'unavailable', reason: body.error?.details?.reason, retryAt: Number.isFinite(body.error?.details?.retryAt) ? body.error.details.retryAt : 0 });
    return body.result ?? body.data;
  } finally { clearTimeout(timer); }
}
