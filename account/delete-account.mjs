import { apiKey } from './config.mjs';

const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
const emulator = local && new URLSearchParams(location.search).get('emulator') === '1';
const key = emulator ? 'demo-key' : apiKey;
const base = emulator ? 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/' : 'https://identitytoolkit.googleapis.com/v1/';
const form = document.querySelector('form');
const submit = document.querySelector('#submit');
const result = document.querySelector('#result');
let busy = false;
document.querySelector('#availability').textContent = emulator ? '로컬 인증 에뮬레이터 · 가상 계정 검증용' : key ? '이메일 계정 삭제' : '현재 계정 삭제 서비스를 연결하지 않았어요. 앱의 계정 탈퇴를 이용해 주세요.';
submit.disabled = !key;

async function request(method, payload) {
  const response = await fetch(`${base}${method}?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('REQUEST_FAILED');
  return response.json();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !key || !form.reportValidity()) return;
  busy = true; submit.disabled = true; result.textContent = '계정 확인과 삭제를 진행하고 있어요.';
  const passwordInput = document.querySelector('#password');
  let password = passwordInput.value;
  let idToken;
  try {
    const session = await request('accounts:signInWithPassword', { email: document.querySelector('#email').value.trim(), password, returnSecureToken: true });
    password = ''; passwordInput.value = ''; idToken = session.idToken;
    if (!idToken) throw new Error('REQUEST_FAILED');
    await request('accounts:delete', { idToken });
    form.reset(); result.textContent = '인증 계정을 삭제했어요. 기기 내 개인 기록 삭제 방법은 위 안내를 확인해 주세요.';
  } catch {
    result.textContent = '계정 삭제 완료를 확인하지 못했어요. 입력과 연결 상태를 확인한 뒤 다시 시도해 주세요. 이미 삭제된 계정인지 이 화면에서 판단할 수 없어요.';
  } finally {
    password = ''; idToken = undefined; passwordInput.value = ''; busy = false; submit.disabled = false;
  }
});
