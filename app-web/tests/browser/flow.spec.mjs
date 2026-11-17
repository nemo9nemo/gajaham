import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const api = 'http://127.0.0.1:8787/personalApi';
const password = 'LocalOnlyPassword123';
const email = () => `flow-${crypto.randomUUID()}@example.invalid`;
const input = (i = 0) => ({ sourceUrl: '', name: `가상 장소 ${i}`, address: '가상시 가상동', memo: '', menu: '', category: 'cafe', visited: false });
async function signup(page, address = email()) {
  await page.getByRole('button', { name: '로그인하기 →' }).click(); await page.getByRole('button', { name: '처음이신가요? 가입하기' }).click();
  await page.getByLabel('이메일', { exact: true }).fill(address); await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '이메일로 시작하기', exact: true }).click(); await expect(page.locator('.account-pill')).toContainText('계정에 보관 중');
  return address;
}
async function seedGuest(page, count) {
  return page.evaluate(async count => {
    const { createGuest } = await import('/src/guest.mjs'); const ids = [];
    for (let i = 0; i < count; i++) { const id = crypto.randomUUID(); await createGuest({ sourceUrl: '', name: `가상 장소 ${i}`, address: '가상시 가상동', memo: '', menu: '', category: 'cafe', visited: false }, id); ids.push(id); }
    return ids;
  }, count);
}
async function add(page, { name = '가상 장소', memo = '', sourceUrl = '' } = {}) {
  await page.getByRole('button', { name: '장소 담기', exact: false }).first().click();
  await page.getByLabel('장소 이름').fill(name); await page.getByLabel('주소', { exact: true }).fill('가상시 가상동');
  await page.getByLabel('가고 싶은 이유').fill(memo); if (sourceUrl) await page.getByLabel('원본 링크').fill(sourceUrl);
  await page.getByRole('button', { name: '내 보관함에 담기' }).click();
}
const fulfill = (route, result) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ result }) });

