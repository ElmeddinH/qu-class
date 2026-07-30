// ============================================================================
// src/features/memories/schemas.test.ts
// Xatirə sxemləri — Blok 10A-nın ƏSAS MEMARLIQ QƏRARININ testi.
//
// 🔴 TƏLƏ A: `showInTimeline` yalnız `showInFeed` açıq olduqda seçilə bilər.
// `TimelineEntry`-də Memory-yə FK yoxdur, yəni xatirə xronologiyaya ANCAQ
// bağlı Post vasitəsilə düşür. UI checkbox-u `disabled` edir, amma UI qoruma
// SAYILMIR — server action birbaşa çağırıla bilər. Qayda burada, Zod
// `superRefine`-dədir və hər iki sxemə (yaratma + redaktə) tətbiq olunur.
// ============================================================================

import { describe, expect, it } from "vitest";

import { MemoryType, Visibility } from "@/lib/enums";
import {
  MAX_MEMORY_TITLE,
  TIMELINE_REQUIRES_FEED_MESSAGE,
  createMemorySchema,
  memoryIdSchema,
  updateMemorySchema,
} from "./schemas";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    cohortId: "coh-1",
    type: MemoryType.SHORT_MEMORY,
    title: "İlk gün",
    body: "Universitetdə ilk günümüz idi və hamı bir-birini tanımırdı.",
    dedicatedTo: "",
    imageUrl: "",
    occurredAt: "2026-09-02",
    guidePlaceId: "",
    visibility: Visibility.CLASS,
    showInProfile: true,
    showInFeed: true,
    showInTimeline: false,
    showInYearbook: false,
    ...overrides,
  };
}

describe("🔴 TƏLƏ A — showInTimeline ⊂ showInFeed", () => {
  it("`showInFeed` SÖNDÜRÜLÜ ikən `showInTimeline` RƏDD olunur", () => {
    const result = createMemorySchema.safeParse(
      validInput({ showInFeed: false, showInTimeline: true }),
    );

    expect(result.success).toBe(false);
    if (result.success) return;

    const issue = result.error.issues.find((i) => i.path.join(".") === "showInTimeline");
    expect(issue?.message).toBe(TIMELINE_REQUIRES_FEED_MESSAGE);
  });

  it("hər ikisi açıq olduqda keçir", () => {
    expect(
      createMemorySchema.safeParse(
        validInput({ showInFeed: true, showInTimeline: true }),
      ).success,
    ).toBe(true);
  });

  it("`showInFeed` bağlı, `showInTimeline` da bağlı olduqda keçir", () => {
    // Xatirə yalnız profildə / albomda qala bilər — bu, tam keçərli haldır.
    expect(
      createMemorySchema.safeParse(
        validInput({ showInFeed: false, showInTimeline: false }),
      ).success,
    ).toBe(true);
  });

  it("REDAKTƏ sxemi eyni qaydanı tətbiq edir", () => {
    const result = updateMemorySchema.safeParse({
      ...validInput({ showInFeed: false, showInTimeline: true }),
      memoryId: "mry-001",
    });

    expect(result.success).toBe(false);
  });

  it("digər üç seçim MÜSTƏQİLDİR — asılılıq yalnız timeline↔feed arasındadır", () => {
    expect(
      createMemorySchema.safeParse(
        validInput({
          showInProfile: false,
          showInFeed: false,
          showInTimeline: false,
          showInYearbook: true,
        }),
      ).success,
    ).toBe(true);
  });
});

describe("sahə doğrulaması", () => {
  it("növ seçilməlidir", () => {
    const result = createMemorySchema.safeParse(validInput({ type: undefined }));
    expect(result.success).toBe(false);
  });

  it("qısa hekayə qəbul edilmir (bu bölmə hekayəvidir)", () => {
    expect(createMemorySchema.safeParse(validInput({ body: "Yaxşı idi." })).success).toBe(
      false,
    );
  });

  it("uzun başlıq kəsilmir, RƏDD olunur", () => {
    expect(
      createMemorySchema.safeParse(validInput({ title: "x".repeat(MAX_MEMORY_TITLE + 1) }))
        .success,
    ).toBe(false);
  });

  it("xarab tarix rədd olunur (T3: çevirmə serverdədir, sxem sətir yoxlayır)", () => {
    expect(createMemorySchema.safeParse(validInput({ occurredAt: "abc" })).success).toBe(
      false,
    );
  });

  it("`guidePlaceId` boş buraxıla bilər — məkan istəyə bağlıdır", () => {
    expect(createMemorySchema.safeParse(validInput({ guidePlaceId: "" })).success).toBe(
      true,
    );
  });

  it("naməlum görünürlük səviyyəsi rədd olunur", () => {
    expect(createMemorySchema.safeParse(validInput({ visibility: "SECRET" })).success).toBe(
      false,
    );
  });
});

describe("memoryIdSchema", () => {
  it("boş id qəbul etmir", () => {
    expect(memoryIdSchema.safeParse({ memoryId: "  " }).success).toBe(false);
    expect(memoryIdSchema.safeParse({ memoryId: "mry-001" }).success).toBe(true);
  });
});
