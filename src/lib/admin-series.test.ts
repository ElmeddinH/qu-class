// ============================================================================
// src/lib/admin-series.test.ts
// Dashboard qrafikinin həftəlik xanaları (TƏLƏ G).
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  SERIES_WEEKS,
  buildWeeklySeries,
  seriesRangeStart,
  weekStart,
} from "./admin-series";

const NOW = new Date("2026-07-30T12:00:00.000Z"); // cümə axşamı

describe("weekStart", () => {
  it("həftənin başlanğıcı BAZAR ERTƏSİdir", () => {
    // 2026-07-30 cümə axşamıdır → həftə 2026-07-27 (bazar ertəsi).
    expect(weekStart(NOW).toISOString()).toBe("2026-07-27T00:00:00.000Z");
  });

  it("🔴 BAZAR GÜNÜ öz həftəsində qalır (off-by-one)", () => {
    // `getUTCDay()` bazar günü üçün 0 qaytarır. Sadəcə `day - 1` yazsaydıq
    // bazar günü BİR GÜN ƏVVƏLKİ xanaya düşərdi.
    const sunday = new Date("2026-08-02T23:59:00.000Z");
    expect(weekStart(sunday).toISOString()).toBe("2026-07-27T00:00:00.000Z");
  });

  it("bazar ertəsinin özü dəyişmir", () => {
    const monday = new Date("2026-07-27T00:00:00.000Z");
    expect(weekStart(monday).toISOString()).toBe("2026-07-27T00:00:00.000Z");
  });

  it("saat komponenti sıfırlanır", () => {
    expect(weekStart(new Date("2026-07-29T23:59:59.999Z")).getUTCHours()).toBe(0);
  });
});

describe("buildWeeklySeries", () => {
  it("həmişə 12 xana qaytarır — BOŞ həftə də görünür", () => {
    const series = buildWeeklySeries([], [], NOW);
    expect(series).toHaveLength(SERIES_WEEKS);
    expect(series.every((point) => point.posts === 0 && point.members === 0)).toBe(true);
  });

  it("xanalar XRONOLOJİ sıradadır və sonuncusu CARİ həftədir", () => {
    const series = buildWeeklySeries([], [], NOW);
    expect(series[series.length - 1].week).toBe("2026-07-27");

    const weeks = series.map((point) => point.week);
    expect([...weeks].sort()).toEqual(weeks);
  });

  it("tarixləri düzgün xanaya yığır", () => {
    const series = buildWeeklySeries(
      [new Date("2026-07-28T10:00:00Z"), new Date("2026-07-30T10:00:00Z")],
      [new Date("2026-07-27T00:00:00Z")],
      NOW,
    );

    const last = series[series.length - 1];
    expect(last.posts).toBe(2);
    expect(last.members).toBe(1);
  });

  it("aralıqdan KƏNAR tarix SƏSSİZCƏ atılır (sərhəd qoruması)", () => {
    const series = buildWeeklySeries(
      [new Date("2020-01-01T00:00:00Z"), new Date("2030-01-01T00:00:00Z")],
      [],
      NOW,
    );
    expect(series.reduce((sum, point) => sum + point.posts, 0)).toBe(0);
  });

  it("etiket `GG.AA` formasındadır", () => {
    expect(buildWeeklySeries([], [], NOW).at(-1)?.label).toBe("27.07");
  });

  it("🔴 ÇIXIŞDA ŞƏXSƏ BAĞLI HEÇ NƏ YOXDUR (TƏLƏ G)", () => {
    // Funksiyanın girişi `Date[]`-dir: `userId` ötürmək mümkün deyil.
    // Çıxış açarları da yalnız dörd sahədir — "kim" sualı ifadə edilə bilməz.
    const point = buildWeeklySeries([new Date("2026-07-28T10:00:00Z")], [], NOW).at(-1);
    expect(Object.keys(point ?? {}).sort()).toEqual(["label", "members", "posts", "week"]);
  });
});

describe("seriesRangeStart", () => {
  it("DB sorğusunun `gte` həddi ilk xana ilə eynidir", () => {
    const series = buildWeeklySeries([], [], NOW);
    expect(seriesRangeStart(NOW).toISOString().slice(0, 10)).toBe(series[0].week);
  });
});
