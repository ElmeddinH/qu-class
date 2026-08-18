// ---------------------------------------------------------------------------
// SƏNƏD ↔ KOD UZLAŞMASI — «rəqəm sənəddə donur» sinfinin qoruyucusu
// ---------------------------------------------------------------------------
//
// 🔴 NİYƏ VAR. Təhvil auditi (`docs/HANDOVER-AUDIT.md` §8) sənəddə ölçülməmiş
// və ya köhnəlmiş DÖRD rəqəm tapdı (Lighthouse mobil minimumu iki yerdə 87
// yazılmışdı — faktiki 85; bir qərar etiketi QD-004 idi — faktiki QD-003).
// Bu, təsadüfi səhv deyil, TƏKRARLANAN SİNİFDİR: kod dəyişir, sənəddəki rəqəm
// olduğu yerdə qalır və heç nə qırılmır. Aşağıdakı testlər həmin sinfi qapıya
// bağlayır — rəqəm koddan HESABLANIR və sənəddən OXUNUR, ikisi tutuşdurulur.
//
// ⚠️ QƏSDƏN YOXLANMAYANLAR — dairəvi olduğu üçün:
//   · test sayı (`vitest` / `playwright`) — testin özü onu dəyişir;
//   · commit sayı — hər commit-də köhnəlir;
//   · sətir sayları — formatlaşdırma ilə tərpənir və sənəd onları «təxmini»
//     kimi verir.
// Yoxlananlar YALNIZ diskrеt, təkrar-hesablana bilən struktur ölçüləridir.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CONTROLLED_PROFILE_FIELDS } from "@/lib/visibility";

const root = process.cwd();
const METRICS = readFileSync(join(root, "docs", "METRICS.md"), "utf8");

/**
 * Sənəddən bir rəqəm çıxarır. Nümunə tapılmazsa test AÇIQ şəkildə sınır —
 * yəni sənəd yenidən formatlanıbsa qoruyucu səssizcə «keçmir», xəbər verir.
 */
function docNumber(source: string, label: string, pattern: RegExp): number {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(
      `«${label}» üçün sənəd nümunəsi tapılmadı (${pattern}). ` +
        `Sənəd yenidən formatlanıbsa bu testdəki regex də yenilənməlidir.`,
    );
  }
  return Number(match[1].replace(/\s/g, ""));
}

