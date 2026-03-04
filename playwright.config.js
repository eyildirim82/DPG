// @ts-check
/**
 * Playwright E2E Test Konfigürasyonu
 *
 * Çalıştırma:
 *   npx playwright test
 *   npx playwright test --ui   (interaktif)
 */
import { defineConfig, devices } from '@playwright/test';

const localBaseURL = 'http://localhost:4173';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || localBaseURL;
const useLocalWebServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Dev server otomatik başlatma */
  webServer: useLocalWebServer
    ? {
        command: 'npm run dev -- --port 4173 --strictPort',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 30000,
        env: {
          ...process.env,
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
          VITE_SUPABASE_ANON_KEY:
            process.env.VITE_SUPABASE_ANON_KEY ||
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6NDA3MDkwODgwMH0.signature',
          VITE_E2E_FORCE_CHECKIN: process.env.VITE_E2E_FORCE_CHECKIN || 'true',
        },
      }
    : undefined,
});