test('150 guest rows: quota pause, explicit resume, in-flight stop, retained duplicate and stable retries', async ({ page }) => {
  await page.goto('/'); const ids = await seedGuest(page, 150); await page.reload(); await signup(page);
  const committed = new Map([[ids[0], { ...input(0), id: ids[0], revision: 1, state: 'saved', createdAt: Date.now(), updatedAt: Date.now() }]]);
  const attempts = []; let release; const gate = new Promise(resolve => { release = resolve; });
  await page.route(api, async route => {
    const { action, payload } = route.request().postDataJSON().data;
    if (action === 'list') { await fulfill(route, { items: [...committed.values()], nextCursor: '' }); return; }
    if (action !== 'create') { await route.continue(); return; }
    attempts.push(payload.requestId);
    if (attempts.length === 2) { await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', details: { reason: 'rate-limited', retryAt: Date.now() + 500 } } }) }); return; }
    if (attempts.length === 3) await gate;
    if (payload.requestId === ids[0]) { await fulfill(route, { duplicate: true, id: ids[0] }); return; }
    const record = { ...payload.record, id: payload.requestId, revision: 1, state: 'saved', createdAt: Date.now(), updatedAt: Date.now() }; committed.set(record.id, record);
    await fulfill(route, { duplicate: false, record });
  });
  await page.getByRole('button', { name: '계정에 담기 →' }).click(); await page.getByRole('button', { name: '이 계정에 담기', exact: true }).click();
  await expect(page.locator('#transfer-status')).toContainText('멈췄어요'); expect(attempts).toHaveLength(2);
  await expect(page.getByRole('button', { name: /^남은 기록 다시 담기/ })).toBeEnabled(); await page.getByRole('button', { name: /^남은 기록 다시 담기/ }).click();
  await expect.poll(() => attempts.length).toBe(3); await page.getByRole('button', { name: '현재 항목 처리 후 중단' }).click(); release();
  await expect(page.locator('#transfer-status')).toContainText('멈췄어요'); expect(attempts).toHaveLength(3);
  await page.getByRole('button', { name: /^남은 기록 다시 담기/ }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(committed.size).toBe(150); expect(attempts).toHaveLength(151); expect(attempts[1]).toBe(attempts[2]); expect(attempts.filter(id => id === ids[0])).toHaveLength(1);
  expect(await page.evaluate(async () => (await (await import('/src/guest.mjs')).allGuest()).map(row => row.id))).toEqual([ids[0]]);
});

test('guest duplicate: existing/trash record opens explicitly and memo changes only after selection and save', async ({ page }) => {
  await page.goto('/'); const sourceUrl = 'https://instagram.com/p/FLOW_DUPLICATE/'; await add(page, { name: '기존 장소', memo: '기존 메모', sourceUrl });
  await expect(page.getByRole('dialog')).toHaveCount(0); await add(page, { name: '새 입력', memo: '새 메모', sourceUrl });
  await page.getByRole('button', { name: '기존 기록 보기' }).click(); await expect(page.getByLabel('가고 싶은 이유')).toHaveValue('기존 메모');
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: '닫기', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => !dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(true);
  await page.getByRole('button', { name: '방금 입력한 메모 사용' }).click(); await expect(page.getByLabel('가고 싶은 이유')).toHaveValue('새 메모');
  await page.getByRole('button', { name: '변경 저장' }).click(); await expect(page.locator('.place-card .memo')).toHaveText('새 메모');
  await add(page, { memo: '버릴 입력', sourceUrl }); await page.getByRole('button', { name: '기존 기록 보기' }).click(); await page.getByRole('button', { name: '방금 입력한 메모 사용' }).click(); await page.getByRole('button', { name: '방금 입력한 메모 버리기' }).click(); await expect(page.getByRole('textbox', { name: '가고 싶은 이유', exact: true })).toHaveValue('새 메모');
  expect(await page.evaluate(() => !dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(false); await page.getByRole('button', { name: '닫기', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.place-card').getByRole('button').click(); await page.getByRole('button', { name: '휴지통으로', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await add(page, { memo: '복원 후 메모', sourceUrl });
  await expect(page.locator('.duplicate-notice')).toContainText('휴지통'); await page.getByRole('button', { name: '기존 기록 보기' }).click();
  await expect(page.getByRole('dialog', { name: '휴지통의 기록' })).toBeVisible(); await expect(page.getByRole('button', { name: '방금 입력한 메모 사용' })).toHaveCount(0);
  await page.getByRole('button', { name: '기록 복원', exact: true }).click(); await expect(page.getByLabel('가고 싶은 이유')).toHaveValue('새 메모');
  await page.getByRole('button', { name: '방금 입력한 메모 사용' }).click(); await page.getByRole('button', { name: '변경 저장' }).click();
  await expect(page.locator('.place-card .memo')).toHaveText('복원 후 메모');
});

test('transfer reload: repeated unavailable responses stop, reload sends nothing, explicit retry keeps the same request IDs', async ({ page }) => {
  await page.goto('/'); await seedGuest(page, 3); await page.reload(); await signup(page); const attempts = []; let unavailable = true;
  await page.route(api, async route => { const data = route.request().postDataJSON().data; if (data.action !== 'create') { await route.continue(); return; } attempts.push(data.payload.requestId); if (unavailable) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { status: 'UNAVAILABLE' } }) }); else await route.continue(); });
  await page.getByRole('button', { name: '계정에 담기 →' }).click(); await page.getByRole('button', { name: '이 계정에 담기', exact: true }).click(); await expect(page.locator('#transfer-status')).toContainText('멈췄어요'); expect(attempts).toHaveLength(2);
  unavailable = false; await page.reload(); await expect(page.locator('.account-pill')).toContainText('계정에 보관 중'); expect(attempts).toHaveLength(2); await expect(page.locator('.guest-notice')).toContainText('기록 3개');
  await page.getByRole('button', { name: '계정에 담기 →' }).click(); await page.getByRole('button', { name: '이 계정에 담기', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.place-card')).toHaveCount(3); expect(attempts[2]).toBe(attempts[0]); expect(attempts[3]).toBe(attempts[1]);
});

test('restore acknowledgement keeps the duplicate draft even when subsequent list requests are unavailable', async ({ page }) => {
  await page.goto('/'); await signup(page); const sourceUrl = 'https://instagram.com/p/RESTORE_DRAFT/'; await add(page, { memo: '원래 메모', sourceUrl }); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.place-card').getByRole('button').click(); await page.getByRole('button', { name: '휴지통으로', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await add(page, { memo: '복원 뒤에도 보존할 초안', sourceUrl }); await page.getByRole('button', { name: '기존 기록 보기' }).click(); await expect(page.getByRole('dialog', { name: '휴지통의 기록' })).toBeVisible();
  let failedLists = 0; await page.route(api, async route => { if (route.request().postDataJSON().data.action === 'list') { failedLists++; await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { status: 'UNAVAILABLE' } }) }); } else await route.continue(); });
  await page.getByRole('button', { name: '기록 복원', exact: true }).click(); await expect(page.getByRole('dialog', { name: '담아 둔 장소' })).toBeVisible(); await expect(page.locator('.duplicate-notice')).toContainText('복원 뒤에도 보존할 초안');
  // The restored server record is authoritative without a dependent full list.
  expect(failedLists).toBe(0); expect(await page.evaluate(async () => { const gateway = await import('/src/gateway.mjs'); try { await gateway.api(gateway.currentUser().uid, 'list'); return ''; } catch (error) { return error.code; } })).toBe('unavailable'); expect(failedLists).toBe(1);
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: '닫기', exact: true }).click(); await expect(page.locator('.duplicate-notice')).toContainText('복원 뒤에도 보존할 초안');
  await page.getByRole('button', { name: '방금 입력한 메모 사용' }).click(); await page.getByRole('button', { name: '변경 저장' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.place-card .memo')).toHaveText('복원 뒤에도 보존할 초안');
});

