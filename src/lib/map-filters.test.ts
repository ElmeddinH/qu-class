// ============================================================================
// src/lib/map-filters.test.ts
// parse ↔ serialize dövrəsi. `lib/timeline-filters.test.ts` ilə eyni nümunə.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAP_TAB,
  MAP_PARAMS,
  MAP_TAB_VALUES,
  emptyMapFilters,
  mapHref,
  mapQueryString,
  parseMapParams,
  serializeMapParams,
} from "./map-filters";

describe("MAP_TAB_VALUES", () => {
  it("səkkiz görünüş var (7 vizual + vəzifə qrafiki)", () => {
    expect(MAP_TAB_VALUES).toHaveLength(8);
    expect(new Set(MAP_TAB_VALUES).size).toBe(8);
  });

  it("default görünüş dünya xəritəsidir", () => {
    expect(DEFAULT_MAP_TAB).toBe("world");
    expect(emptyMapFilters()).toEqual({ tab: "world" });
  });
});

describe("parseMapParams", () => {
  it("etibarlı tab-ı oxuyur", () => {
    for (const tab of MAP_TAB_VALUES) {
      expect(parseMapParams({ [MAP_PARAMS.tab]: tab })).toEqual({ tab });
      expect(parseMapParams(new URLSearchParams(`tab=${tab}`))).toEqual({ tab });
    }
  });

  it("naməlum / boş dəyər DEFAULT-a düşür (404 vermir)", () => {
    expect(parseMapParams({ tab: "zibil" })).toEqual({ tab: DEFAULT_MAP_TAB });
    expect(parseMapParams({ tab: "" })).toEqual({ tab: DEFAULT_MAP_TAB });
    expect(parseMapParams({ tab: "   " })).toEqual({ tab: DEFAULT_MAP_TAB });
    expect(parseMapParams({})).toEqual({ tab: DEFAULT_MAP_TAB });
  });

  it("təkrarlanan açar ilk dəyəri ilə götürülür", () => {
    expect(parseMapParams(new URLSearchParams("tab=cities&tab=education"))).toEqual({
      tab: "cities",
    });
    expect(parseMapParams({ tab: ["companies", "education"] })).toEqual({ tab: "companies" });
  });

  it("boşluqlar kəsilir", () => {
    expect(parseMapParams({ tab: " education " })).toEqual({ tab: "education" });
  });
});

describe("serializeMapParams", () => {
  it("default görünüş URL-ə YAZILMIR", () => {
    expect(serializeMapParams({ tab: DEFAULT_MAP_TAB }).toString()).toBe("");
    expect(mapQueryString({ tab: DEFAULT_MAP_TAB })).toBe("");
  });

  it("digər görünüşlər yazılır", () => {
    expect(serializeMapParams({ tab: "cities" }).toString()).toBe("tab=cities");
    expect(mapQueryString({ tab: "industries" })).toBe("?tab=industries");
  });

  it("🔴 dövrə qapalıdır: parse(serialize(f)) === f", () => {
    for (const tab of MAP_TAB_VALUES) {
      expect(parseMapParams(serializeMapParams({ tab }))).toEqual({ tab });
    }
  });
});

describe("mapHref", () => {
  it("route `/map`-dir — `nav.ts`-dəki link ilə eynidir", () => {
    // 🔴 `nav.ts` → buildAppNav: `${base}/map`. Başqa yol yazılsa sol menyudaki
    // «İndi haradayıq?» linki 404 verər.
    expect(mapHref("maliyye-2022", emptyMapFilters())).toBe("/class/maliyye-2022/map");
    expect(mapHref("maliyye-2022", { tab: "education" })).toBe(
      "/class/maliyye-2022/map?tab=education",
    );
  });
});
