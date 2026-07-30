// ============================================================================
// tests/e2e/api-docs.spec.ts
// Blok 9S — sprint kriteriyası: "endpoint-lər Swagger üzərindən test edilə bilir".
//
// 🔴 FAYLIN ƏSAS SUALI: /docs HƏQİQƏTƏN İŞLƏYİRMİ?
// Swagger UI xarici kitabxanadır və səhvi SƏSSİZDİR: aktiv yüklənməsə səhifə
// sadəcə boş qalır, konsolda bir sətir yazılır. Ona görə render `.swagger-ui`
// selektoru ilə yoxlanılır, "səhifə 200 verdi" ilə DEYİL.
//
// ⚠️ Aktivlər LOKALDIR (`public/swagger/`). Test onların CDN-dən yüklənmədiyini
// də yoxlayır — oflayn demoda (müdafiə otağı) səhifə boş qalmasın.
// ============================================================================

import { expect, test, type Page } from "@playwright/test";

/**
 * Swagger UI-ın kökü.
 *
 * ⚠️ `.first()` MƏCBURİDİR: `swagger-ui` sinfi İKİ elementə düşür — xarici
 * `<section class="swagger-ui swagger-container">` və daxili `<div class="swagger-ui">`
 * (StandaloneLayout belə qurur). `.first()` olmadan Playwright strict mode
 * pozuntusu verir.
 */
function swaggerRoot(page: Page) {
  return page.locator(".swagger-ui").first();
}

test("/docs açılır və Swagger UI render olunur", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const response = await page.goto("/docs");
  expect(response?.status()).toBe(200);

  await expect(page.getByRole("heading", { name: "API sənədləri" })).toBeVisible();

  // 🔴 Swagger UI-ın öz kökü — bundle işə düşməsə bu element YARANMIR.
  await expect(swaggerRoot(page)).toBeVisible({ timeout: 30_000 });

  // Sənəd yükləndi: başlıq Swagger UI-ın içində göstərilir.
  await expect(swaggerRoot(page)).toContainText("QU CLASS API", {
    timeout: 30_000,
  });

  expect(consoleErrors, "brauzer konsolunda xəta var").toEqual([]);
});

test("Swagger UI bütün v1 taqlarını göstərir", async ({ page }) => {
  await page.goto("/docs");
  await expect(swaggerRoot(page)).toBeVisible({ timeout: 30_000 });

  const ui = swaggerRoot(page);
  for (const tag of ["Auth", "Public", "Cohorts", "Events", "Search", "System"]) {
    await expect(ui, `«${tag}» taqı`).toContainText(tag);
  }
});

test("əməliyyat siyahısında əsas endpoint-lər görünür", async ({ page }) => {
  await page.goto("/docs");
  await expect(swaggerRoot(page)).toBeVisible({ timeout: 30_000 });

  const ui = swaggerRoot(page);
  for (const path of [
    "/api/v1/auth/login",
    "/api/v1/auth/session",
    "/api/v1/cohorts",
    "/api/v1/cohorts/{slug}/posts",
    "/api/v1/search",
    "/api/v1/health",
  ]) {
    await expect(ui, `«${path}» əməliyyatı`).toContainText(path);
  }
});

test("🔴 aktivlər LOKALDIR — CDN sorğusu yoxdur (oflayn demo)", async ({ page }) => {
  const externalRequests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith("http://127.0.0.1") && !url.startsWith("http://localhost")) {
      externalRequests.push(url);
    }
  });

  await page.goto("/docs");
  await expect(swaggerRoot(page)).toBeVisible({ timeout: 30_000 });

  expect(externalRequests, "Swagger UI xarici host-dan yükləndi").toEqual([]);
});

test("swagger aktivləri 200 qaytarır", async ({ request }) => {
  for (const asset of [
    "/swagger/swagger-ui.css",
    "/swagger/swagger-ui-bundle.js",
    "/swagger/swagger-ui-standalone-preset.js",
  ]) {
    const response = await request.get(asset);
    expect(response.status(), `${asset} statusu`).toBe(200);
  }
});

test("openapi.json etibarlı sənəddir və hər əməliyyatda operationId var", async ({
  request,
}) => {
  const response = await request.get("/api/v1/openapi.json");
  expect(response.status()).toBe(200);

  const document = (await response.json()) as {
    openapi: string;
    info: { title: string; version: string };
    paths: Record<string, Record<string, { operationId?: string; tags?: string[] }>>;
    components: { securitySchemes: Record<string, { name?: string }> };
  };

  expect(document.openapi).toMatch(/^3\.0\./);
  expect(document.info.title).toBe("QU CLASS API");

  const methods = ["get", "post", "put", "patch", "delete"];
  let count = 0;

  for (const [path, item] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (!methods.includes(method)) continue;
      count += 1;
      expect(operation.operationId, `${method} ${path} — operationId yoxdur`).toBeTruthy();
      expect(operation.tags?.length, `${method} ${path} — taq yoxdur`).toBe(1);
    }
  }

  expect(count).toBe(18);

  // Kuka adı sənəddə göstərilir — «Try it out» üçün kritikdir.
  expect(document.components.securitySchemes.cookieAuth?.name).toContain(
    "authjs.session-token",
  );
});
