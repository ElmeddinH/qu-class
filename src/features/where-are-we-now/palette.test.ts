// ============================================================================
// src/features/where-are-we-now/palette.test.ts
// Blok 12B · borc 4 — donut dilimlərinin ARDICIL şkalası.
//
// 🔴 TESTİN ƏSAS SUALI: yan-yana duran iki dilim arasında ƏN AZI 2 pillə
// parlaqlıq fərqi qalırmı? Rəng korluğunda (protan / deutan / tritan) eyni
// çaların qonşu pillələri praktiki olaraq eyni görünür — bütün ayırdedilmə
// PARLAQLIQ fərqinə qalır. Bir pillə fərq kifayət etmir.
//
// ⚠️ DAİRƏ QAPALIDIR: son dilim İLK dilimin qonşusudur. Yalnız ardıcıl
// cütlərə baxsaq həmin cütü buraxardıq — donut-un ən görünən yeri məhz odur.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  SLICE_RAMP,
  SLICE_RAMP_SIZE,
  sliceFill,
  sliceRampIndex,
} from "./palette";

/** Praktikada mümkün dilim sayı: k-anonimlik 19 respondentdə ən çox 6 verir. */
const COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

describe("dilim şkalası", () => {
  it("şkala tokenlərdən qurulur — hardcode hex YOXDUR", () => {
    expect(SLICE_RAMP).toHaveLength(SLICE_RAMP_SIZE);
    for (const fill of SLICE_RAMP) {
      expect(fill).toMatch(/^var\(--slice-\d\)$/);
      expect(fill).not.toContain("#");
    }
  });

  it("pillə həmişə şkala hüdudlarındadır", () => {
    for (const count of COUNTS) {
      for (let index = 0; index < count; index += 1) {
        const step = sliceRampIndex(index, count);
        expect(step, `count=${count} index=${index}`).toBeGreaterThanOrEqual(0);
        expect(step, `count=${count} index=${index}`).toBeLessThan(SLICE_RAMP_SIZE);
      }
    }
  });

  it("🔴 qonşu dilimlərin fərqi ən azı 2 pillədir (dairə qapalı sayılır)", () => {
    for (const count of COUNTS) {
      if (count < 2) continue;

      const steps = Array.from({ length: count }, (_, index) =>
        sliceRampIndex(index, count),
      );

      for (let index = 0; index < count; index += 1) {
        // `(index + 1) % count` — SON dilim İLK dilimlə müqayisə olunur.
        const gap = Math.abs(steps[index] - steps[(index + 1) % count]);
        expect(gap, `count=${count}: ${index} ↔ ${(index + 1) % count} (${steps})`)
          .toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("dilimlər eyni pilləni PAYLAŞMIR (hər dilim öz tonundadır)", () => {
    for (const count of COUNTS) {
      const steps = Array.from({ length: count }, (_, index) =>
        sliceRampIndex(index, count),
      );

      expect(new Set(steps).size, `count=${count}: ${steps}`).toBe(count);
    }
  });

  it("şkala hər iki ucu işlədir — ən açıq və ən tünd ton hər zaman var", () => {
    for (const count of COUNTS) {
      if (count < 2) continue;

      const steps = Array.from({ length: count }, (_, index) =>
        sliceRampIndex(index, count),
      );

      expect(Math.min(...steps), `count=${count}`).toBe(0);
      expect(Math.max(...steps), `count=${count}`).toBe(SLICE_RAMP_SIZE - 1);
    }
  });

  it("tək dilim ən TÜND tonu alır — «az» kimi oxunmasın", () => {
    expect(sliceRampIndex(0, 1)).toBe(SLICE_RAMP_SIZE - 1);
    expect(sliceFill(0, 1)).toBe(`var(--slice-${SLICE_RAMP_SIZE})`);
  });

  it("`sliceFill` pillə ilə eyni nəticəni verir (iki mənbə ayrılmır)", () => {
    for (const count of COUNTS) {
      for (let index = 0; index < count; index += 1) {
        expect(sliceFill(index, count)).toBe(SLICE_RAMP[sliceRampIndex(index, count)]);
      }
    }
  });
});
