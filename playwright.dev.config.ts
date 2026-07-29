import { defineConfig, devices } from "@playwright/test";

/**
 * DEV serverə qarşı smoke konfiqurasiyası — `npm run test:e2e:dev`.
 *
 * ⚠️ Əsas `playwright.config.ts`-dən AYRIDIR, çünki o, istehsal build-ini
 * (`next start`, port 3100) qaldırır. Bu isə məhz F5-in qaldırdığı şeyi —
 * `npm run dev`-i, port 3000-i — yoxlayır. Bir konfiqdə birləşdirilsə hər iki
 * dəst eyni serverə düşərdi və "F5 işləyirmi?" sualına cavab verməzdi.
 *
 * `reuseExistingServer: true` — artıq işləyən dev serverə qoşulur (F5-dən
 * sonra əl ilə yoxlamaq üçün rahatdır).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /dev-smoke\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "az-AZ",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
