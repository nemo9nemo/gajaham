// This entry is never included in the production dependency graph.
import { createStore } from './store.mjs';
import { createApi } from './api.mjs';
import { fail } from '../../functions/src/domain.mjs';
const project = 'demo-gajaham-web';
const endpoint = `http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/projects/${project}/accounts:`;
async function admin(action, body) {
  const response = await fetch(endpoint + action, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(), { code: data.error?.message === 'USER_NOT_FOUND' ? 'auth/user-not-found' : 'auth/invalid' });
  return data;
}
const auth = {
  async current(uid) { const user = (await admin('lookup', { localId: [uid] })).users?.find(value => value.localId === uid); if (!user) fail('unauthenticated', '다시 로그인해 주세요.'); return user; },
  async deleteUser(uid) { await admin('delete', { localId: uid }); }
};
const verifier = {
  async check() {},
  async auth(token) {
    let data; try { data = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))); } catch { fail('unauthenticated', '다시 로그인해 주세요.'); }
    if (data.aud !== project || data.iss !== `https://securetoken.google.com/${project}` || data.exp <= Date.now() / 1000 || typeof data.sub !== 'string' || data.sub.includes('/') || !Number.isFinite(data.auth_time)) fail('unauthenticated', '다시 로그인해 주세요.');
    return { ...data, uid: data.sub };
  }
};
export default {
  async fetch(request, env, context) {
    if (!['127.0.0.1', 'localhost'].includes(new URL(request.url).hostname) || env.FIREBASE_PROJECT_ID !== project) return new Response(null, { status: 403 });
    return createApi({ db: createStore(env.DB), auth, verifier, origin: env.WEB_ORIGIN }).fetch(request, context);
  }
};
