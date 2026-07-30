// ============================================================================
// src/lib/headline-stats.test.ts
// Class Page başlıq zolağının GİZLƏTMƏ qaydası (Blok 10A).
//
// Zolaq aqreqasiyadır və kiçik sinifdə saylar özü fərdi məlumatdır
// ("1 ölkədən" = konkret adamın harada olduğu). Qayda saf funksiyadadır, ona
// görə bazasız yoxlanılır; servis (`getCohortHeadlineStats`) onu çağırıb `null`
// qaytarır və komponent heç nə render etmir.
// ============================================================================

import { describe, expect, it } from "vitest";

import { HEADLINE_MIN_MEMBERS, isHeadlineStatsVisible } from "@/lib/headline-stats";
import { MIN_BUCKET_SIZE } from "@/lib/visibility";

describe("isHeadlineStatsVisible", () => {
  it("🔴 2 nəfərlik sinifdə zolaq YOXDUR", () => {
    expect(isHeadlineStatsVisible(2)).toBe(false);
  });

  it("boş və tək üzvlü sinifdə də yoxdur", () => {
    expect(isHeadlineStatsVisible(0)).toBe(false);
    expect(isHeadlineStatsVisible(1)).toBe(false);
  });

  it("həddə çatan sinifdə görünür", () => {
    expect(isHeadlineStatsVisible(HEADLINE_MIN_MEMBERS)).toBe(true);
    expect(isHeadlineStatsVisible(HEADLINE_MIN_MEMBERS + 20)).toBe(true);
  });
});

describe("hədd VAHİD sabitdən gəlir", () => {
  it("`MIN_BUCKET_SIZE` ilə eynidir — ikinci ədəd yaradılmayıb", () => {
    // İki hədd ayrılsaydı «İndi haradayıq?» paneli ilə başlıq zolağı fərqli
    // məxfilik vəd edərdi.
    expect(HEADLINE_MIN_MEMBERS).toBe(MIN_BUCKET_SIZE);
  });
});
