import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('登录 Sasa')).toBeVisible();
    await expect(page.getByLabel('邮箱')).toBeVisible();
    await expect(page.getByLabel('密码')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('注册').click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByText('注册 Sasa')).toBeVisible();
  });

  test('should register a new user', async ({ page }) => {
    const timestamp = Date.now();
    await page.goto('/register');
    await page.getByLabel('姓名').fill('E2E Test User');
    await page.getByLabel('邮箱').fill(`e2e-${timestamp}@example.com`);
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '注册' }).click();

    // Should redirect to login with registered=1
    await expect(page).toHaveURL(/\/login\?registered=1/);
  });

  test('should login and redirect to chat', async ({ page }) => {
    // Register first
    const timestamp = Date.now();
    const email = `e2e-login-${timestamp}@example.com`;
    await page.goto('/register');
    await page.getByLabel('姓名').fill('Login Test');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL(/\/login/);

    // Login
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '登录' }).click();

    // Should redirect to chat
    await expect(page).toHaveURL(/\/chat/);
    // Check sidebar is rendered
    await expect(page.locator('aside').getByText('Sasa', { exact: true })).toBeVisible();
  });

  test('should show error on wrong password', async ({ page }) => {
    // Register first
    const timestamp = Date.now();
    const email = `e2e-err-${timestamp}@example.com`;
    await page.goto('/register');
    await page.getByLabel('姓名').fill('Error Test');
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('password123');
    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForURL(/\/login/);

    // Login with wrong password
    await page.getByLabel('邮箱').fill(email);
    await page.getByLabel('密码').fill('wrongpassword');
    await page.getByRole('button', { name: '登录' }).click();

    // Should show error
    await expect(page.getByText(/邮箱或密码错误|登录失败/)).toBeVisible();
  });
});
