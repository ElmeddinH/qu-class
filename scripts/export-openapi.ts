// ============================================================================
// scripts/export-openapi.ts
// `buildOpenApiDocument()` nəticəsini `docs/openapi.json`-a yazır.
//
// 🔴 NİYƏ LAZIMDIR: sənəd indiyədək YALNIZ layihə işləyəndə mövcud idi
// (`/docs`, `/api/v1/openapi.json`). Layihəni qaldırmayan yoxlayıcı (məs.
// müdafiə komissiyası) heç bir Swagger faylı görmürdü. `docs/openapi.json`
// repoda saxlanılan STATİK snapshot-dır — `editor.swagger.io`-da birbaşa
// açıla bilər.
//
// ⚠️ SNAPSHOT-DIR, MƏNBƏ DEYİL: `src/lib/api/openapi.ts`-dəki Zod
// sxemlərindən törəyir. Kod dəyişəndə bu faylı YENİDƏN generasiya etmək
// lazımdır (`npm run docs:openapi`) — `openapi.test.ts`-dəki drift testi
// bunu unutduqda qırmızıya düşür.
// ============================================================================

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildOpenApiDocument } from "@/lib/api/openapi";

function countOperations(document: ReturnType<typeof buildOpenApiDocument>): number {
  return Object.values(document.paths ?? {}).reduce((count, item) => {
    const methods = ["get", "post", "put", "patch", "delete"];
    return count + methods.filter((method) => Boolean((item as Record<string, unknown>)[method])).length;
  }, 0);
}

function main(): void {
  const document = buildOpenApiDocument();
  const outPath = join(process.cwd(), "docs", "openapi.json");

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`);

  const pathCount = Object.keys(document.paths ?? {}).length;
  const operationCount = countOperations(document);

  console.log(`[export-openapi] ${outPath}`);
  console.log(`[export-openapi] ${pathCount} path / ${operationCount} operation`);
}

main();
