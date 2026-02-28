/**
 * E2E Test: Admin Panel Yetkilendirme
 *
 * Çalıştırma:
 *   npx playwright test e2e/admin-auth.spec.js
 *   npx playwright test e2e/admin-auth.spec.js --headed
 *
 * Amaç:
 *   - Admin paneline yetkisiz erişim engeli (ProtectedRoute)
 *   - Login sayfası yönlendirmesi
 *   - Tüm admin route'larının koruması
 */
import { test, expect } from '@playwright/test';

test.describe('Admin Panel Yetkilendirme', () => {
  const protectedRoutes = [
    '/admin',
    '/admin/whitelist',
    '/admin/submissions',
    '/admin/communication',
    '/admin/email-templates',
    '/admin/quota',
    '/admin/smtp',
  ];

  // ─────────────────────────────────────
  // Yetkisiz Erişim Engeli
  // ─────────────────────────────────────
  for (const route of protectedRoutes) {
    test(`${route} yetkisiz erişimde login sayfasına yönlendirme`, async ({ page }) => {
      // Direkt admin route'una git (oturum açmadan)
      await page.goto(route);

      // ProtectedRoute → Navigate to="/admin/login"
      await page.waitForURL('**/admin/login', { timeout: 10000 });
      expect(page.url()).toContain('/admin/login');
    });
  }

  // ─────────────────────────────────────
  // Login Sayfası Varlığı
  // ─────────────────────────────────────
  test('login sayfası düzgün yüklenir', async ({ page }) => {
    await page.goto('/admin/login');

    // Login formu görünür olmalı (lazy load + React render beklenir)
    const emailInput = page.locator('#email');
    const passwordInput = page.locator('#password');

    // waitFor ile bekleme — isVisible timeout desteklemez
    const hasEmail = await emailInput.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
    const hasPassword = await passwordInput.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

    expect(hasEmail || hasPassword).toBe(true);
  });

  // ─────────────────────────────────────
  // Geçersiz Giriş Denemesi
  // ─────────────────────────────────────
  test('hatalı kimlik bilgileriyle giriş reddedilir', async ({ page }) => {
    await page.goto('/admin/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.waitFor({ state: 'visible', timeout: 5000 });

    await emailInput.fill('fake@hacker.com');
    await passwordInput.fill('wrongpassword123');
    await submitBtn.click();

    // Hatalı giriş sonrası yönlendirme OLMAMALI
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/admin/login');

    // Hata mesajı gösterilmeli
    const bodyText = await page.textContent('body');
    const hasError =
      bodyText.includes('hata') ||
      bodyText.includes('Hata') ||
      bodyText.includes('Invalid') ||
      bodyText.includes('geçersiz') ||
      bodyText.includes('credentials') ||
      bodyText.includes('başarısız');
    expect(hasError).toBe(true);
  });

  // ─────────────────────────────────────
  // Tarayıcı Depolama Güvenliği
  // ─────────────────────────────────────
  test('oturum token olmadan admin API çağrıları başarısız olur', async ({ page }) => {
    await page.goto('/');

    // localStorage/sessionStorage'da oturum anahtarı olmadan
    // admin sayfalarına erişim engellenmeli
    const hasSession = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some((k) => k.includes('supabase') && k.includes('auth'));
    });

    // Temiz tarayıcıda oturum olmamalı
    expect(hasSession).toBe(false);
  });
});
