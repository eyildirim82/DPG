import { test, expect } from '@playwright/test';

async function mockRuntimeFlags(page) {
  await page.route('**/rest/v1/rpc/get_public_runtime_flags', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        countdown_enabled: true,
        applications_closed: true,
        checkin_enabled: true,
        otp_enabled: true,
        otp_bypass_enabled: false,
        checkin_actions_enabled: true,
      }),
    });
  });
}

async function mockOtpAndCheckinSuccess(page) {
  await page.route('**/functions/v1/send-bulk-email', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        masked_email: 'te***@example.com',
      }),
    });
  });

  await page.route('**/rest/v1/rpc/verify_checkin_otp', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        checkin_token: 'token-e2e-checkin',
        full_name: 'E2E Test Pilot',
        ticket_type: 'asil',
        status: 'pending',
        application_data: {
          name: 'E2E Test Pilot',
          email: 'test@example.com',
        },
      }),
    });
  });

  await page.route('**/rest/v1/rpc/checkin_confirm_and_continue', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, message: 'Check-in başarıyla tamamlandı.' }),
    });
  });
}

test.describe('Check-in Flow E2E', () => {
  test('happy path: OTP -> kişi listesi -> check-in tamamla', async ({ page }) => {
    await mockRuntimeFlags(page);
    await mockOtpAndCheckinSuccess(page);

    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Check-in' })).toBeVisible({ timeout: 10000 });

    await page.getByLabel('T.C. Kimlik Numarası').fill('10000000146');
    await page.getByRole('button', { name: 'OTP Kodu Gönder' }).click();

    await expect(page.getByText('Doğrulama kodu e-posta adresinize gönderildi.')).toBeVisible();

    await page.getByLabel('OTP Kodu').fill('123456');
    await page.getByRole('button', { name: 'OTP Doğrula' }).click();

    await expect(page.getByText('E2E Test Pilot')).toBeVisible();
    await expect(page.getByText('Bilet Tipi:')).toBeVisible();

    await page.getByLabel('Kişi adı').fill('Ali Veli');
    await page.getByRole('button', { name: 'Ekle' }).click();
    await expect(page.getByRole('button', { name: 'Ali Veli ×' })).toBeVisible();

    await page.getByRole('button', { name: 'Check-in yap ve Tercihleri Kaydet' }).click();
    await expect(page.getByText('Check-in işleminiz tamamlandı. Kişi tercih listeniz kaydedildi.')).toBeVisible();
  });

  test('kişi eklenmeden check-in butonu pasif kalır', async ({ page }) => {
    await mockRuntimeFlags(page);
    await mockOtpAndCheckinSuccess(page);

    await page.goto('/');

    await page.getByLabel('T.C. Kimlik Numarası').fill('10000000146');
    await page.getByRole('button', { name: 'OTP Kodu Gönder' }).click();
    await page.getByLabel('OTP Kodu').fill('123456');
    await page.getByRole('button', { name: 'OTP Doğrula' }).click();

    await expect(page.getByText('Henüz kişi tercihi eklenmedi.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check-in yap ve Tercihleri Kaydet' })).toBeDisabled();
  });
});
