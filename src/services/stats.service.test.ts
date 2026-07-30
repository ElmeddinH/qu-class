// @vitest-environment node
// ============================================================================
// src/services/stats.service.test.ts
// Blok 12A · tapıntı P3 — 🔴 TƏLƏ T43
//
// SUAL: aqreqasiyanın MƏLUMATI və ŞƏFFAFLIQ SAYĞACLARI eyni snapshot-dan
// gəlirmi?
//
// `getCareerOutcomeStats` üç şey oxuyur:
//   · xam sətirlər        → `respondentCount` və bütün xanalar
//   · razılıq verənlərin sayı → `totalConsented`
//   · sinif ölçüsü        → `memberCount`
//
// Bunlar AYRI sorğular kimi (`Promise.all`) getsəydi, aralarında bir istifadəçi
// `includeInStats`-ı söndürdükdə uyğunsuz cütlük yaranardı («6 nəfərdən 7-si
// razılıq verib»). Fərq ölçülə bilən siqnaldır: iki yükləmə arasında razılığını
// geri götürən KONKRET şəxsin mövcudluğu şəffaflıq zolağından oxunur —
// klassik TOCTOU. Layihənin qaydası (`admin-users.service.ts` → rol dəyişikliyi)
// sayımı TRANSAKSİYA İÇİNDƏ tələb edir.
//
// ⚠️ Yarış halını vaxta görə sınamaq qeyri-deterministikdir, ona görə qayda
// STRUKTUR olaraq ölçülür — `audit.service.test.ts`-in mənbə skanı ilə eyni
// yanaşma. Modul import edilmir: yalnız mətn oxunur, DB bağlantısı açılmır.
// ============================================================================

import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

/** Şərhlər atılır — fayl başlığı qaydanı İZAH edir, kod deyil. */
async function readCode(relative: string): Promise<string> {
  const source = await readFile(new URL(relative, import.meta.url), "utf8");
  return source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
    .join("\n");
}

describe("🔴 T43 — aqreqasiya sayımı transaksiya içindədir", () => {
  it("`getCareerOutcomeStats` `$transaction` işlədir", async () => {
    const code = await readCode("./stats.service.ts");

    expect(code, "aqreqasiya oxunuşları `$transaction`-a alınmayıb").toMatch(
      /\$transaction\s*\(/,
    );
  });

  it("🔴 sətir, sayğac və üzv sayı AYRI `Promise.all` sorğuları kimi getmir", async () => {
    const code = await readCode("./stats.service.ts");

    // `getCareerOutcomeStats`-ın gövdəsi — növbəti `export`-a qədər.
    const start = code.indexOf("export async function getCareerOutcomeStats");
    expect(start, "`getCareerOutcomeStats` tapılmadı").toBeGreaterThan(-1);
    const rest = code.slice(start + 1);
    const end = rest.indexOf("\nexport ");
    const body = end === -1 ? rest : rest.slice(0, end);

    // ⚠️ `Promise.all` transaksiyanın İÇİNDƏ də qadağandır: interaktiv
    // transaksiyada paralel sorğular eyni bağlantını paylaşmır və qaydanı
    // pozar. Ardıcıl `await`-lər tələb olunur.
    expect(
      body,
      "`getCareerOutcomeStats` hələ də `Promise.all` ilə üç ayrı snapshot oxuyur",
    ).not.toMatch(/Promise\.all/);

    expect(body, "oxunuşlar transaksiya klienti ilə aparılmır").toMatch(/\$transaction/);
  });

  it("`countConsentedMembers` transaksiya klientini arqument kimi alır", async () => {
    const code = await readCode("./stats.service.ts");

    // Köməkçilər `prisma`-nı BİRBAŞA tutsaydı, transaksiyaya girmirdilər.
    expect(code).toMatch(/async function countConsentedMembers\([^)]*client/);
    expect(code).toMatch(/async function fetchCareerStatsRows\([^)]*client/);
  });
});
