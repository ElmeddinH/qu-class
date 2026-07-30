// ============================================================================
// src/lib/yearbook.test.ts
// Digital Yearbook qruplaşdırması (Blok 10A) — SAF qaydanın testi.
//
// Albomun mənası "hansı xatirə hansı sualın altındadır" sualındadır. Üç şey
// burada bərkidilir:
//   1. tip → bölmə xəritəsi (8 növün hamısı bir evə düşür),
//   2. BİR xatirə İKİ bölmədə görünmür,
//   3. naməlum tip albomdan DÜŞÜR (məkanı yoxdursa).
// ============================================================================

import { describe, expect, it } from "vitest";

import { MEMORY_TYPE_VALUES, MemoryType } from "@/lib/enums";
import {
  UNKNOWN_PLACE_TITLE,
  YEARBOOK_SECTIONS,
  YEARBOOK_SECTION_META,
  YEARBOOK_SECTION_ORDER,
  groupByPlace,
  groupYearbook,
  yearbookEntryCount,
  yearbookSectionOf,
} from "@/lib/yearbook";

function entry(type: string, guidePlaceId: string | null = null) {
  return { type, guidePlaceId };
}

describe("yearbookSectionOf — tip → bölmə", () => {
  it("spec §11-in üç sualı gözlənilən növləri toplayır", () => {
    expect(yearbookSectionOf(entry(MemoryType.SHORT_MEMORY))).toBe("MOMENT");
    expect(yearbookSectionOf(entry(MemoryType.MEMORABLE_EVENT))).toBe("MOMENT");

    expect(yearbookSectionOf(entry(MemoryType.UNFORGETTABLE_LESSON))).toBe("LESSON");
    expect(yearbookSectionOf(entry(MemoryType.THANKS_TEACHER))).toBe("LESSON");

    expect(yearbookSectionOf(entry(MemoryType.WHAT_UNI_GAVE_ME))).toBe("CLOSING");
    expect(yearbookSectionOf(entry(MemoryType.MESSAGE_TO_QU))).toBe("CLOSING");
  });

  it("8 növün HƏR BİRİ bir bölməyə düşür — heç biri albomdan itmir", () => {
    for (const type of MEMORY_TYPE_VALUES) {
      expect(yearbookSectionOf(entry(type)), type).not.toBeNull();
    }
  });

  it("`guidePlaceId` doludursa bölmə TİPDƏN ASILI DEYİL", () => {
    // Növü nə olursa olsun — məkan qaydası üstündür (spec §11 üçüncü sual).
    for (const type of MEMORY_TYPE_VALUES) {
      expect(yearbookSectionOf(entry(type, "gpl-01")), type).toBe("PLACE");
    }
  });

  it("naməlum tip albomdan DÜŞÜR (məkanı yoxdursa)", () => {
    expect(yearbookSectionOf(entry("TELEPATHY"))).toBeNull();
  });

  it("naməlum tip MƏKANLA gələrsə yenə «sevimli yer»dədir", () => {
    // Məkan qaydası növ cədvəlindən asılı deyil; qeyd oradadır.
    expect(yearbookSectionOf(entry("TELEPATHY", "gpl-02"))).toBe("PLACE");
  });
});

