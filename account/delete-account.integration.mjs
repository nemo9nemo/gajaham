import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/';
async function request(method, body) {
  return fetch(`${base}${method}?key=demo-key`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
}
async function page() {
  const fields = Object.fromEntries(['#submit','#result','#availability','#email','#password','#confirm'].map(key => [key,{value:'',textContent:'',disabled:false}]));
  const handlers = {};
  const form = { reportValidity:() => true, reset:() => { fields['#email'].value=''; fields['#password'].value=''; }, addEventListener:(event,handler) => { handlers[event]=handler; } };
  const source = (await readFile(new URL('./delete-account.mjs',import.meta.url),'utf8')).replace("import { apiKey } from './config.mjs';", "const apiKey = '';");
  const document = {querySelector:selector => selector === 'form' ? form : fields[selector]};
  vm.runInNewContext(source,{document,location:{hostname:'127.0.0.1',search:'?emulator=1'},URLSearchParams,AbortSignal,fetch,Error});
  return {fields,submit:() => handlers.submit({preventDefault(){}})};
}

test('web deletion uses real local auth, handles failure, clears password and deletes only the signed-in fixture', async () => {
  const email = `web-${Date.now()}@example.test`;
  const password = 'fictional-web-password';
  assert.equal((await request('accounts:signUp',{email,password,returnSecureToken:true})).status,200);
  const view = await page();
  view.fields['#email'].value = email; view.fields['#password'].value = 'wrong-password';
  await view.submit();
  assert.match(view.fields['#result'].textContent,/확인하지 못했어요/);
  assert.equal(view.fields['#password'].value,'');
  assert.equal((await request('accounts:signInWithPassword',{email,password,returnSecureToken:true})).status,200);
  view.fields['#password'].value = password;
  const first = view.submit(); const duplicate = view.submit();
  assert.equal(view.fields['#submit'].disabled,true);
  await Promise.all([first,duplicate]);
  assert.match(view.fields['#result'].textContent,/인증 계정을 삭제했어요/);
  assert.equal(view.fields['#password'].value,'');
  assert.equal(view.fields['#submit'].disabled,false);
  assert.notEqual((await request('accounts:signInWithPassword',{email,password,returnSecureToken:true})).status,200);
});
