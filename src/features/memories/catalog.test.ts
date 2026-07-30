// ============================================================================
// src/features/memories/catalog.test.ts
// Xatirə kataloqunun ƏHATƏSİ (Blok 10A).
//
// `Record<MemoryType, …>` tipi enum-a yeni növ əlavə olunanda `tsc`-ni
// dayandırır, amma test ƏLAVƏ qorumadır: cədvəl doğru dəyərlərlə doludurmu,
// etiketlər VAHİD MƏNBƏDƏNDİRmi (T13), ton yalnız üç KUDS fonundandırmı.
// ============================================================================

import { describe, expect, it } from "vitest";

import { MEMORY_TYPE_VALUES } from "@/lib/enums";
import { MEMORY_TYPE_LABELS } from "@/lib/labels";
import {
  MEMORY_ICONS,
  MEMORY_TONES,
  MEMORY_TYPE_META,
  MEMORY_TYPE_OPTIONS,
  memoryToneClass,
  memoryTypeMeta,
} from "./catalog";

describe("MEMORY_TYPE_META", () => {
  it("8 növün HAMISINI əhatə edir", () => {
    expect(Object.keys(MEMORY_TYPE_META).sort()).toEqual([...MEMORY_TYPE_VALUES].sort());
    expect(MEMORY_TYPE_VALUES).toHaveLength(8);
  });

  it("🔴 etiketlər `lib/labels.ts`-dəndir — ikinci cədvəl yoxdur (T13)", () => {
    for (const type of MEMORY_TYPE_VALUES) {
      expect(MEMORY_TYPE_META[type].label, type).toBe(MEMORY_TYPE_LABELS[type]);
    }
  });

  it("hər növün ikonu REYESTRDƏ var (T1 — ad, komponent deyil)", () => {
    for (const type of MEMORY_TYPE_VALUES) {
      expect(MEMORY_ICONS[MEMORY_TYPE_META[type].icon], type).toBeDefined();
    }
  });

  it("ton yalnız üç KUDS FON rəngindən biridir", () => {
    const allowed = Object.keys(MEMORY_TONES);

    for (const type of MEMORY_TYPE_VALUES) {
      expect(allowed, type).toContain(MEMORY_TYPE_META[type].tone);
    }
  });

  it("ton sinifləri YALNIZ fon (`bg-`) sinifləridir — mətn rəngi kimi yazılmayıb", () => {
    for (const tone of Object.values(MEMORY_TONES)) {
      expect(tone.startsWith("bg-")).toBe(true);
    }
  });

  it("seçim sırası enum massivi ilə eynidir", () => {
    expect(MEMORY_TYPE_OPTIONS).toEqual(MEMORY_TYPE_VALUES);
  });
});

describe("naməlum dəyər (DB sütunu String-dir)", () => {
  it("`memoryTypeMeta` UI-nı sındırmır", () => {
    const meta = memoryTypeMeta("TELEPATHY");

    expect(meta.label).toBe("Xatirə");
    expect(MEMORY_ICONS[meta.icon]).toBeDefined();
  });

  it("`memoryToneClass` yenə etibarlı fon sinfi verir", () => {
    expect(Object.values(MEMORY_TONES)).toContain(memoryToneClass("TELEPATHY"));
  });
});
