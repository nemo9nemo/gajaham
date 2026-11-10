import { connectAuthEmulator } from 'firebase/auth';
export const config = { apiKey: 'demo-gajaham-web-key', projectId: 'demo-gajaham-web', authDomain: 'demo-gajaham-web.firebaseapp.com', appId: '1:000000000000:web:demo-gajaham-web', contact: '', origin: '' };
export function connect(auth) {
  if (!['127.0.0.1', 'localhost'].includes(location.hostname)) throw new Error('LOCAL_ONLY');
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
}
export const endpoint = 'http://127.0.0.1:8787/personalApi';
