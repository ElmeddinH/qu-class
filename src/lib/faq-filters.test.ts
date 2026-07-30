// ============================================================================
// src/lib/faq-filters.test.ts
// `/faq` axtarışı və kateqoriya qruplaşdırması — SAF modul testi.
//
// ⚠️ Axtarış YADDAŞDADIR və bu, CLAUDE.md §5-ə zidd deyil: FAQ tamamilə
// ictimai redaksiya məzmunudur (20 sətir, məxfilik şərti və səhifələmə yoxdur).
// Səbəb modulun başlığında yazılıb; burada DAVRANIŞ bərkidilir.
// ============================================================================

import { describe, expect, it } from "vitest";

import { FAQ_CATEGORY_VALUES } from "./enums";
import {
  FAQ_PARAMS,
  emptyFaqFilters,
  faqHref,
  filterFaqs,
  groupFaqsByCategory,
  hasActiveFaqFilters,
  parseFaqParams,
  searchFaqs,
  serializeFaqParams,
  type FaqLike,
} from "./faq-filters";

const ITEMS: FaqLike[] = [
  { category: "GENERAL", question: "QU CLASS nədir?", answer: "Sinif platformasıdır." },
  {
    category: "GENERAL",
    question: "Məlumatlarımı kim görür?",
    answer: "Hər sahə üçün ayrıca görünürlük təyin edə bilərsiniz.",
  },
  {
    category: "ADMISSION",
    question: "Yataqxanaya necə müraciət edim?",
    answer: "Qəbul dövründə onlayn form doldurulur.",
  },
  {
    category: "CAMPUS",
    question: "Kampusda internet varmı?",
    answer: "Bütün korpuslarda simsiz şəbəkə mövcuddur.",
  },
];

describe("parse ↔ serialize dövrəsi", () => {
  it("boş filtr boş sorğu sətri verir", () => {
    expect(serializeFaqParams(emptyFaqFilters()).toString()).toBe("");
    expect(faqHref(emptyFaqFilters())).toBe("/faq");
  });

  it("hər kateqoriya üçün dövrə qapanır", () => {
    for (const category of FAQ_CATEGORY_VALUES) {
      const filters = { category, query: "yataqxana" };
      const parsed = parseFaqParams(serializeFaqParams(filters));
      expect(parsed, category).toEqual(filters);
    }
  });

  it("🔴 naməlum kateqoriya 404 VERMİR — filtr səssizcə atılır", () => {
    expect(parseFaqParams({ [FAQ_PARAMS.category]: "NAMƏLUM" }).category).toBeNull();
  });

  it("boş axtarış sözü `null` olur (URL-də `?q=` qalmır)", () => {
    expect(parseFaqParams({ [FAQ_PARAMS.q]: "   " }).query).toBeNull();
  });

  it("massiv dəyəri (təkrarlanan açar) ilk elementlə oxunur", () => {
    expect(parseFaqParams({ [FAQ_PARAMS.category]: ["CAMPUS", "GENERAL"] }).category).toBe(
      "CAMPUS",
    );
  });

  it("`hasActiveFaqFilters` səhifə vəziyyətini düzgün bildirir", () => {
    expect(hasActiveFaqFilters(emptyFaqFilters())).toBe(false);
    expect(hasActiveFaqFilters({ category: "CAMPUS", query: null })).toBe(true);
    expect(hasActiveFaqFilters({ category: null, query: "internet" })).toBe(true);
  });
});

describe("searchFaqs", () => {
  it("sual mətnində tapır", () => {
    expect(searchFaqs(ITEMS, "yataqxana")).toHaveLength(1);
  });

  it("CAVAB mətnində də tapır", () => {
    // «görünürlük» yalnız cavabdadır — axtarış hər iki sahəyə baxmalıdır.
    const found = searchFaqs(ITEMS, "görünürlük");
    expect(found).toHaveLength(1);
    expect(found[0].question).toContain("kim görür");
  });

  it("🔴 böyük/kiçik hərf və AZƏRBAYCAN DİAKRİTİKASI fərq etmir", () => {
    // T14 dərsi: «məlumat» sorğusu «Məlumatlarımı» sualını tapmalıdır, «melumat»
    // yazılışı da işləməlidir (ə→e qatlaması).
    expect(searchFaqs(ITEMS, "MƏLUMAT")).toHaveLength(1);
    expect(searchFaqs(ITEMS, "melumat")).toHaveLength(1);
    expect(searchFaqs(ITEMS, "Yatagxana")).toHaveLength(0); // ğ→g, amma «q» ≠ «g»
    expect(searchFaqs(ITEMS, "kampusda")).toHaveLength(1);
  });

  it("boş sorğu siyahını olduğu kimi qaytarır", () => {
    expect(searchFaqs(ITEMS, null)).toHaveLength(ITEMS.length);
    expect(searchFaqs(ITEMS, "   ")).toHaveLength(ITEMS.length);
  });

  it("uyğunluq yoxdursa boş siyahı", () => {
    expect(searchFaqs(ITEMS, "kosmos")).toHaveLength(0);
  });
});

describe("filterFaqs", () => {
  it("kateqoriya və axtarış BİRLİKDƏ tətbiq olunur", () => {
    expect(filterFaqs(ITEMS, { category: "GENERAL", query: "platforma" })).toHaveLength(1);
    // Eyni söz başqa kateqoriyada axtarılsa nəticə boşdur.
    expect(filterFaqs(ITEMS, { category: "CAMPUS", query: "platforma" })).toHaveLength(0);
  });
});

describe("groupFaqsByCategory", () => {
  it("sıra `FAQ_CATEGORY_VALUES`-dandır, DB-dən yox", () => {
    const groups = groupFaqsByCategory(ITEMS);
    const order = groups.map((g) => g.category);
    const expected = FAQ_CATEGORY_VALUES.filter((c) => order.includes(c));

    expect(order).toEqual(expected);
  });

  it("🔴 BOŞ QRUP buraxılır", () => {
    // PLATFORM kateqoriyasında sətir yoxdur — başlıq göstərilməməlidir.
    const categories = groupFaqsByCategory(ITEMS).map((g) => g.category);
    expect(categories).not.toContain("PLATFORM");
  });

  it("hər sətir MƏHZ BİR qrupdadır (itmir, təkrarlanmır)", () => {
    const total = groupFaqsByCategory(ITEMS).reduce((sum, g) => sum + g.items.length, 0);
    expect(total).toBe(ITEMS.length);
  });

  it("naməlum kateqoriya heç bir qrupa düşmür (DB sütunu `String`-dir)", () => {
    const withUnknown = [...ITEMS, { category: "KÖHNƏ", question: "x", answer: "y" }];
    const total = groupFaqsByCategory(withUnknown).reduce(
      (sum, g) => sum + g.items.length,
      0,
    );

    expect(total).toBe(ITEMS.length);
  });
});