test('two browsers: dirty cancel keeps input and conflict merges only selected fields against the latest revision', async ({ page, browser }) => {
  await page.goto('/'); const address = await signup(page); await add(page, { name: '처음 이름', memo: '처음 메모' }); await expect(page.getByRole('dialog')).toHaveCount(0);
  const context = await browser.newContext(); const other = await context.newPage(); await other.goto('/');
  await other.getByRole('button', { name: '로그인하기 →' }).click(); await other.getByLabel('이메일', { exact: true }).fill(address); await other.getByLabel('비밀번호', { exact: true }).fill(password);
  await other.getByRole('dialog').getByRole('button', { name: '로그인', exact: true }).click(); await expect(other.locator('.place-card')).toHaveCount(1);
  await page.locator('.place-card').getByRole('button').click(); await page.getByLabel('가고 싶은 이유').fill('내가 남긴 초안');
  page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: '닫기', exact: true }).click(); await expect(page.getByLabel('가고 싶은 이유')).toHaveValue('내가 남긴 초안');
  expect(await page.evaluate(() => !dispatchEvent(new Event('beforeunload', { cancelable: true })))).toBe(true);
  await other.locator('.place-card').getByRole('button').click(); await other.getByLabel('장소 이름').fill('다른 기기의 최신 이름'); await other.getByLabel('가고 싶은 이유').fill('다른 기기 메모'); await other.getByRole('button', { name: '변경 저장' }).click();
  await page.getByRole('button', { name: '변경 저장' }).click(); await expect(page.locator('.conflict-panel')).toBeVisible(); await expect(page.getByRole('textbox', { name: '가고 싶은 이유', exact: true })).toHaveValue('내가 남긴 초안');
  await page.getByLabel('가고 싶은 이유에 내 입력 적용', { exact: true }).check(); await page.getByRole('button', { name: '선택한 내용으로 다시 저장' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.place-card h3')).toHaveText('다른 기기의 최신 이름'); await expect(page.locator('.place-card .memo')).toHaveText('내가 남긴 초안');
  await page.locator('.place-card').getByRole('button').click(); await page.getByRole('textbox', { name: '가고 싶은 이유', exact: true }).fill('계정 전환 때 지울 초안');
  const tab = await page.context().newPage(); await tab.goto('/'); await expect(tab.locator('.account-pill')).toContainText('계정에 보관 중'); await tab.evaluate(async () => (await import('/src/gateway.mjs')).logout());
  await expect(page.getByRole('dialog')).toHaveCount(0); await signup(page); await expect(page.locator('.place-card')).toHaveCount(0); await expect(page.getByText('계정 전환 때 지울 초안')).toHaveCount(0); await tab.close();
  await context.close();
});

