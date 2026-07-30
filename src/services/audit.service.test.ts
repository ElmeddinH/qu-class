// @vitest-environment node
// ============================================================================
// src/services/audit.service.test.ts
// 🔴 TƏLƏ D — AUDIT JURNALI YALNIZ ƏLAVƏ OLUNUR.
//
// Bu fayl BAZAYA MÜRACİƏT ETMİR: modulun İXRACLARINI gəzir və silmə / redaktə
// funksiyasının OLMADIĞINI bərkidir. Sadə struktur testidir, amma qorumanın
// ən vacib qatıdır — kimsə «admin panelindən köhnə sətirləri təmizləmək»
// tələbi ilə gəlsə, test dayanacaq və qərar yenidən müzakirə olunacaq.
//
// Qadağa üç yerdə eynidir:
//   1. bu modul (burada ölçülür)
//   2. `/admin/audit` səhifəsi — silmə düyməsi yoxdur (e2e ölçür)
//   3. `/api/v1/admin/audit` — yalnız `GET` (openapi.test.ts ölçür)
//
// ⚠️ Modulu import etmək Prisma CLIENT-ini yükləyir, amma BAĞLANTI AÇMIR —
// heç bir sorğu çağırılmır.
// ============================================================================

import { describe, expect, it } from "vitest";

import * as auditService from "./audit.service";

/** İxracın adı yazma niyyəti bildirirmi? */
const MUTATING_NAME = /(delete|remove|purge|clear|truncate|update|edit|reset|wipe)/i;

describe("audit.service modulunun ixracları", () => {
  const names = Object.keys(auditService);

  it("modul boş deyil (test səhvən keçməsin)", () => {
    expect(names.length).toBeGreaterThan(0);
  });

  it("🔴 SİLMƏ / REDAKTƏ ixracı YOXDUR", () => {
    const offenders = names.filter((name) => MUTATING_NAME.test(name));
    expect(
      offenders,
      `audit jurnalını dəyişən ixrac(lar) tapıldı: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("YALNIZ BİR yazma yolu var və o, ƏLAVƏ EDİR", () => {
    // `recordAudit` sətir YARADIR (`create`), mövcud sətrə toxunmur.
    expect(names).toContain("recordAudit");
    expect(typeof auditService.recordAudit).toBe("function");
  });

  it("qalan ixraclar OXU səthidir", () => {
    const readers = [
      "listAuditLog",
      "countAuditLog",
      "listAuditFacets",
      "listRecentAudit",
    ];
    for (const reader of readers) {
      expect(names, `${reader} ixrac olunmur`).toContain(reader);
    }
  });

  it("🔴 `recordAudit` MƏNBƏ MƏTNİNDƏ `delete`/`update` çağırışı yoxdur", async () => {
    // İxrac adları kifayət deyil: funksiya daxilində `tx.auditLog.deleteMany`
    // yazmaq mümkündür. Mənbə oxunub yoxlanılır.
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
      new URL("./audit.service.ts", import.meta.url),
      "utf8",
    );

    // ⚠️ ŞƏRHLƏR ATILIR: fayl başlığı seed-in `auditLog.deleteMany()`
    // çağırışını İZAH EDİR (seed servis qatından keçmir) və xam mətndə
    // axtarsaq test öz sənədinə görə qırılardı.
    const code = source
      .split("\n")
      .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
      .join("\n");

    expect(code).not.toMatch(/auditLog\.(delete|deleteMany|update|updateMany|upsert)\s*\(/);
    expect(code).toMatch(/auditLog\.create\s*\(/);
  });

  // ==========================================================================
  // 🔴 T42 (Blok 12A) — `recordAudit` YEGANƏ yazma yoludur
  // ==========================================================================
  //
  // Ağ siyahı (`safeAuditMetadata`) YALNIZ `recordAudit`-in içindədir. Kimsə
  // servisdə birbaşa `prisma.auditLog.create({ metadata: JSON.stringify(...) })`
  // yazsa, süzgəc TƏTBİQ OLUNMUR — və növbəti dəyişiklik oraya `body:
  // post.body` əlavə etsə, şikayət edilmiş `PRIVATE` paylaşımın MƏTNİ
  // `/admin/audit` səhifəsində peyda olar (bax fayl başlığındakı «metadata —
  // AĞ SİYAHI» qeydi).
  //
  // Ona görə bütün servis qatı skan olunur: `auditLog.create` YALNIZ
  // `audit.service.ts`-də ola bilər.
  it("🔴 T42 — servis qatında BİRBAŞA `auditLog.create` yoxdur", async () => {
    const { readFile, readdir } = await import("node:fs/promises");
    const servicesDir = new URL("./", import.meta.url);

    const files = (await readdir(servicesDir)).filter(
      (name) => name.endsWith(".service.ts") && name !== "audit.service.ts",
    );
    expect(files.length, "servis faylı tapılmadı — test səhvən keçməsin").toBeGreaterThan(5);

    const offenders: string[] = [];
    for (const name of files) {
      const source = await readFile(new URL(name, servicesDir), "utf8");
      const code = source
        .split("\n")
        .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
        .join("\n");

      if (/auditLog\.create\s*\(/.test(code)) offenders.push(name);
    }

    expect(
      offenders,
      `birbaşa \`auditLog.create\` çağıran servis(lər): ${offenders.join(", ")} — ` +
        "`recordAudit(tx, …)` işlət, əks halda `safeAuditMetadata()` ağ siyahısı atlanır",
    ).toEqual([]);
  });
});
