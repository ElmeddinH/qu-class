// ============================================================================
// scripts/copy-swagger.mjs
// `swagger-ui-dist` aktivlərini `public/swagger/`-ə köçürür.
//
// 🔴 NİYƏ CDN DEYİL: müdafiə otağında internet olmaya bilər. Swagger UI-ı
// `unpkg.com`-dan yükləsəydik `/docs` boş ağ səhifə kimi görünərdi və bunu
// təqdimat anında düzəltmək mümkün olmazdı. Aktivlər lokal `public/`-dədir,
// yəni səhifə tamamilə OFLAYN işləyir.
//
// 🔴 NİYƏ `node_modules`-dan BİRBAŞA VERİLMİR: Next.js yalnız `public/`
// qovluğunu statik olaraq xidmət edir; `node_modules` istehsal build-inə
// düşmür.
//
// 🔴 NİYƏ REPOYA GİRMİR: aktivlər TÖRƏMƏDİR (`.gitignore` → `/public/swagger/`).
// `predev` / `prebuild` hook-ları onları hər dəfə yenidən qurur, yəni
// `swagger-ui-dist` versiyası dəyişəndə köhnə fayl qalmır.
//
// ⚠️ Yalnız ÜÇ fayl köçürülür. `swagger-ui-es-bundle*.js` və `*.map` faylları
// ~15 MB-dır və brauzer onları heç vaxt istəmir (səhifə klassik `<script>`
// bundle-ını işlədir). Hamısını köçürsək `public/` şişər və build yavaşlayar.
// ============================================================================

import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

/** Səhifənin (`(public)/docs/page.tsx`) HƏQİQƏTƏN yüklədiyi fayllar. */
const ASSETS = [
  "swagger-ui.css",
  "swagger-ui-bundle.js",
  "swagger-ui-standalone-preset.js",
];

const TARGET_DIR = join(process.cwd(), "public", "swagger");

function resolveDistDir() {
  try {
    // `package.json`-a görə həll edilir: paketin `main` sahəsi versiyalar
    // arasında dəyişə bilər, `package.json` isə həmişə kökdədir.
    return dirname(require.resolve("swagger-ui-dist/package.json"));
  } catch {
    return null;
  }
}

function main() {
  const distDir = resolveDistDir();

  if (!distDir) {
    // ⚠️ Sıfırdan fərqli kodla ÇIXMIR: `prebuild` hook-u sınsa `npm run build`
    // də dayanardı. Sənəd səhifəsi olmayan build yenə də etibarlıdır.
    console.warn(
      "[copy-swagger] «swagger-ui-dist» tapılmadı — `npm i -D swagger-ui-dist` işlədin. " +
        "/docs səhifəsi aktivsiz qalacaq.",
    );
    return;
  }

  mkdirSync(TARGET_DIR, { recursive: true });

  let copied = 0;
  for (const asset of ASSETS) {
    const from = join(distDir, asset);
    if (!existsSync(from)) {
      console.warn(`[copy-swagger] ${asset} paketdə yoxdur — atlanıldı.`);
      continue;
    }

    const to = join(TARGET_DIR, asset);
    copyFileSync(from, to);
    copied += 1;
    console.log(`[copy-swagger] ${asset} → public/swagger/ (${statSync(to).size} bayt)`);
  }

  console.log(`[copy-swagger] ${copied}/${ASSETS.length} fayl hazırdır.`);
}

main();
