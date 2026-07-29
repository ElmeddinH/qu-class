// ============================================================================
// src/features/feed/schemas.test.ts
// Kompozitor sxeminin BAZASIZ testləri.
//
// Bura həm spesifikasiya tələblərini (kateqoriya MƏCBURİDİR — spec §6), həm də
// sxem tələlərini (T3: coerce yoxdur; `Achievement.awardedAt` nullable deyil)
// bərkidir.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  AchievementCategory,
  MemoryType,
  PostCategory,
  PostKind,
  Visibility,
} from "@/lib/enums";

import { createPostSchema, type CreatePostInput } from "./schemas";

// ---------------------------------------------------------------------------
// Köməkçilər
// ---------------------------------------------------------------------------

function baseInput(overrides: Partial<CreatePostInput> = {}): Record<string, unknown> {
  return {
    cohortId: "cohort-1",
    category: PostCategory.GENERAL,
    kind: PostKind.TEXT,
    visibility: Visibility.CLASS,
    body: "Bu gün ilk mühazirəmiz oldu.",
    occurredAt: "2026-09-01T10:00",
    linkUrl: "",
    linkTitle: "",
    linkImage: "",
    referencedEventId: "",
    showOnTimeline: false,
    showInAchievements: false,
    media: [],
    achievement: {
      category: undefined,
      title: "",
      organization: "",
      awardedAt: "",
      proofUrl: "",
    },
    memory: { type: undefined, title: "", body: "", dedicatedTo: "" },
    ...overrides,
  };
}

/** Sxem hansı sahələrdə səhv verdi? — "achievement.awardedAt" formasında. */
function errorPaths(input: Record<string, unknown>): string[] {
  const result = createPostSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join("."));
}

const validImage = {
  url: "/uploads/2026/09/abc.webp",
  thumbUrl: "/uploads/2026/09/abc-thumb.webp",
  type: "IMAGE",
  mimeType: "image/webp",
  sizeBytes: 12_345,
  width: 1600,
  height: 900,
  caption: "",
  order: 0,
};

// ---------------------------------------------------------------------------
// 1. Kateqoriya MƏCBURİDİR (spec §6)
// ---------------------------------------------------------------------------

