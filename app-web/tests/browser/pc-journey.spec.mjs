import { test, expect } from '@playwright/test';

test('PC: guest record is explicitly moved to an account and visible in another browser', async ({ browser }) => {
  const password = 'PcLocalTestPassword123';
  const email = `pc-test-${crypto.randomUUID()}@example.invalid`;
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  try {
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    await first.goto('/');
    await expect(first.locator('.environment-note')).toContainText('로컬 검증 환경');
    await expect(first.locator('.guest-notice')).toBeVisible();
    await first.getByRole('button', { name: '장소 담기', exact: false }).first().click();
    await first.getByLabel('장소 이름').fill('PC 테스트 장소');
    await first.getByLabel('주소', { exact: true }).fill('가상시 테스트동 123');
    await first.getByRole('button', { name: '내 보관함에 담기' }).click();
    await expect(first.locator('.place-card h3')).toHaveText('PC 테스트 장소');

    await first.getByRole('button', { name: '로그인하기 →' }).click();
    await first.getByRole('button', { name: '처음이신가요? 가입하기' }).click();
    await first.getByLabel('이메일', { exact: true }).fill(email);
    await first.getByLabel('비밀번호', { exact: true }).fill(password);
    await first.getByRole('dialog').getByRole('button', { name: '이메일로 시작하기', exact: true }).click();
    await expect(first.locator('.account-pill')).toContainText('계정에 보관 중');
    await expect(first.locator('.place-card')).toHaveCount(0);
    await first.getByRole('button', { name: '계정에 담기 →' }).click();
    await first.getByRole('button', { name: '이 계정에 담기', exact: true }).click();
    await expect(first.locator('.place-card h3')).toHaveText('PC 테스트 장소');

    await second.goto('/');
    await second.getByRole('button', { name: '로그인하기 →' }).click();
    await second.getByLabel('이메일', { exact: true }).fill(email);
    await second.getByLabel('비밀번호', { exact: true }).fill(password);
    await second.getByRole('dialog').getByRole('button', { name: '로그인', exact: true }).click();
    await expect(second.locator('.place-card h3')).toHaveText('PC 테스트 장소');
    await second.locator('.place-card').getByRole('button').click();
    await second.getByLabel('가고 싶은 이유').fill('다른 세션에서 수정');
    await second.getByRole('button', { name: '변경 저장' }).click();
    await expect(second.getByRole('dialog')).toHaveCount(0);
    await first.getByRole('button', { name: '최신 기록 불러오기' }).click();
    await expect(first.locator('.place-card .memo')).toHaveText('다른 세션에서 수정');
    await first.reload();
    await expect(first.locator('.place-card .memo')).toHaveText('다른 세션에서 수정');

    await second.getByRole('button', { name: '계정', exact: true }).click();
    await second.getByRole('button', { name: '계정 탈퇴', exact: true }).click();
    await second.getByLabel('현재 비밀번호').fill(password);
    await second.getByRole('button', { name: '계정과 서버 기록 삭제', exact: true }).click();
    await expect(second.locator('.guest-notice')).toContainText('이 브라우저에만', { timeout: 45000 });
    await expect(second.locator('.place-card')).toHaveCount(0);
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});