test('duplicate removed before opening: retain the current input and never recreate the retired target', async ({ page }) => {
  await page.goto('/'); const sourceUrl = 'https://instagram.com/p/FLOW_REMOVED_DUPLICATE/'; await add(page, { name: '사라질 대상', sourceUrl }); await expect(page.getByRole('dialog')).toHaveCount(0);
  await add(page, { memo: '유지할 중복 입력', sourceUrl }); await expect(page.getByRole('button', { name: '기존 기록 보기' })).toBeVisible();
  await page.evaluate(async () => { const guest = await import('/src/guest.mjs'); const row = (await guest.allGuest())[0]; await guest.mutateGuest('trash', { id: row.id, revision: row.revision }); await guest.mutateGuest('remove', { id: row.id, revision: row.revision + 1 }); });
  await page.getByRole('button', { name: '기존 기록 보기' }).click(); await expect(page.locator('.form-error')).toContainText('찾을 수 없는 기록'); await expect(page.getByRole('textbox', { name: '가고 싶은 이유', exact: true })).toHaveValue('유지할 중복 입력');
  expect(await page.evaluate(async () => (await (await import('/src/guest.mjs')).allGuest()).length)).toBe(0);
});

test('transfer permanent limits show cleanup/contact actions and never loop or imply waiting will fix lifetime limits', async ({ page }) => {
  await page.goto('/'); await seedGuest(page, 2); await page.reload(); await signup(page); let reason = ''; let calls = 0;
  await page.route(api, async route => { if (route.request().postDataJSON().data.action !== 'create') { await route.continue(); return; } calls++; await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', details: { reason } } }) }); });
  for (const current of ['record-limit', 'storage-limit', 'operation-limit']) {
    reason = current; const before = calls; await page.getByRole('button', { name: '계정에 담기 →' }).click(); await page.getByRole('button', { name: '이 계정에 담기', exact: true }).click(); await expect(page.locator('#transfer-status')).toContainText('멈췄어요'); expect(calls).toBe(before + 1);
    if (current === 'operation-limit') { await expect(page.getByRole('button', { name: '문의 안내 보기' })).toBeVisible(); await expect(page.getByRole('button', { name: /^남은 기록 다시 담기/ })).toBeDisabled(); }
    else await expect(page.getByRole('dialog').getByRole('button', { name: '휴지통 보기' })).toBeVisible();
    await page.getByRole('button', { name: '닫기', exact: true }).click();
  }
  expect(await page.evaluate(async () => (await (await import('/src/guest.mjs')).allGuest()).length)).toBe(2);
});

test('account change during an in-flight transfer clears old progress and preserves the unacknowledged guest original', async ({ page, context }) => {
  await page.goto('/'); await seedGuest(page, 2); await page.reload(); await signup(page);
  let release; const gate = new Promise(resolve => { release = resolve; }); let creates = 0;
  await page.route(api, async route => { if (route.request().postDataJSON().data.action === 'create') { creates++; await gate; await fulfill(route, { duplicate: false, record: { ...input(), id: crypto.randomUUID(), revision: 1, state: 'saved' } }); } else await route.continue(); });
  await page.getByRole('button', { name: '계정에 담기 →' }).click(); await page.getByRole('button', { name: '이 계정에 담기', exact: true }).click(); await expect.poll(() => creates).toBe(1);
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('.account-pill')).toContainText('계정에 보관 중'); await other.evaluate(async () => (await import('/src/gateway.mjs')).logout());
  await expect(page.locator('.guest-notice')).toContainText('이 브라우저에만'); release(); await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(async () => (await (await import('/src/guest.mjs')).allGuest()).length)).toBe(2); expect(creates).toBe(1);
  await signup(page); await expect(page.locator('.place-card')).toHaveCount(0); await expect(page.locator('#transfer-status')).toHaveCount(0); await other.close();
});

