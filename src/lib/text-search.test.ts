// ============================================================================
// src/lib/text-search.test.ts
// 🔴 TƏLƏ T14 — SQLite hərf həssaslığının həlli.
//
// SQLite `LIKE` ASCII hərfləri üçün böyük-kiçik fərqi gözləmir, AZƏRBAYCAN
// hərfləri (Ə Ş Ğ İ Ö Ü Ç) üçün isə gözləyir. Bu testlər variant qurucusunun
// həmin hərfləri əhatə etdiyini bərkidir — variant siyahısı daralsa
// "Əli" axtaranda nəticə itər və bunu heç bir tip yoxlaması tutmaz.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  containsAnyCase,
  searchTokens,
  textVariants,
  tokenizedContains,
} from "@/lib/text-search";

describe("textVariants", () => {
  it("boş sorğu üçün variant yoxdur", () => {
    expect(textVariants("")).toEqual([]);
    expect(textVariants("   ")).toEqual([]);
  });

  it("azərbaycan hərflərinin BÖYÜK variantını qurur", () => {
    // `LIKE` bunları eyniləşdirmir → variant olmasa "Əli" tapılmaz.
    expect(textVariants("əli")).toContain("Əli");
    expect(textVariants("şükür")).toContain("Şükür");
    expect(textVariants("günel")).toContain("Günel");
  });

  it("azərbaycan hərflərinin KİÇİK variantını qurur", () => {
    expect(textVariants("ƏLİYEVA")).toContain("əliyeva");
    expect(textVariants("Şəki")).toContain("şəki");
  });

  it("`az` lokalı ilə İ/ı düzgün çevrilir", () => {
    // Türk/azərbaycan dilində "i" → "İ" (ASCII qaydası "I" verərdi).
    expect(textVariants("ismayıl")).toContain("İSMAYIL");
    expect(textVariants("ismayıl")).toContain("İsmayıl");
  });

  it("orijinal yazılış həmişə siyahıdadır", () => {
    expect(textVariants("aYsEl")).toContain("aYsEl");
  });

  it("dublikat variant qaytarmır", () => {
    const variants = textVariants("ABC");
    expect(new Set(variants).size).toBe(variants.length);
  });
});

describe("searchTokens", () => {
  it("sözlərə bölür və boşluqları atır", () => {
    expect(searchTokens("  aysel   məmmədova ")).toEqual(["aysel", "məmmədova"]);
    expect(searchTokens("")).toEqual([]);
  });
});

describe("containsAnyCase", () => {
  it("hər sahə × hər variant üçün `contains` şaxəsi qurur", () => {
    const where = containsAnyCase<{ OR: Array<Record<string, unknown>> }>(
      ["firstName", "lastName"],
      "əli",
    );

    const variants = textVariants("əli");
    expect(where.OR).toHaveLength(2 * variants.length);
    expect(where.OR).toEqual(
      expect.arrayContaining([{ firstName: { contains: "Əli" } }]),
    );
  });
});

describe("tokenizedContains", () => {
  it("boş sorğuda `null` qaytarır (şərt ƏLAVƏ EDİLMƏMƏLİDİR)", () => {
    // Boş obyekt `{}` bütün sətirləri seçir və səhvən "filtr yoxdur" kimi
    // oxunardı — ona görə `null` qaytarılır.
    expect(tokenizedContains(["firstName"], "")).toBeNull();
    expect(tokenizedContains(["firstName"], "   ")).toBeNull();
  });

  it("hər söz üçün ayrı AND şaxəsi qurur", () => {
    const where = tokenizedContains<{ AND: unknown[] }>(
      ["firstName", "lastName"],
      "aysel məmmədova",
    );

    // "ad soyad" birləşmiş sütun yoxdur: hər söz AYRI sahəyə uyğun gələ bilər,
    // ona görə sözlər AND, sahələr OR ilə birləşir.
    expect(where?.AND).toHaveLength(2);
  });

  it("tək söz bir AND şaxəsi verir", () => {
    const where = tokenizedContains<{ AND: unknown[] }>(["title"], "startap");
    expect(where?.AND).toHaveLength(1);
  });
});
