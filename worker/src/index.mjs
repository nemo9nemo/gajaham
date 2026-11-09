import { createStore } from './store.mjs';
import { createApi } from './api.mjs';
import { firebaseAdmin, tokenVerifier } from './auth.mjs';
let cached;
function api(env) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(env.FIREBASE_PROJECT_ID) || /demo-|configure/.test(env.FIREBASE_PROJECT_ID) || !/^[1-9][0-9]+$/.test(env.FIREBASE_PROJECT_NUMBER) || !env.FIREBASE_ADMIN_CREDENTIALS || !env.FIREBASE_APP_ID?.startsWith(`1:${env.FIREBASE_PROJECT_NUMBER}:web:`) || !/^https:\/\/[^/]+$/.test(env.WEB_ORIGIN)) throw new Error('Configuration incomplete');
  cached ??= createApi({ db: createStore(env.DB), auth: firebaseAdmin(env), verifier: tokenVerifier(env), origin: env.WEB_ORIGIN });
  return cached;
}
export default {
  async fetch(request, env, context) {
    try { return await api(env).fetch(request, context); }
    catch { return Response.json({ error: { status: 'UNAVAILABLE', message: '계정 이용 준비 중이에요.' } }, { status: 503, headers: { 'cache-control': 'no-store' } }); }
  },
  async scheduled(event, env, context) { context.waitUntil(api(env).scheduled()); }
};
