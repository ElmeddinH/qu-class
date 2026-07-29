import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // Playwright e2e testləri `npm run test:e2e` ilə ayrıca işləyir —
    // vitest onları götürməməlidir.
    //
    // ⚠️ `tests/integration/**` REAL bazaya (prisma/dev.db) qarşı işləyir və
    // yalnız OXUYUR. Seed edilmiş baza tələb olunur (`npm run db:seed`).
    // Həmin fayllar `// @vitest-environment node` ilə jsdom-dan çıxır —
    // Prisma brauzer mühitində işləmir.
    include: [
      "src/**/*.test.{ts,tsx}",
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules/**", ".next/**", "tests/e2e/**"],

    // 🔴 FAYLLAR ARDICIL İŞLƏYİR — Blok 7-də məcburi oldu.
    //
    // `tests/integration/*` TƏK bir SQLite faylını (`prisma/dev.db`) paylaşır.
    // Blok 6-ya qədər bütün inteqrasiya testləri yalnız OXUYURDU, ona görə
    // paralellik zərərsiz idi. Blok 7-nin `profile.db.test.ts`-i isə YAZIR
    // (profil redaktəsi, karyera qeydləri, dəstək təklifləri) və onun yazıları
    // `visibility.db.test.ts`-in ölçdüyü QLOBAL aqreqasiyanı sorğular ARASINDA
    // dəyişirdi: "`includeInStats = false` qeydləri SAYMIR" testi təsadüfən
    // qırılırdı.
    //
    // Alternativ (yazan testi ayrıca layihəyə çıxarmaq) daha mürəkkəbdir;
    // bütün dəst onsuz da ~4 saniyəyə işləyir, ona görə sadə həll seçilib.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      // tsconfig.json → compilerOptions.paths: { "@/*": ["./src/*"] }
      // İkisi bir-birindən ayrılmamalıdır.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