/** Qovluğu rekursiv gəzir, fayl yollarını qaytarır. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function countDirs(dir: string): number {
  return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory())
    .length;
}

describe("docs/METRICS.md — sənəddəki rəqəmlər kodla uzlaşır", () => {
  it("Prisma modeli sayı", () => {
    const documented = docNumber(METRICS, "Prisma modeli", /\|\s*Prisma modeli\s*\|\s*\*\*([\d\s]+)\*\*/);
    const schema = readFileSync(join(root, "prisma", "schema.prisma"), "utf8");
    const actual = (schema.match(/^model /gm) ?? []).length;
    expect(actual, "prisma/schema.prisma → `^model `").toBe(documented);
  });

  it("miqrasiya sayı", () => {
    const documented = docNumber(METRICS, "Miqrasiya", /\|\s*Miqrasiya\s*\|\s*\*\*([\d\s]+)\*\*/);
    const actual = countDirs(join(root, "prisma", "migrations"));
    expect(actual, "prisma/migrations/ altındakı qovluqlar").toBe(documented);
  });

  it("səhifə (`page.tsx`) sayı", () => {
    const documented = docNumber(METRICS, "Səhifə", /\|\s*Səhifə \(`page\.tsx`\)\s*\|\s*\*\*([\d\s]+)\*\*/);
    const actual = walk(join(root, "src", "app")).filter((f) =>
      f.endsWith(`${"/"}page.tsx`),
    ).length;
    expect(actual, "src/app/**/page.tsx").toBe(documented);
  });

  it("`/api/v1` endpoint sayı", () => {
    const documented = docNumber(METRICS, "REST endpoint", /\|\s*REST endpoint \(`\/api\/v1`\)\s*\|\s*\*\*([\d\s]+)\*\*/);
    const actual = walk(join(root, "src", "app", "api", "v1")).filter((f) =>
      f.endsWith(`${"/"}route.ts`),
    ).length;
    expect(actual, "src/app/api/v1/**/route.ts").toBe(documented);
  });

  it("React komponenti sayı", () => {
    const documented = docNumber(METRICS, "React komponenti", /\|\s*React komponenti \(`src\/components\/`\)\s*\|\s*\*\*([\d\s]+)\*\*/);
    const actual = walk(join(root, "src", "components")).filter(
      (f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"),
    ).length;
    expect(actual, "src/components/**/*.tsx (testlər xaric)").toBe(documented);
  });

  it("xüsusiyyət modulu sayı", () => {
    const documented = docNumber(METRICS, "Xüsusiyyət modulu", /\|\s*Xüsusiyyət modulu \(`src\/features\/\*`\)\s*\|\s*\*\*([\d\s]+)\*\*/);
    const actual = countDirs(join(root, "src", "features"));
    expect(actual, "src/features/*/").toBe(documented);
  });

  it("servis faylı sayı", () => {
    const documented = docNumber(METRICS, "Servis faylı", /\|\s*Servis faylı \(`src\/services\/\*`\)\s*\|\s*\*\*([\d\s]+)\*\*/);
    const actual = readdirSync(join(root, "src", "services")).filter(
      (f) => f.endsWith(".ts") && !f.includes(".test."),
    ).length;
    expect(actual, "src/services/*.ts (testlər xaric)").toBe(documented);
  });

  // 🔴 Blok 12B-də `coverUrl` 22-ci idarə olunan sahə kimi əlavə olundu və
  // sənəddəki «22 sahə» rəqəmi əl ilə yeniləndi. Növbəti sahə əlavə olunanda
  // bu test onu unutmağa qoymur.
  it("idarə olunan profil sahəsi sayı (`CONTROLLED_PROFILE_FIELDS`)", () => {
    const documented = docNumber(
      METRICS,
      "idarə olunan profil sahəsi",
      /\*\*125 istifadəçi × ([\d]+) sahə\*\*/,
    );
    expect(CONTROLLED_PROFILE_FIELDS.length, "src/lib/visibility.ts").toBe(
      documented,
    );
  });

  it("`FieldVisibility` seed sətri = istifadəçi × sahə", () => {
    const rows = docNumber(METRICS, "FieldVisibility sətri", /`FieldVisibility` = ([\d\s]+) sətir/);
    const users = docNumber(METRICS, "istifadəçi sayı", /\*\*([\d]+) istifadəçi ×/);
    const fields = docNumber(METRICS, "sahə sayı", /istifadəçi × ([\d]+) sahə\*\*/);
    expect(users * fields, "125 × 22 hesabı").toBe(rows);
    expect(fields, "sənəddəki sahə sayı koddakı ilə eynidir").toBe(
      CONTROLLED_PROFILE_FIELDS.length,
    );
  });
});

// ---------------------------------------------------------------------------
// Lighthouse — auditin tapdığı SƏHVİN DƏQİQ NÜSXƏSİ
// ---------------------------------------------------------------------------
//
// Mobil bal koddan hesablana bilmir (ölçmə tələb edir), amma İZLƏNƏN xülasə
// (`docs/lighthouse/mobile/README.md`) həqiqətin mənbəyidir. `METRICS.md`
// oradakı diapazonu təkrar yazır — məhz bu təkrar 87-də donub qalmışdı.
// Aşağıdakı test iki SƏNƏDİ tutuşdurur, yəni xülasə yenidən ölçüləndə
// `METRICS.md`-in geri qalması dərhal qırılır.
describe("Lighthouse mobil diapazonu izlənən xülasə ilə uzlaşır", () => {
  const summaryPath = join(root, "docs", "lighthouse", "mobile", "README.md");

  it("izlənən xülasə mövcuddur (JSON artefaktları `.gitignore`-dadır)", () => {
    expect(statSync(summaryPath).isFile()).toBe(true);
  });

  it("`METRICS.md`-dəki diapazon xülasədəki min–max ilə eynidir", () => {
    const summary = readFileSync(summaryPath, "utf8");
    // `| `/home` | 86 ❌ | …` → cədvəlin İLK rəqəm sütunu = Performance
    const scores = [...summary.matchAll(/^\|\s*`[^`]+`\s*\|\s*(\d+)\s*[✅❌]/gmu)].map(
      (m) => Number(m[1]),
    );
    expect(scores.length, "xülasədə səhifə sətri tapılmalıdır").toBeGreaterThan(0);

    const low = docNumber(METRICS, "Lighthouse mobil minimum", /\*\*(\d+)–\d+\*\* Performance/);
    const high = docNumber(METRICS, "Lighthouse mobil maksimum", /\*\*\d+–(\d+)\*\* Performance/);

    expect(Math.min(...scores), "xülasədəki ən aşağı Performance").toBe(low);
    expect(Math.max(...scores), "xülasədəki ən yüksək Performance").toBe(high);
  });
});