test('mobile dialog: named, readable single-column cards, 44px controls, focus return and short-height actions', async ({ page }) => {
  await page.goto('/'); await seedGuest(page, 2); await page.reload();
  for (const [width, height] of [[360, 740], [390, 844], [412, 915], [740, 360], [390, 320]]) {
    await page.setViewportSize({ width, height }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const cards = await page.locator('.place-card').evaluateAll(cards => cards.map(card => ({ x: card.getBoundingClientRect().x, y: card.getBoundingClientRect().y })));
    expect(cards[0].x).toBe(cards[1].x); expect(cards[1].y).toBeGreaterThan(cards[0].y);
    await page.getByRole('button', { name: '장소 담기', exact: false }).first().click(); await expect(page.getByRole('dialog', { name: '가고 싶은 곳 담기' })).toBeVisible();
    expect((await page.getByRole('button', { name: '닫기', exact: true }).boundingBox()).height).toBeGreaterThanOrEqual(44);
    const save = page.getByRole('button', { name: '내 보관함에 담기' }); await save.scrollIntoViewIfNeeded(); await expect(save).toBeInViewport();
    if (width === 390 && height === 844) await page.screenshot({ path: '../tmp/codex/WEB-06-dialog-mobile.png' });
    await page.getByRole('button', { name: '닫기', exact: true }).click(); await expect(page.getByRole('button', { name: '장소 담기', exact: false }).first()).toBeFocused();
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: '../tmp/codex/WEB-06-list-mobile.png', fullPage: true });
  await page.getByRole('button', { name: '장소 담기', exact: false }).first().click(); await page.addStyleTag({ content: '.sheet input,.sheet textarea,.sheet select,.sheet label{font-size:24px!important}.sheet h2{font-size:28px!important}' });
  expect(await page.getByRole('dialog').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true); await page.getByRole('button', { name: '내 보관함에 담기' }).scrollIntoViewIfNeeded(); await expect(page.getByRole('button', { name: '내 보관함에 담기' })).toBeInViewport();
});

test('account list failure shows a connection warning; local quota failure never shows a committed save', async ({ page }) => {
  await page.goto('/'); await page.route(api, route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { status: 'UNAVAILABLE' } }) }));
  await page.getByRole('button', { name: '로그인하기 →' }).click(); await page.getByRole('button', { name: '처음이신가요? 가입하기' }).click(); await page.getByLabel('이메일', { exact: true }).fill(email()); await page.getByLabel('비밀번호', { exact: true }).fill(password); await page.getByRole('button', { name: '이메일로 시작하기', exact: true }).click();
  await expect(page.locator('.account-pill')).toContainText('연결 확인 필요'); await expect(page.locator('.empty-state')).toContainText('불러오지 못했어요');
  await page.getByRole('button', { name: '계정', exact: true }).click(); await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page.locator('.guest-notice')).toContainText('사이트 데이터 삭제');
  await page.evaluate(() => { IDBObjectStore.prototype.add = () => { throw new DOMException('Synthetic quota', 'QuotaExceededError'); }; });
  await add(page); await expect(page.locator('.form-error')).toContainText('마치지 못했어요'); await expect(page.getByLabel('장소 이름')).toHaveValue('가상 장소'); await expect(page.locator('.place-card')).toHaveCount(0);
});

