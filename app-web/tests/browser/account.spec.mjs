import { test, expect } from '@playwright/test';
const password = 'LocalOnlyTestPassword123';
const apiUrl = 'http://127.0.0.1:5101/demo-gajaham-web/asia-northeast3/personalApi';
const authUrl = 'http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:';
const email = () => `emulator-${crypto.randomUUID()}@example.invalid`;
async function auth(page, address, kind = 'login', empty = true) {
  await page.getByRole('button', { name: '로그인하기 →' }).click();
  if (kind === 'signup') await page.getByRole('button', { name: '처음이신가요? 가입하기' }).click();
  await page.getByLabel('이메일', { exact: true }).fill(address);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('dialog').getByRole('button', { name: kind === 'signup' ? '이메일로 시작하기' : '로그인', exact: true }).click();
  await expect(page.locator('.account-pill')).toContainText('계정에 보관 중');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  if (empty) await expect(page.locator('.empty-state h3')).toContainText('다음에 갈 곳');
}
async function add(page, name, memo = '', sourceUrl = '') {
  await page.getByRole('button', { name: '장소 담기', exact: false }).first().click();
  await page.getByLabel('장소 이름').fill(name);
  if (sourceUrl) await page.getByLabel('원본 링크').fill(sourceUrl);
  await page.getByLabel('주소', { exact: true }).fill('가상시 가상동 123');
  await page.getByLabel('가고 싶은 이유').fill(memo);
  await page.getByRole('button', { name: '내 보관함에 담기' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.place-card h3').filter({ hasText: name })).toHaveCount(1);
}
test('two browsers share account records; guest transfer is explicit; XSS, conflicts, logout, deletion', async ({ browser }) => {
  const a = await browser.newContext({ viewport: { width: 390, height: 844 } }); const b = await browser.newContext();
  const page = await a.newPage(); const second = await b.newPage(); const address = email();
  const errors = []; page.on('pageerror', () => errors.push('page error')); second.on('pageerror', () => errors.push('page error'));
  await page.goto('/'); await expect(page.locator('.guest-notice')).toBeVisible();
  await add(page, '브라우저에만 남기는 장소');
  await auth(page, address, 'signup');
  await expect(page.locator('.place-card')).toHaveCount(0);
  await expect(page.locator('.guest-notice')).toContainText('계정에 담지 않은 기록 1개');
  await page.getByRole('button', { name: '계정에 담기 →' }).click();
  await page.getByRole('button', { name: '이 계정에 담기', exact: true }).click();
  await expect(page.locator('.place-card')).toHaveCount(1);
  await add(page, '두 기기에서 볼 장소', '<img src=x onerror="window.injected=true">');
  await expect(page.locator('.memo').filter({ hasText: '<img src=x' })).toHaveCount(1);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await second.goto('/');
  // Login helper normally expects the initial empty state; this account has records.
  await second.getByRole('button', { name: '로그인하기 →' }).click();
  await second.getByLabel('이메일', { exact: true }).fill(address); await second.getByLabel('비밀번호', { exact: true }).fill(password);
  await second.getByRole('dialog').getByRole('button', { name: '로그인', exact: true }).click();
  await expect(second.locator('.place-card')).toHaveCount(2);
  await page.locator('.place-card').filter({ hasText: '두 기기에서 볼 장소' }).getByRole('button').click();
  await second.locator('.place-card').filter({ hasText: '두 기기에서 볼 장소' }).getByRole('button').click();
  await second.getByLabel('가고 싶은 이유').fill('두 번째 브라우저 수정'); await second.getByRole('button', { name: '변경 저장' }).click();
  await expect(second.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('가고 싶은 이유').fill('오래된 첫 번째 브라우저 수정'); await page.getByRole('button', { name: '변경 저장' }).click();
  await expect(page.locator('.form-error')).toContainText('다른 기기');
  await page.getByRole('button', { name: '닫기', exact: true }).click(); await page.getByRole('button', { name: '최신 기록 불러오기' }).click();
  await expect(page.locator('.memo').filter({ hasText: '두 번째 브라우저 수정' })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../tmp/codex/WEB-01-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '계정', exact: true }).click(); await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page.locator('.place-card')).toHaveCount(0); await expect(page.locator('.guest-notice')).toContainText('이 브라우저에만');
  // Another signed-in account never receives the first account's records.
  await auth(page, email(), 'signup'); await expect(page.locator('.place-card')).toHaveCount(0);
  await second.getByRole('button', { name: '계정', exact: true }).click(); await second.getByRole('button', { name: '계정 탈퇴', exact: true }).click();
  await second.getByLabel('현재 비밀번호').fill(password); await second.getByRole('button', { name: '계정과 서버 기록 삭제', exact: true }).click();
  await expect(second.locator('.guest-notice')).toContainText('이 브라우저에만', { timeout: 45000 });
  await expect(second.locator('.place-card')).toHaveCount(0); expect(errors).toEqual([]);
  await a.close(); await b.close();
});
test('HTTP callable denies unauthenticated/forged owner/disabled token and enforces deletion', async ({ request }) => {
  const signup = await request.post(authUrl + 'signUp?key=fake-local-key', { data: { email: email(), password, returnSecureToken: true } });
  expect(signup.ok()).toBe(true); const { idToken, localId } = await signup.json();
  const post = (action, payload = {}, token = idToken) => request.post(apiUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {}, data: { data: { action, payload } } });
  expect((await post('list', {}, '')).status()).toBe(401);
  expect((await post('list', { uid: 'another-owner' })).status()).toBe(400);
  expect((await post('create', { requestId: crypto.randomUUID(), record: { sourceUrl: 'javascript:alert(1)' } })).status()).toBe(400);
  const receipts = [1, 2].map(() => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join(''));
  const starts = await Promise.all(receipts.map(receipt => post('startDeletion', { receipt })));
  expect(starts.some(response => response.ok())).toBe(true);
  for (let i = 0; i < starts.length; i++) {
    if (starts[i].status() === 401) continue; // The worker already removed Auth.
    expect(starts[i].ok()).toBe(true); const started = await starts[i].json();
    if ((started.result ?? started.data).state === 'deleted') continue;
    await expect.poll(async () => { const body = await (await post('deletionStatus', { receipt: receipts[i] }, '')).json(); return (body.result ?? body.data)?.state; }, { timeout: 45000 }).toBe('deleted');
  }
  expect((await post('list')).status()).toBe(401);
  const status = await (await post('deletionStatus', { receipt: receipts[0] }, '')).json(); expect(Object.keys(status.result ?? status.data)).toEqual(['state']);
  // The original auth user is gone, not only hidden from the UI.
  const lookup = await request.post(authUrl + 'lookup?key=fake-local-key', { data: { idToken } }); expect(lookup.status()).toBe(400);
  expect(localId).toBeTruthy();
});
test('a delayed old list cannot replace a newer committed save', async ({ page }) => {
  await page.goto('/'); await auth(page, email(), 'signup');
  let release; let finished; const held = new Promise(resolve => { release = resolve; }); const fulfilled = new Promise(resolve => { finished = resolve; }); let captured = false;
  await page.route(apiUrl, async route => {
    const body = route.request().postDataJSON();
    if (body.data.action === 'list' && !captured) { const response = await route.fetch(); captured = true; await held; await route.fulfill({ response }); finished(); }
    else await route.continue();
  });
  await page.getByRole('button', { name: '최신 기록 불러오기' }).click();
  await expect.poll(() => captured).toBe(true);
  await add(page, '늦은 조회가 지우면 안 되는 기록');
  release(); await fulfilled; await page.unroute(apiUrl);
  await expect(page.locator('.place-card h3')).toHaveText('늦은 조회가 지우면 안 되는 기록');
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({ path: '../tmp/codex/WEB-01-desktop.png', fullPage: true });
});
test('lost server response preserves the form; retry confirms exactly one record', async ({ page }) => {
  await page.goto('/'); await auth(page, email(), 'signup'); let lost = false;
  await page.route(apiUrl, async route => {
    if (route.request().postDataJSON().data.action === 'create' && !lost) { lost = true; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await page.getByRole('button', { name: '장소 담기', exact: false }).first().click();
  await page.getByLabel('장소 이름').fill('응답을 잃은 저장'); await page.getByLabel('주소', { exact: true }).fill('가상 주소');
  await page.getByRole('button', { name: '내 보관함에 담기' }).click();
  await expect(page.locator('.form-error')).toContainText('마치지 못했어요');
  await expect(page.getByLabel('장소 이름')).toHaveValue('응답을 잃은 저장');
  await expect(page.locator('.place-card')).toHaveCount(0);
  await page.getByRole('button', { name: '내 보관함에 담기' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.place-card')).toHaveCount(1);
  await page.unroute(apiUrl); await page.getByRole('button', { name: '최신 기록 불러오기' }).click();
  await expect(page.locator('.place-card')).toHaveCount(1);
});
test('partial guest transfer keeps rejected originals and moves only acknowledged records', async ({ page }) => {
  await page.goto('/'); await add(page, '옮길 기록'); await add(page, '실패해서 남길 기록');
  await auth(page, email(), 'signup');
  await page.route(apiUrl, async route => {
    const data = route.request().postDataJSON().data;
    if (data.action === 'create' && data.payload.record.name === '실패해서 남길 기록') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { status: 'UNAVAILABLE', message: 'temporary' } }) });
    else await route.continue();
  });
  await page.getByRole('button', { name: '계정에 담기 →' }).click(); await page.getByRole('button', { name: '이 계정에 담기', exact: true }).click();
  await expect(page.locator('.place-card h3')).toHaveText('옮길 기록');
  await expect(page.locator('.guest-notice')).toContainText('계정에 담지 않은 기록 1개');
  await page.getByRole('button', { name: '계정', exact: true }).click(); await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page.locator('.place-card h3')).toHaveText('실패해서 남길 기록');
});
for (const duplicateFirst of [false, true]) test(`permanent deletion cannot be undone by an old ${duplicateFirst ? 'duplicate' : 'original'} create retry`, async ({ page, browser }) => {
  const address = email(); const sourceUrl = 'https://instagram.com/p/REMOVED_RETRY/'; await page.goto('/'); await auth(page, address, 'signup'); let lost = false;
  if (duplicateFirst) await add(page, '영구 삭제한 기록', '', sourceUrl);
  await page.route(apiUrl, async route => {
    if (route.request().postDataJSON().data.action === 'create' && !lost) { lost = true; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await page.getByRole('button', { name: '장소 담기', exact: false }).first().click();
  await page.getByLabel('장소 이름').fill('영구 삭제한 기록'); await page.getByLabel('주소', { exact: true }).fill('가상 주소');
  await page.getByLabel('원본 링크').fill(sourceUrl);
  await page.getByRole('button', { name: '내 보관함에 담기' }).click(); await expect(page.locator('.form-error')).toContainText('마치지 못했어요');
  if (duplicateFirst) {
    await page.getByLabel('원본 링크').fill('https://example.invalid/changed'); await page.getByRole('button', { name: '내 보관함에 담기' }).click();
    await expect(page.locator('.form-error')).toContainText('다른 내용으로 처리'); await expect(page.getByLabel('원본 링크')).toHaveValue('https://example.invalid/changed');
    await page.getByLabel('원본 링크').fill(sourceUrl);
  }
  const context = await browser.newContext(); const other = await context.newPage(); await other.goto('/'); await auth(other, address, 'login', false);
  await other.locator('.place-card').getByRole('button').click(); await other.getByRole('button', { name: '휴지통으로', exact: true }).click();
  await expect(other.getByRole('dialog')).toHaveCount(0); await other.getByRole('button', { name: '계정', exact: true }).click(); await other.getByRole('button', { name: '휴지통 보기' }).click();
  await other.locator('.place-card').getByRole('button').click(); other.once('dialog', dialog => dialog.accept()); await other.getByRole('button', { name: '영구 삭제', exact: true }).click();
  await expect(other.locator('.place-card')).toHaveCount(0);
  await page.getByRole('button', { name: '내 보관함에 담기' }).click(); await expect(page.locator('.form-error')).toContainText('기록 상태가 바뀌었어요');
  await page.getByRole('button', { name: '닫기', exact: true }).click(); await page.getByRole('button', { name: '최신 기록 불러오기' }).click();
  await expect(page.locator('.place-card')).toHaveCount(0); await context.close();
});
