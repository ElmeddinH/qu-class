// ============================================================================
// src/lib/content-routes.test.ts
// 🔴 ÜNVAN ↔ MƏZMUN XƏRİTƏSİNİN QORUYUCUSU.
//
// `CONTENT_ROUTES` ingiliscə URL-i (`/about`) azərbaycanca `ContentPage.slug`-a
// (`haqqimizda`) bağlayır. Slug-da bir hərf səhvi səhifəni 404-ə çevirir və bunu
// YALNIZ brauzerdə görərdik — ona görə xəritə SEED DATASINA qarşı yoxlanılır.
//
// ⚠️ Test seed-in DATA faylını import edir (`prisma/seed-data/content.ts`), DB-yə
// TOXUNMUR: modul saf məlumatdır, Prisma importu yoxdur. Yəni bu, inteqrasiya
// testi deyil və `tests/integration/` altında olmamalıdır.
// ============================================================================

import { describe, expect, it } from "vitest";

import { CONTENT_PAGES } from "../../prisma/seed-data/content";
import { CONTENT_SECTION_VALUES } from "./enums";
import {
  CONTENT_ROUTES,
  LEGAL_PAGES,
  LEGAL_SLUGS,
  contentRouteOf,
  excludeLegal,
  isLegalSlug,
  legalHref,
  siblingRoutes,
} from "./content-routes";
import { PUBLIC_PAGE_PATHS } from "./routes";

const SEED_SLUGS = new Set(CONTENT_PAGES.map((page) => page.slug));

describe("🔴 xəritə ↔ seed uyğunluğu", () => {
  const singleRoutes = CONTENT_ROUTES.filter((route) => route.kind === "page");

  it.each(singleRoutes.map((route) => [route.path, route] as const))(
    "%s → seed-də mövcud slug göstərir",
    (_path, route) => {
      expect(SEED_SLUGS.has(route.slug), `«${route.slug}» seed-də yoxdur`).toBe(true);
    },
  );

  it.each(singleRoutes.map((route) => [route.path, route] as const))(
    "%s → seed-dəki bölmə ilə eyni bölmədədir",
    (_path, route) => {
      const page = CONTENT_PAGES.find((entry) => entry.slug === route.slug);
      expect(page?.section, route.slug).toBe(route.section);
    },
  );

  it("bölmə səhifələrində ƏN AZI bir dərc olunmuş yazı var", () => {
    // Boş bölmə səhifəsi ziyarətçiyə «məzmun hazırlanır» göstərir — texniki
    // cəhətdən doğru, amma naviqasiyadan gələn linkin arxası boş qalır.
    for (const route of CONTENT_ROUTES.filter((r) => r.kind === "section")) {
      const pages = CONTENT_PAGES.filter(
        (page) => page.section === route.section && !LEGAL_SLUGS.includes(page.slug),
      );
      expect(pages.length, route.path).toBeGreaterThan(0);
    }
  });

  it("hər hüquqi sənədin seed sətri var", () => {
    for (const page of LEGAL_PAGES) {
      expect(SEED_SLUGS.has(page.slug), page.slug).toBe(true);
    }
  });
});

describe("xəritənin daxili bütövlüyü", () => {
  it("yollar UNİKALDIR", () => {
    const paths = CONTENT_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("slug-lar UNİKALDIR (iki ünvan eyni yazını göstərmir)", () => {
    const slugs = CONTENT_ROUTES.filter((r) => r.kind === "page").map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("🔴 hər yol `PUBLIC_PAGE_PATHS` müqaviləsindədir", () => {
    // Əks halda `routes.test.ts`-dəki icazə yoxlaması həmin yolu ƏHATƏ ETMƏZDİ.
    for (const route of CONTENT_ROUTES) {
      expect(PUBLIC_PAGE_PATHS as readonly string[], route.path).toContain(route.path);
    }
  });

  it("bölmə dəyərləri enum-dandır", () => {
    for (const route of CONTENT_ROUTES) {
      expect(CONTENT_SECTION_VALUES as readonly string[]).toContain(route.section);
    }
  });

  it("`contentRouteOf` naməlum yolda `undefined` verir", () => {
    expect(contentRouteOf("/about")?.title).toBe("Universitet haqqında");
    expect(contentRouteOf("/yoxdur")).toBeUndefined();
  });
});

describe("siblingRoutes", () => {
  it("eyni bölmədəki DİGƏR səhifələri verir", () => {
    const siblings = siblingRoutes("/about").map((route) => route.path);

    expect(siblings).toContain("/history");
    expect(siblings).toContain("/mission");
    // Özü siyahıda OLMAMALIDIR.
    expect(siblings).not.toContain("/about");
  });

  it("başqa bölmənin səhifəsi qarışmır", () => {
    expect(siblingRoutes("/about").map((r) => r.path)).not.toContain("/campus-life");
  });

  it("naməlum yol boş siyahı verir", () => {
    expect(siblingRoutes("/yoxdur")).toEqual([]);
  });
});

describe("hüquqi sənədlər", () => {
  it("dörd sənəd var (GW #13)", () => {
    expect(LEGAL_PAGES).toHaveLength(4);
    expect(LEGAL_SLUGS).toEqual(["privacy", "terms", "copyright", "equal-opportunity"]);
  });

  it("ünvan şablonu tək yerdədir", () => {
    expect(legalHref("privacy")).toBe("/legal/privacy");
  });

  it("`isLegalSlug` ağ siyahıdır", () => {
    expect(isLegalSlug("privacy")).toBe(true);
    // 🔴 Adi məzmun səhifəsi `/legal/` altında GÖSTƏRİLMƏMƏLİDİR — eyni mətn
    // iki ünvanda yaşayardı (dublikat kanonik ünvan).
    expect(isLegalSlug("kampus-heyati")).toBe(false);
  });

  it("🔴 `excludeLegal` hüquqi sənədləri bölmə siyahısından çıxarır", () => {
    // Sənədlər texniki cəhətdən UNIVERSITY bölməsindədir (sxemdə hüquqi bölmə
    // yoxdur), amma «Universitet bölməsində daha nə var?» siyahısında
    // görünməməlidirlər.
    const universityPages = CONTENT_PAGES.filter((p) => p.section === "UNIVERSITY");
    const visible = excludeLegal(universityPages).map((p) => p.slug);

    expect(visible).toContain("haqqimizda");
    expect(visible).not.toContain("privacy");
    expect(visible).not.toContain("equal-opportunity");
  });
});
