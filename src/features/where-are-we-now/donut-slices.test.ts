// ============================================================================
// src/features/where-are-we-now/donut-slices.test.ts
// Blok 12F — donut dilimlərinin «Digər»ə yığılması.
//
// 🔴 ƏSAS SUAL: yığım MƏLUMAT İTİRİRMİ? Cavab «yox» olmalıdır — cəm
// dəyişmir, sadəcə xanalar birləşir. Faiz hesabı cəmə bağlıdır, ona görə bir
// nəfər itsə donut səssizcə yalan danışar.
// ============================================================================

import { describe, expect, it } from "vitest";

import { toDonutSlices } from "./donut-slices";
import { MAX_DONUT_SLICES } from "./palette";

/** Test üçün sadə etiketləyici — `OTHER` enum-dakı kimi «Digər»dir. */
const label = (key: string) => (key === "OTHER" ? "Digər" : key.toLowerCase());

/** `n` xanalıq süni bölgü: saylar azalan sırada. */
const buckets = (n: number) =>
  Array.from({ length: n }, (_, index) => ({ key: `K${index}`, count: 100 - index }));

describe("donut dilimlərinin yığılması", () => {
  it("hüdud daxilində HEÇ NƏ yığılmır", () => {
    const slices = toDonutSlices(buckets(MAX_DONUT_SLICES), label);

    expect(slices).toHaveLength(MAX_DONUT_SLICES);
    expect(slices.every((slice) => slice.mergedCount === 1)).toBe(true);
  });

  it("hüdudu aşanda dilim sayı MƏHZ hüdudda qalır", () => {
    for (const count of [7, 9, 16]) {
      expect(toDonutSlices(buckets(count), label), `count=${count}`).toHaveLength(
        MAX_DONUT_SLICES,
      );
    }
  });

  it("🔴 CƏM DƏYİŞMİR — yığım məlumat itirmir", () => {
    const source = buckets(16);
    const expected = source.reduce((sum, bucket) => sum + bucket.count, 0);
    const actual = toDonutSlices(source, label).reduce((sum, slice) => sum + slice.count, 0);

    expect(actual).toBe(expected);
  });

  it("ən BÖYÜK kateqoriyalar saxlanılır, ən kiçikləri yığılır", () => {
    const slices = toDonutSlices(buckets(10), label);
    const merged = slices[slices.length - 1];

    // İlk beşi olduğu kimi qalır (100…96).
    expect(slices.slice(0, 5).map((s) => s.count)).toEqual([100, 99, 98, 97, 96]);
    // Qalan beşi (95…91) bir xanada.
    expect(merged.key).toBe("OTHER");
    expect(merged.mergedCount).toBe(5);
    expect(merged.count).toBe(95 + 94 + 93 + 92 + 91);
  });

  it("🔴 «Digər» İKİ DƏFƏ görünmür — enum xanası qalığa qoşulur", () => {
    // `OTHER` ən böyük xanadır: sadə `slice(0, n-1)` onu saxlayardı və yığılan
    // qalıq da «Digər» adlanardı → leqendada eyni adlı iki sətir.
    const source = [
      { key: "OTHER", count: 500 },
      ...buckets(9),
    ];

    const slices = toDonutSlices(source, label);
    const others = slices.filter((slice) => slice.label === "Digər");

    expect(others).toHaveLength(1);
    expect(others[0].count).toBeGreaterThanOrEqual(500);
    expect(slices.reduce((sum, s) => sum + s.count, 0)).toBe(
      source.reduce((sum, s) => sum + s.count, 0),
    );
  });

  it("nəticə DETERMİNİKDİR — eyni giriş, eyni sıra", () => {
    // Bərabər saylar: sıralama ada görə tamamlanır, yoxsa rənglər render-dən
    // render-ə sürüşərdi.
    const source = [
      { key: "B", count: 10 },
      { key: "A", count: 10 },
      { key: "C", count: 10 },
    ];

    const first = toDonutSlices(source, label).map((s) => s.key);
    const second = toDonutSlices([...source].reverse(), label).map((s) => s.key);

    expect(first).toEqual(second);
  });

  it("boş giriş boş nəticə verir (qrafik `hasData` ilə gizlədilir)", () => {
    expect(toDonutSlices([], label)).toEqual([]);
  });
});
