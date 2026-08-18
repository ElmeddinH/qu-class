// ============================================================================
// src/features/where-are-we-now/palette.test.ts
// Blok 12B · borc 4 — donut dilimlərinin ARDICIL şkalası.
// Blok 12F — ÖLÇÜ VAHİDİ DÜZƏLDİLDİ.
//
// 🔴 TESTİN ƏSAS SUALI DƏYİŞDİ. Əvvəl «qonşu dilimlər arasında ən azı 2 PİLLƏ
// fərq varmı?» soruşulurdu və cavab HƏMİŞƏ «hə» idi — amma qayda pozulurdu:
// 4 dilim halında `--slice-6` ↔ `--slice-4` cütü 2 pillə uzaqdır və cəmi
// **1.73:1** kontrast verir. Pillə sayı kontrastın ƏVƏZİ DEYİL.
//
// İndi test WCAG nisbi parlaqlıq düsturu ilə ƏSL KONTRASTI hesablayır və
// hexləri `app/globals.css`-dən OXUYUR — token dəyişsə test qırmızıya düşür
// (`kuds-contrast.test.ts` ilə eyni üsul: mənbə skanı, render yox).
//
// ⚠️ DAİRƏ QAPALIDIR: son dilim İLK dilimin qonşusudur. Yalnız ardıcıl
// cütlərə baxsaq həmin cütü buraxardıq — donut-un ən görünən yeri məhz odur.
//
// ⚠️ 3 və 5 dilim halında 3:1 RİYAZİ OLARAQ MÜMKÜN DEYİL (bax `palette.ts`
// başlığı: şkalanın diapazonu 8.53 < 9 → «bir-birinə qarşı 3:1» olan üç ton
// yoxdur → qonşuluq qrafi ikihissəlidir → tək uzunluqlu dövr yoxdur). Test bu
// halları GİZLƏTMİR: onlar üçün ayrıca «mümkün olan ən yaxşısı» hədddi
// yoxlanılır, cüt saylar üçün isə tam 3:1 tələb olunur.
// ============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAX_DONUT_SLICES,
  SLICE_RAMP,
  SLICE_RAMP_SIZE,
  sliceFill,
  sliceRampIndex,
} from "./palette";

// ---------------------------------------------------------------------------
// Tokenlərin ƏSL dəyəri — `globals.css`-dən oxunur, testdə TƏKRAR YAZILMIR.
// ---------------------------------------------------------------------------

const CSS = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

/** `--slice-N: #rrggbb;` → hex. Tapılmasa test AÇIQ şəkildə sınır. */
function sliceHex(step: number): string {
  const match = CSS.match(new RegExp(`--slice-${step + 1}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`--slice-${step + 1} globals.css-də tapılmadı`);
  return match[1];
}

/** WCAG 2.x nisbi parlaqlıq (sRGB). */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** İki rəngin WCAG kontrast nisbəti. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `count` dilimlik QAPALI halqada ən pis qonşu cütün kontrastı. */
function worstNeighbourContrast(count: number): number {
  const steps = Array.from({ length: count }, (_, index) => sliceRampIndex(index, count));
  let worst = Infinity;
  for (let index = 0; index < count; index += 1) {
    const here = sliceHex(steps[index]);
    const next = sliceHex(steps[(index + 1) % count]);
    worst = Math.min(worst, contrast(here, next));
  }
  return worst;
}

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

  it("🔴 CÜT saylı dilimlərdə qonşu kontrastı ≥ 3:1 (dairə qapalı sayılır)", () => {
    // Praktikada göstərilən bütün cüt saylar — `MAX_DONUT_SLICES` = 6.
    for (const count of [2, 4, 6]) {
      expect(worstNeighbourContrast(count), `count=${count}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("🔴 TƏK saylı dilimlərdə mümkün olan ƏN YAXŞI hədd saxlanılır", () => {
    // 3:1 burada RİYAZİ olaraq əlçatmazdır (fayl başlığındaki sübut).
    // Test yenə də regresiyanı tutur: sıra pisləşsə bu hədd sınır.
    for (const count of [3, 5]) {
      expect(worstNeighbourContrast(count), `count=${count}`).toBeGreaterThanOrEqual(2.5);
    }
  });

  it("🔴 `MAX_DONUT_SLICES` məhz kontrast hüdududur — 7 dilim 3:1 vermir", () => {
    // Bu test SƏBƏBİ sənədləşdirir: hüdud estetik seçim deyil.
    expect(MAX_DONUT_SLICES).toBe(6);
    expect(worstNeighbourContrast(6)).toBeGreaterThanOrEqual(3);
    expect(worstNeighbourContrast(7)).toBeLessThan(3);
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