describe("createPostSchema — kateqoriya", () => {
  it("kateqoriyasız post RƏDD olunur", () => {
    const input = baseInput();
    delete input.category;

    const result = createPostSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(errorPaths(input)).toContain("category");
  });

  it("boş sətir kateqoriya sayılmır", () => {
    expect(errorPaths(baseInput({ category: "" as never }))).toContain("category");
  });

  it("naməlum kateqoriya rədd olunur", () => {
    expect(errorPaths(baseInput({ category: "MEZUNIYYET" as never }))).toContain(
      "category",
    );
  });

  it("səhv mesajı azərbaycancadır", () => {
    const result = createPostSchema.safeParse(baseInput({ category: "" as never }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "category");
      expect(issue?.message).toBe("Paylaşım kateqoriyası seçilməlidir.");
    }
  });

  it("12 kateqoriyanın hamısı qəbul edilir", () => {
    for (const category of Object.values(PostCategory)) {
      expect(createPostSchema.safeParse(baseInput({ category })).success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. kind = ACHIEVEMENT → awardedAt MƏCBURİDİR
// ---------------------------------------------------------------------------

describe("createPostSchema — nailiyyət", () => {
  it("kind = ACHIEVEMENT-də `awardedAt` olmadan RƏDD olunur", () => {
    const paths = errorPaths(
      baseInput({
        kind: PostKind.ACHIEVEMENT,
        achievement: {
          category: AchievementCategory.AWARD,
          title: "Prezident təqaüdü",
          organization: "",
          awardedAt: "", // ⚠️ sxemdə `DateTime` — nullable DEYİL
          proofUrl: "",
        },
      }),
    );

    expect(paths).toContain("achievement.awardedAt");
  });

  it("xarab tarix də rədd olunur", () => {
    const paths = errorPaths(
      baseInput({
        kind: PostKind.ACHIEVEMENT,
        achievement: {
          category: AchievementCategory.AWARD,
          title: "Prezident təqaüdü",
          organization: "",
          awardedAt: "otuz iyun",
          proofUrl: "",
        },
      }),
    );

    expect(paths).toContain("achievement.awardedAt");
  });

  it("kateqoriya və ad da tələb olunur", () => {
    const paths = errorPaths(baseInput({ kind: PostKind.ACHIEVEMENT }));

    expect(paths).toContain("achievement.category");
    expect(paths).toContain("achievement.title");
    expect(paths).toContain("achievement.awardedAt");
  });

  it("tam doldurulmuş nailiyyət qəbul edilir", () => {
    const result = createPostSchema.safeParse(
      baseInput({
        kind: PostKind.ACHIEVEMENT,
        achievement: {
          category: AchievementCategory.PUBLICATION,
          title: "Elmi məqalə — Springer",
          organization: "Springer",
          awardedAt: "2026-05-20",
          proofUrl: "https://example.org/dergi",
        },
      }),
    );

    expect(result.success).toBe(true);
  });

  it("«Achievements-ə əlavə et» işarələnəndə növ TEXT olsa da sahələr tələb olunur", () => {
    // Sətir sxemdə `title`/`category`/`awardedAt` olmadan yarana bilməz.
    const paths = errorPaths(baseInput({ showInAchievements: true }));

    expect(paths).toContain("achievement.category");
    expect(paths).toContain("achievement.title");
    expect(paths).toContain("achievement.awardedAt");
  });

  it("bayraq qapalıdırsa boş nailiyyət sahələri formanı BLOKLAMIR", () => {
    expect(createPostSchema.safeParse(baseInput()).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Digər növ-spesifik qaydalar
// ---------------------------------------------------------------------------

describe("createPostSchema — növə görə tələblər", () => {
  it("TEXT: boş mətn rədd olunur", () => {
    expect(errorPaths(baseInput({ body: "" }))).toContain("body");
  });

  it("PHOTO / ALBUM: ən azı bir şəkil tələb olunur", () => {
    expect(errorPaths(baseInput({ kind: PostKind.PHOTO, media: [] }))).toContain("media");
    expect(errorPaths(baseInput({ kind: PostKind.ALBUM, media: [] }))).toContain("media");
  });

  it("PHOTO: şəkil varsa keçir", () => {
    const result = createPostSchema.safeParse(
      baseInput({ kind: PostKind.PHOTO, body: "", media: [validImage] as never }),
    );
    expect(result.success).toBe(true);
  });

  it("LINK: ünvan tələb olunur", () => {
    expect(errorPaths(baseInput({ kind: PostKind.LINK, body: "" }))).toContain("linkUrl");
  });

  it("LINK: http/https olmayan ünvan rədd olunur", () => {
    expect(
      errorPaths(baseInput({ kind: PostKind.LINK, linkUrl: "javascript:alert(1)" })),
    ).toContain("linkUrl");
  });

  it("EVENT: tədbir seçilməlidir", () => {
    expect(errorPaths(baseInput({ kind: PostKind.EVENT, body: "" }))).toContain(
      "referencedEventId",
    );
  });

  it("MEMORY: növ, başlıq və mətn tələb olunur", () => {
    const paths = errorPaths(baseInput({ kind: PostKind.MEMORY, body: "" }));

    expect(paths).toContain("memory.type");
    expect(paths).toContain("memory.title");
    expect(paths).toContain("memory.body");
  });

  it("MEMORY: tam doldurulmuş xatirə keçir", () => {
    const result = createPostSchema.safeParse(
      baseInput({
        kind: PostKind.MEMORY,
        body: "",
        memory: {
          type: MemoryType.THANKS_TEACHER,
          title: "Fizika müəllimimə",
          body: "İlk kursda məni ruhlandıran adam oldu.",
          dedicatedTo: "Prof. Əliyev",
        },
      }),
    );

    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. TƏLƏ T3 — tarixlər SƏTİR qalır, coerce YOXDUR
// ---------------------------------------------------------------------------

describe("createPostSchema — tarixlərin tipi (T3)", () => {
  it("`occurredAt` parse-dan SONRA da sətirdir (Date-ə çevrilmir)", () => {
    const result = createPostSchema.safeParse(baseInput());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.occurredAt).toBe("string");
      expect(result.data.occurredAt).toBe("2026-09-01T10:00");
    }
  });

  it("`achievement.awardedAt` da sətirdir", () => {
    const result = createPostSchema.safeParse(
      baseInput({
        showInAchievements: true,
        achievement: {
          category: AchievementCategory.GRANT,
          title: "Erasmus+ qrantı",
          organization: "",
          awardedAt: "2026-03-01",
          proofUrl: "",
        },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.achievement.awardedAt).toBe("string");
    }
  });

  it("xarab `occurredAt` rədd olunur", () => {
    expect(errorPaths(baseInput({ occurredAt: "sabah" }))).toContain("occurredAt");
    expect(errorPaths(baseInput({ occurredAt: "" }))).toContain("occurredAt");
  });
});
