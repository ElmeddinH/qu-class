// ============================================================================
// src/lib/guide-filters.test.ts
// Xankəndi bələdçisinin [M3] filtri və qruplaşdırması — SAF modul testi.
// ============================================================================

import { describe, expect, it } from "vitest";

import { GUIDE_CATEGORY_VALUES } from "./enums";
import {
  GUIDE_PARAMS,
  GUIDE_PATH,
  emergencyFirst,
  emptyGuideFilters,
  groupPlacesByCategory,
  guideHref,
  guidePlaceHref,
  parseGuideParams,
  serializeGuideParams,
  type GuidePlaceLike,
} from "./guide-filters";

interface TestPlace extends GuidePlaceLike {
  id: string;
}

const PLACES: TestPlace[] = [
  { id: "a", category: "TRANSPORT", isEmergency: false },
  { id: "b", category: "HEALTH", isEmergency: false },
  { id: "c", category: "HEALTH", isEmergency: true },
  { id: "d", category: "HISTORY", isEmergency: false },
  { id: "e", category: "SAFETY", isEmergency: true },
];

describe("parse ↔ serialize dövrəsi", () => {
  it("boş filtr kanonik ünvanı verir", () => {
    expect(guideHref(emptyGuideFilters())).toBe(GUIDE_PATH);
    expect(guideHref()).toBe(GUIDE_PATH);
  });

  it("hər kateqoriya üçün dövrə qapanır", () => {
    for (const category of GUIDE_CATEGORY_VALUES) {
      const parsed = parseGuideParams(serializeGuideParams({ category }));
      expect(parsed.category, category).toBe(category);
    }
  });

  it("link paylaşıla biləndir", () => {
    expect(guideHref({ category: "TRANSPORT" })).toBe("/khankendi?category=TRANSPORT");
  });

  it("🔴 naməlum kateqoriya 404 VERMİR — filtr səssizcə atılır", () => {
    expect(parseGuideParams({ [GUIDE_PARAMS.category]: "METRO" }).category).toBeNull();
  });

  it("məkan ünvanı şablonu tək yerdədir", () => {
    expect(guidePlaceHref("gpl-01")).toBe("/khankendi/gpl-01");
  });
});

describe("groupPlacesByCategory", () => {
  it("🔴 sıra `GUIDE_CATEGORY_VALUES`-dandır (spec §3 bənd ardıcıllığı)", () => {
    const order = groupPlacesByCategory(PLACES).map((g) => g.category);
    const expected = GUIDE_CATEGORY_VALUES.filter((c) => order.includes(c));

    expect(order).toEqual(expected);
    // HISTORY spec-də birincidir, TRANSPORT ondan sonra gəlir.
    expect(order.indexOf("HISTORY")).toBeLessThan(order.indexOf("TRANSPORT"));
  });

  it("BOŞ QRUP buraxılır", () => {
    const categories = groupPlacesByCategory(PLACES).map((g) => g.category);
    expect(categories).not.toContain("MARKET");
  });

  it("hər məkan MƏHZ BİR qrupdadır", () => {
    const total = groupPlacesByCategory(PLACES).reduce((sum, g) => sum + g.items.length, 0);
    expect(total).toBe(PLACES.length);
  });

  it("11 kateqoriyanın hamısı dolu siyahıda görünür", () => {
    const full = GUIDE_CATEGORY_VALUES.map((category, index) => ({
      id: `p-${index}`,
      category,
      isEmergency: false,
    }));

    expect(groupPlacesByCategory(full)).toHaveLength(GUIDE_CATEGORY_VALUES.length);
  });
});

describe("emergencyFirst", () => {
  it("🔴 təcili məkanlar başa keçir (spec §3)", () => {
    const sorted = emergencyFirst(PLACES);
    expect(sorted[0].isEmergency).toBe(true);
    expect(sorted[1].isEmergency).toBe(true);
    expect(sorted.slice(2).every((p) => !p.isEmergency)).toBe(true);
  });

  it("SABİT sıra — eyni bayraqlı elementlərin nisbi sırası dəyişmir", () => {
    // DB `order` sütununu qorumaq üçün vacibdir.
    const sorted = emergencyFirst(PLACES);
    expect(sorted.filter((p) => p.isEmergency).map((p) => p.id)).toEqual(["c", "e"]);
    expect(sorted.filter((p) => !p.isEmergency).map((p) => p.id)).toEqual(["a", "b", "d"]);
  });

  it("giriş massivini DƏYİŞMİR", () => {
    const input = [...PLACES];
    emergencyFirst(input);
    expect(input.map((p) => p.id)).toEqual(PLACES.map((p) => p.id));
  });
});
