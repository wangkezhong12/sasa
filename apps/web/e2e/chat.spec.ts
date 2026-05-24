import { test, expect } from '@playwright/test';

/** Helper: register + login, return page */
async function loginAs(page: any) {
  const timestamp = Date.now();
  const email = `e2e-chat-${timestamp}@example.com`;
  await page.goto('/register');
  await page.getByLabel('姓名').fill('Chat User');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill('password123');
  await page.getByRole('button', { name: '注册' }).click();
  await page.waitForURL(/\/login/);
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码').fill('password123');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForURL(/\/chat/);
}

test.describe('Chat Flow', () => {
  test('should show chat page after login', async ({ page }) => {
    await loginAs(page);
    await expect(page.getByText('选择一个对话或创建新对话开始')).toBeVisible();
  });

  test('should show sidebar navigation', async ({ page }) => {
    await loginAs(page);
    await expect(page.getByText('对话')).toBeVisible();
    await expect(page.getByText('SaaS 管理')).toBeVisible();
    await expect(page.getByText('工作空间')).toBeVisible();
    await expect(page.getByText('设置')).toBeVisible();
  });

  test('should navigate to chat page via sidebar', async ({ page }) => {
    await loginAs(page);
    await page.getByText('SaaS 管理').click();
    await expect(page).toHaveURL(/\/saas/);
    await page.getByText('对话').click();
    await expect(page).toHaveURL(/\/chat/);
  });

  test('should show version info in sidebar', async ({ page }) => {
    await loginAs(page);
    await expect(page.getByText('Sasa AI Agent v0.1')).toBeVisible();
  });
});