test('mail requests use Korean, enforce a resend cooldown, protect existence and surface reset configuration errors', async ({ page }) => {
  await page.clock.install(); await page.goto('/'); const address = await signup(page); const requests = [];
  page.on('request', request => { if (request.url().includes('accounts:sendOobCode')) requests.push(request.headers()['x-firebase-locale']); });
  await page.getByRole('button', { name: '계정', exact: true }).click(); await expect(page.getByRole('button', { name: /^확인 메일 보내기/ })).toBeDisabled();
  await page.clock.fastForward(61000); await page.getByRole('button', { name: /^확인 메일 보내기/ }).click(); await expect(page.getByRole('button', { name: /^확인 메일 보내기/ })).toBeDisabled(); expect(requests).toEqual(['ko']);
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  for (const target of [email(), address]) {
    await page.getByRole('button', { name: '로그인하기 →' }).click(); await page.getByRole('button', { name: '비밀번호를 잊었어요' }).click(); await page.getByLabel('이메일', { exact: true }).fill(target); await page.getByRole('button', { name: /^재설정 메일 요청/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('#toast')).toContainText('가입된 이메일이라면'); await page.clock.fastForward(61000);
  }
  await page.route('**/accounts:sendOobCode*', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { message: 'OPERATION_NOT_ALLOWED' } }) }));
  await page.getByRole('button', { name: '로그인하기 →' }).click(); await page.getByRole('button', { name: '비밀번호를 잊었어요' }).click(); await page.getByLabel('이메일', { exact: true }).fill(address); await page.getByRole('button', { name: /^재설정 메일 요청/ }).click();
  await expect(page.locator('.form-error')).toContainText('마치지 못했어요'); await expect(page.getByRole('dialog', { name: '비밀번호 재설정' })).toBeVisible();
});

test('list scale: 0/200/201/2500 rows keep full counts/search with 50 initial cards and record local timing', async ({ page }) => {
  await page.goto('/'); await signup(page); const measurements = [];
  for (const count of [0, 200, 201, 2500]) {
    const records = Array.from({ length: count }, (_, i) => ({ ...input(i), memo: count === 2500 ? '한'.repeat(50) : '', id: `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`, revision: 1, state: 'saved', createdAt: i, updatedAt: i, deletedAt: null }));
    const publicBytes = Buffer.byteLength(JSON.stringify(records)); const storedRecordBytes = records.reduce((sum, row) => sum + Buffer.byteLength(JSON.stringify({ ...row, canonicalSource: '', createRequestId: row.id, lastRequestId: row.id, createFingerprint: 'a'.repeat(64), lastFingerprint: 'b'.repeat(64) })), 0); expect(storedRecordBytes).toBeLessThanOrEqual(2 * 1024 * 1024); let calls = 0;
    await page.unroute(api); await page.route(api, async route => { const { action, payload } = route.request().postDataJSON().data; if (action !== 'list') { await route.continue(); return; } calls++; const offset = payload?.cursor ? records.findIndex(row => row.id === payload.cursor) + 1 : 0; const items = records.slice(offset, offset + 200); await fulfill(route, { items, nextCursor: items.length === 200 ? items.at(-1).id : '' }); });
    const start = Date.now(); await page.reload(); await expect.poll(() => calls).toBe(Math.floor(count / 200) + 1); await expect(page.locator('.account-pill')).toContainText('계정에 보관 중'); await expect(page.locator('#result-count')).toHaveText(`${count}개`); await expect(page.locator('.place-card')).toHaveCount(Math.min(count, 50));
    measurements.push({ records: count, publicBytes, storedRecordBytes, listCalls: calls, firstDisplayMs: Date.now() - start, initialCards: Math.min(count, 50) });
    expect(calls).toBe(Math.floor(count / 200) + 1); await expect(page.locator('.list-heading')).toContainText('최근 수정순');
    if (count > 50) { await page.getByRole('button', { name: /^50개 더 보기/ }).click(); await expect(page.locator('.place-card')).toHaveCount(100); await page.getByRole('searchbox').fill(`가상 장소 ${count - 1}`); await expect(page.locator('.place-card h3')).toHaveText(`가상 장소 ${count - 1}`); }
  }
  await writeFile('../tmp/codex/WEB-06-list-measurements.json', JSON.stringify(measurements, null, 2) + '\n');
});
