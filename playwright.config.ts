import { defineConfig, devices } from "@playwright/test";

/**
 * E2E konfiqurasiyası.
 *
 * ⚠️ `next start` işlədilir (dev yox), çünki middleware, route qrupları və
 * `forbidden()` sərhədi məhz istehsal build-ində yoxlanılmalıdır.
 * Testdən əvvəl `npm run build` işlədilməlidir.
 *
 * Testlər `prisma/dev.db`-ni oxuyur (və qeydiyyat testi bir sətir yaradıb
 * özündən sonra təmizləyir) — seed edilmiş baza tələb olunur.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * UZAQ (canlı) ünvana qarşı işlətmək üçün: `E2E_BASE_URL=https://… npx playwright test`.
 *
 * 🔴 NİYƏ ŞƏRTLİ `webServer`. Bu blok verilmiş qalsaydı Playwright uzaq ünvana
 * qarşı işləyəndə DƏ lokal `next start` qaldırardı. `reuseExistingServer` isə
 * 3100-də onsuz da işləyən serveri götürür — nəticədə "canlı" adlanan dəst
 * səssizcə LOKAL bazanı yoxlayar və yaşıl nəticə heç nə sübut etməz.
 * Uzaq ünvan verilibsə lokal server ÜMUMİYYƏTLƏ qaldırılmır.
 */
const REMOTE_BASE_URL = process.env.E2E_BASE_URL?.trim();
const BASE_URL = REMOTE_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // ⚠️ `dev-smoke.spec.ts` DEV serverə (port 3000) bağlıdır, bu konfiq isə
  // istehsal build-ini 3100-də qaldırır — ayrıca konfiqi var:
  // `npm run test:e2e:dev` → playwright.dev.config.ts
  testIgnore: /dev-smoke\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "list" : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    locale: "az-AZ",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Uzaq ünvana qarşı işləyəndə lokal server QALDIRILMIR — yuxarıdaki izah.
  ...(REMOTE_BASE_URL
    ? {}
    : {
        webServer: {
          command: `npx next start --port ${PORT}`,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "pipe" as const,
          stderr: "pipe" as const,
        },
      }),
});
