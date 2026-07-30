// ============================================================================
// src/lib/memory-filters.test.ts
// Xatirə filtrlərinin URL DÖVRƏSİ (Blok 10A).
//
// Blok 6-nın dərsi: `parse` və `serialize` ayrılanda filtr "işləyir, amma
// nəticə dəyişmir" olur — ən çətin tapılan səhv növü. Ona görə dövrə
// (`parse(serialize(f)) === f`) burada bərkidilir.
// ============================================================================

import { describe, expect, it } from "vitest";

import { MEMORY_TYPE_VALUES, MemoryType } from "@/lib/enums";
import {
  FIRST_MEMORY_PAGE,
  MEMORY_PAGE_SIZE,
  MEMORY_PARAMS,
  MEMORY_PLACE_FLAG,
  activeMemoryFilterCount,
  emptyMemoryFilters,
  hasActiveMemoryFilters,
  memoriesHref,
  memoryPageCount,
  memoryQueryString,
  memorySkipOf,
  parseMemoryParams,
  serializeMemoryParams,
  type MemoryFilterState,
} from "@/lib/memory-filters";

describe("parseMemoryParams", () => {
  it("boş URL default vəziyyət verir", () => {
    expect(parseMemoryParams({})).toEqual(emptyMemoryFilters());
  });

  it("hər iki filtri və səhifəni oxuyur", () => {
    const state = parseMemoryParams({
      type: MemoryType.THANKS_TEACHER,
      place: MEMORY_PLACE_FLAG,
      page: "4",
    });

    expect(state).toEqual({
      type: MemoryType.THANKS_TEACHER,
      placeOnly: true,
      page: 4,
    });
  });

  it("naməlum növ 404 vermir — filtr SƏSSİZCƏ ləğv olunur", () => {
    const state = parseMemoryParams({ type: "TELEPATHY", page: "0" });

    expect(state.type).toBeNull();
    expect(state.page).toBe(FIRST_MEMORY_PAGE);
  });

  it("`place` üçün yalnız bayraq dəyəri qəbul edilir", () => {
    expect(parseMemoryParams({ place: MEMORY_PLACE_FLAG }).placeOnly).toBe(true);
    // "true", "yes", "0" — heç biri deyil: iki tərəf (nuqs + server) EYNİ
    // dəyəri yazmalıdır, yoxsa filtr səssizcə işləməz.
    expect(parseMemoryParams({ place: "true" }).placeOnly).toBe(false);
    expect(parseMemoryParams({ place: "0" }).placeOnly).toBe(false);
    expect(parseMemoryParams({ place: "" }).placeOnly).toBe(false);
  });

  it("mənfi / kəsr / hərfli səhifə birinci səhifəyə düşür", () => {
    for (const page of ["-2", "1.5", "abc", "  "]) {
      expect(parseMemoryParams({ page }).page).toBe(FIRST_MEMORY_PAGE);
    }
  });

  it("URLSearchParams də qəbul edir (route handler-lər onu ötürür)", () => {
    const params = new URLSearchParams({
      [MEMORY_PARAMS.type]: MemoryType.MESSAGE_TO_QU,
      [MEMORY_PARAMS.place]: MEMORY_PLACE_FLAG,
    });

    expect(parseMemoryParams(params)).toEqual({
      type: MemoryType.MESSAGE_TO_QU,
      placeOnly: true,
      page: FIRST_MEMORY_PAGE,
    });
  });

  it("massiv dəyərdən BİRİNCİSİNİ götürür (?type=A&type=B)", () => {
    expect(parseMemoryParams({ type: [MemoryType.SHORT_MEMORY, "ZZZ"] }).type).toBe(
      MemoryType.SHORT_MEMORY,
    );
  });
});

describe("serializeMemoryParams", () => {
  it("boş filtr boş sorğu sətri verir (URL «?» ilə bitmir)", () => {
    expect(memoryQueryString(emptyMemoryFilters())).toBe("");
  });

  it("birinci səhifə URL-ə yazılmır", () => {
    const params = serializeMemoryParams({
      type: null,
      placeOnly: true,
      page: FIRST_MEMORY_PAGE,
    });

    expect(params.get(MEMORY_PARAMS.page)).toBeNull();
    expect(params.get(MEMORY_PARAMS.place)).toBe(MEMORY_PLACE_FLAG);
  });
});

describe("dövrə: parse(serialize(f)) === f", () => {
  const cases: MemoryFilterState[] = [
    emptyMemoryFilters(),
    { type: MemoryType.SHORT_MEMORY, placeOnly: false, page: FIRST_MEMORY_PAGE },
    { type: null, placeOnly: true, page: 2 },
    { type: MemoryType.WHAT_UNI_GAVE_ME, placeOnly: true, page: 7 },
    ...MEMORY_TYPE_VALUES.map((type) => ({
      type,
      placeOnly: false,
      page: FIRST_MEMORY_PAGE,
    })),
  ];

  it.each(cases.map((state) => [JSON.stringify(state), state] as const))(
    "%s",
    (_label, state) => {
      expect(parseMemoryParams(serializeMemoryParams(state))).toEqual(state);
    },
  );
});

describe("səhifələmə", () => {
  it("boş nəticədə də ən azı bir səhifə var", () => {
    expect(memoryPageCount(0)).toBe(1);
  });

  it("səhifə ölçüsünə tam bölünən say əlavə səhifə yaratmır", () => {
    expect(memoryPageCount(MEMORY_PAGE_SIZE)).toBe(1);
    expect(memoryPageCount(MEMORY_PAGE_SIZE + 1)).toBe(2);
  });

  it("skip səhifədən hesablanır", () => {
    expect(memorySkipOf({ type: null, placeOnly: false, page: 1 })).toBe(0);
    expect(memorySkipOf({ type: null, placeOnly: false, page: 3 })).toBe(
      MEMORY_PAGE_SIZE * 2,
    );
  });
});

describe("aktiv filtr sayı", () => {
  it("səhifə nömrəsi filtr sayılmır", () => {
    const state: MemoryFilterState = { type: null, placeOnly: false, page: 5 };

    expect(activeMemoryFilterCount(state)).toBe(0);
    expect(hasActiveMemoryFilters(state)).toBe(false);
  });

  it("hər iki filtr sayılır", () => {
    expect(
      activeMemoryFilterCount({
        type: MemoryType.MEMORABLE_EVENT,
        placeOnly: true,
        page: 1,
      }),
    ).toBe(2);
  });
});

describe("memoriesHref", () => {
  it("filtrləri linkdə saxlayır", () => {
    const href = memoriesHref("sec2023", {
      type: MemoryType.THANKS_CLASSMATE,
      placeOnly: true,
      page: 2,
    });

    expect(href).toContain("/class/sec2023/memories?");
    expect(parseMemoryParams(new URL(href, "http://x").searchParams)).toEqual({
      type: MemoryType.THANKS_CLASSMATE,
      placeOnly: true,
      page: 2,
    });
  });
});