describe("groupYearbook", () => {
  const entries = [
    { id: "a", ...entry(MemoryType.SHORT_MEMORY) },
    { id: "b", ...entry(MemoryType.THANKS_TEACHER) },
    { id: "c", ...entry(MemoryType.MESSAGE_TO_QU) },
    { id: "d", ...entry(MemoryType.SHORT_MEMORY, "gpl-01") },
    { id: "e", ...entry(MemoryType.UNIVERSITY_STORY) },
    { id: "f", ...entry("TELEPATHY") },
  ];

  it("bütün bölmələr (boş olanlar da) nəticədədir", () => {
    const groups = groupYearbook(entries);

    expect(groups.map((g) => g.section)).toEqual(YEARBOOK_SECTION_ORDER);
  });

  it("🔴 bir xatirə YALNIZ BİR bölmədə görünür", () => {
    const groups = groupYearbook(entries);
    const seen = groups.flatMap((group) => group.items.map((item) => item.id));

    expect(seen.length).toBe(new Set(seen).size);
  });

  it("məkanlı qeyd növünə görə yox, «sevimli yer»dədir", () => {
    const groups = groupYearbook(entries);
    const moment = groups.find((g) => g.section === "MOMENT")!;
    const place = groups.find((g) => g.section === "PLACE")!;

    // `d` də SHORT_MEMORY-dir, amma məkanı var.
    expect(moment.items.map((i) => i.id)).toEqual(["a"]);
    expect(place.items.map((i) => i.id)).toEqual(["d"]);
  });

  it("naməlum tip heç bir bölməyə düşmür", () => {
    const groups = groupYearbook(entries);
    const all = groups.flatMap((group) => group.items.map((item) => item.id));

    expect(all).not.toContain("f");
    expect(yearbookEntryCount(entries)).toBe(entries.length - 1);
  });

  it("giriş sırası bölmə daxilində qorunur (albom xronolojidir)", () => {
    const groups = groupYearbook([
      { id: "1", ...entry(MemoryType.SHORT_MEMORY) },
      { id: "2", ...entry(MemoryType.MEMORABLE_EVENT) },
      { id: "3", ...entry(MemoryType.SHORT_MEMORY) },
    ]);

    expect(groups.find((g) => g.section === "MOMENT")!.items.map((i) => i.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("boş giriş bütün bölmələri boş qaytarır (səhifə «cavabsız» yaza bilsin)", () => {
    const groups = groupYearbook([]);

    expect(groups).toHaveLength(YEARBOOK_SECTIONS.length);
    expect(groups.every((group) => group.items.length === 0)).toBe(true);
  });
});

describe("bölmə meta məlumatı", () => {
  it("hər bölmənin başlığı və sualı var", () => {
    for (const section of YEARBOOK_SECTIONS) {
      const meta = YEARBOOK_SECTION_META[section];
      expect(meta.title.length, section).toBeGreaterThan(0);
      expect(meta.question.length, section).toBeGreaterThan(0);
    }
  });

  it("bağlanış bölməsi sitat divarıdır, qalanları kart şəbəkəsi", () => {
    expect(YEARBOOK_SECTION_META.CLOSING.layout).toBe("wall");
    expect(YEARBOOK_SECTION_META.MOMENT.layout).toBe("cards");
    expect(YEARBOOK_SECTION_META.PLACE.layout).toBe("cards");
  });
});

describe("groupByPlace — «sevimli yer» bölməsinin daxili qrupları", () => {
  it("eyni məkanın qeydlərini birləşdirir, sıranı qoruyur", () => {
    const groups = groupByPlace([
      { id: "1", type: "X", guidePlaceId: "p1", guidePlaceTitle: "Kitabxana" },
      { id: "2", type: "X", guidePlaceId: "p2", guidePlaceTitle: "Park" },
      { id: "3", type: "X", guidePlaceId: "p1", guidePlaceTitle: "Kitabxana" },
    ]);

    expect(groups.map((g) => g.placeId)).toEqual(["p1", "p2"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("adı olmayan məkan üçün yer tutucu başlıq işlədilir", () => {
    const groups = groupByPlace([
      { id: "1", type: "X", guidePlaceId: "p1", guidePlaceTitle: null },
    ]);

    expect(groups[0].title).toBe(UNKNOWN_PLACE_TITLE);
  });

  it("məkansız qeyd bu qruplaşmaya düşmür", () => {
    expect(
      groupByPlace([{ id: "1", type: "X", guidePlaceId: null, guidePlaceTitle: null }]),
    ).toEqual([]);
  });
});
