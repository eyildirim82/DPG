import { test, expect } from '@playwright/test';

async function forceApplicationOpen(page) {
  await page.addInitScript(() => {
    const RealDate = Date;
    const fixedMs = new RealDate('2026-03-05T10:00:00+03:00').getTime();

    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixedMs);
        } else {
          super(...args);
        }
      }
      static now() {
        return fixedMs;
      }
    }

    MockDate.UTC = RealDate.UTC;
    MockDate.parse = RealDate.parse;
    globalThis.Date = MockDate;
  });
}

async function setupRpcMocks(page, submitErrorMessage) {
  await page.route('**/rest/v1/rpc/get_ticket_stats', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_capacity: 1500,
        total_reserved: 100,
        asil_returning_reserved: 30,
        asil_returning_capacity: 400,
        asil_new_reserved: 70,
        asil_new_capacity: 300,
      }),
    });
  });

  await page.route('**/rest/v1/rpc/check_and_lock_slot', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: 'locked',
        ticket_type: 'asil',
        remaining_seconds: 600,
        lock_expires_at: '2026-03-05T10:10:00+03:00',
        is_attended_before: false,
        cancel_token: 'mock-token-submit-guards',
      }),
    });
  });

  await page.route('**/rest/v1/rpc/submit_application', (route) => {
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'P0001',
        message: submitErrorMessage,
        details: null,
        hint: null,
      }),
    });
  });
}

async function completeStep1(page) {
  await page.goto('/');

  await page.evaluate(() => {
    const el = document.querySelector('#basvur');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });

  await page.getByLabel('TC Kimlik No').fill('10000000146');
  await page.getByRole('button', { name: 'TC KİMLİK NUMARASINI DOĞRULA VE DEVAM ET' }).click();

  await expect(page.getByText('TC Kimlik No:')).toBeVisible({ timeout: 10000 });
}

async function fillRequiredStep2Fields(page) {
  await page.getByLabel('Ad Soyad').fill('E2E Test Pilot');
  await page.getByLabel('Havayolu Şirketi').selectOption('THY');
  await page.getByLabel('Filo Bilgisi').selectOption('B737');
  await page.getByLabel('Yaş Grubu').selectOption('26-35');
  await page.getByLabel('E-Posta Adresi').fill('e2e.test@example.com');
  await page.getByLabel('Telefon Numarası').fill('5551234567');

  await page.locator('input[type="checkbox"]').nth(1).check({ force: true });
  await page.locator('input[type="checkbox"]').nth(2).check({ force: true });
}

test.describe('Submit Guard E2E', () => {
  test('submit_application debtor hatasında güvenli kullanıcı mesajı gösterir', async ({ page }) => {
    await forceApplicationOpen(page);
    await setupRpcMocks(page, 'Aidat borcunuz bulunmaktadır, DPG etkinliği kayıt sistemini kullanabilmeniz için borcunuzu ödemeniz gerekmektedir.');

    await completeStep1(page);
    await fillRequiredStep2Fields(page);

    await page.getByRole('button', { name: 'Katılımımı Onayla' }).click();

    await expect(page.getByRole('alert')).toContainText('Başvuru gönderilemedi', { timeout: 10000 });
  });

  test('submit_application mükerrer başvuru hatasında güvenli kullanıcı mesajı gösterir', async ({ page }) => {
    await forceApplicationOpen(page);
    await setupRpcMocks(page, 'Bu TC kimlik numarası ile daha önce başvuru yapılmıştır.');

    await completeStep1(page);
    await fillRequiredStep2Fields(page);

    await page.getByRole('button', { name: 'Katılımımı Onayla' }).click();

    await expect(page.getByRole('alert')).toContainText('Başvuru gönderilemedi', { timeout: 10000 });
  });
});
