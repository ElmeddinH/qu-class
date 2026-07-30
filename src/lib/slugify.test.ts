// ============================================================================
// src/lib/slugify.test.ts
// CMS «yarat» axınının slug generasiyası (Blok 12B).
//
// 🔴 İKİ ŞƏRT: (a) DETERMİNİSTİK — eyni başlıq həmişə eyni slug; (b) nəticə
// `admin/schemas.ts` → `slugField` regex-inə uyğun, yoxsa forma öz çıxardığı
// dəyəri rədd edərdi.
// ============================================================================

import { describe, expect, it } from "vitest";

import { MAX_SLUG_LENGTH, slugify } from "./slugify";

/** `features/admin/schemas.ts` → `slugField` ilə EYNİ qayda. */
const SLUG_PATTERN = /^[a-z0-9-]+$/;

describe("slugify", () => {
  it("azərbaycan hərflərini qatlayır", () => {
    expect(slugify("Tələbə həyatı")).toBe("telebe-heyati");
    expect(slugify("Şəhər bələdçisi")).toBe("seher-beledcisi");
    expect(slugify("Gənclər üçün")).toBe("gencler-ucun");
    expect(slugify("Çıxış qaydası")).toBe("cixis-qaydasi");
  });

  it("böyük «İ» və «I» düzgün kiçilir", () => {
    // `az` lokalı: `İ` → `i`, `I` → `ı` → (qatlama) → `i`.
    expect(slugify("İmtahan")).toBe("imtahan");
    expect(slugify("IXTISAS")).toBe("ixtisas");
  });

  it("durğu işarələri və boşluqlar tək defisə yığılır", () => {
    expect(slugify("Necə  qeydiyyatdan   keçim?")).toBe("nece-qeydiyyatdan-kecim");
    expect(slugify("Sual — cavab: bölmə")).toBe("sual-cavab-bolme");
  });

  it("kənar defislər qalmır", () => {
    expect(slugify("  --Kampus--  ")).toBe("kampus");
    expect(slugify("!!!")).toBe("");
  });

  it("🔴 DETERMİNİSTİKDİR — eyni giriş, eyni nəticə", () => {
    const title = "Yeni tələbələr üçün bələdçi";
    const first = slugify(title);

    for (let index = 0; index < 5; index += 1) {
      expect(slugify(title)).toBe(first);
    }
  });

  it("uzunluq həddi aşılmır və kəsmə defislə bitmir", () => {
    const long = "çox uzun başlıq ".repeat(20);
    const slug = slugify(long);

    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("🔴 nəticə forma sxeminin regex-inə uyğundur", () => {
    const titles = [
      "Universitet haqqında",
      "Xankəndi — şəhər bələdçisi",
      "FAQ: 10 sual",
      "Ərzaq və bazarlar",
      "Təcili yardım · 103",
    ];

    for (const title of titles) {
      const slug = slugify(title);
      expect(slug, title).toMatch(SLUG_PATTERN);
    }
  });
});
