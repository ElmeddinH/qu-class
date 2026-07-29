// ============================================================================
// src/features/feed/fanout.test.ts
// Feed → Timeline / Achievements yayılmasının BAZASIZ testləri.
//
// Burada yoxlanan üç şey sistemin ən kövrək yeridir:
//   1. Akademik il sərhədi (31 avqust / 1 sentyabr) — səhv olsa qeyd yanlış
//      ilə düşür və Timeline filtri onu itirir
//   2. 🔒 Törəmə qeyd MƏNBƏDƏN AÇIQ OLA BİLMƏZ — bu, məxfilik sızmasıdır
//   3. Nailiyyət kateqoriyası İSTİFADƏÇİDƏN gəlir, post kateqoriyasından
//      TÖRƏDİLMİR (tələ T9)
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  AchievementCategory,
  AchievementStatus,
  PostCategory,
  TimelineSourceType,
  VISIBILITY_VALUES,
  Visibility,
  type Visibility as VisibilityType,
} from "@/lib/enums";
import { academicYearOf } from "@/lib/stage";
import { isStricter } from "@/lib/visibility";

import {
  buildAchievement,
  buildTimelineEntry,
  derivedVisibility,
  timelineSummaryFor,
  timelineTitleFor,
  type PostFanoutSource,
} from "./fanout";

// ---------------------------------------------------------------------------
// Köməkçilər
// ---------------------------------------------------------------------------

/**
 * ⚠️ Tarixlər YERLİ komponentlərlə qurulur (`new Date(2026, 7, 31)`), ISO
 * sətri ilə YOX. `new Date("2026-08-31")` UTC yarımgecəsidir və UTC-dən geri
 * qalan saat qurşağında 30 avqusta düşür — test maşından asılı olardı.
 */
function localDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12, 0, 0);
}

function sourceOf(overrides: Partial<PostFanoutSource> = {}): PostFanoutSource {
  return {
    category: PostCategory.TRIPS,
    visibility: Visibility.CLASS,
    occurredAt: localDate(2026, 10, 5), // 5 noyabr 2026
    body: "Şəkidə sinif səyahəti",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Akademik il sərhədləri
// ---------------------------------------------------------------------------

describe("academicYearOf — sentyabr 1 / avqust 31 sərhədi", () => {
  it("31 avqust HƏLƏ əvvəlki tədris ilidir", () => {
    expect(academicYearOf(localDate(2026, 7, 31))).toBe("2025-2026");
  });

  it("1 sentyabr YENİ tədris ilini başladır", () => {
    expect(academicYearOf(localDate(2026, 8, 1))).toBe("2026-2027");
  });

  it("sərhədin iki tərəfi ARDICIL illərdir (boşluq və üst-üstə düşmə yoxdur)", () => {
    const before = academicYearOf(localDate(2026, 7, 31));
    const after = academicYearOf(localDate(2026, 8, 1));

    expect(before).toBe("2025-2026");
    expect(after).toBe("2026-2027");
    // Əvvəlkinin bitmə ili sonrakının başlanğıc ilidir.
    expect(before.slice(5)).toBe(after.slice(0, 4));
  });

  it("yanvar əvvəlki sentyabrdan başlayan ilə aiddir", () => {
    expect(academicYearOf(localDate(2027, 0, 15))).toBe("2026-2027");
  });

  it("TimelineEntry.academicYear məhz `occurredAt`-dan hesablanır", () => {
    const entry = buildTimelineEntry("post-1", "cohort-1", sourceOf({
      occurredAt: localDate(2026, 8, 1),
    }));

    expect(entry.academicYear).toBe("2026-2027");
    expect(entry.occurredAt).toEqual(localDate(2026, 8, 1));
  });
});

// ---------------------------------------------------------------------------
// 2. 🔒 Görünürlük — törəmə qeyd mənbədən AÇIQ OLA BİLMƏZ
// ---------------------------------------------------------------------------

describe("derivedVisibility — törəmə qeyd mənbədən açıq olmur", () => {
  it("tavan verilməsə mənbəni OLDUĞU KİMİ kopyalayır", () => {
    for (const level of VISIBILITY_VALUES) {
      expect(derivedVisibility(level)).toBe(level);
    }
  });

  it("bütün 16 kombinasiyada nəticə mənbədən açıq DEYİL", () => {
    for (const source of VISIBILITY_VALUES) {
      for (const ceiling of VISIBILITY_VALUES) {
        const result = derivedVisibility(source, ceiling);

        // "Mənbədən açıq" = mənbə nəticədən daha məhdudlaşdırıcıdır.
        expect(
          isStricter(source, result),
          `${source} + tavan ${ceiling} → ${result} (mənbədən açıqdır!)`,
        ).toBe(false);
      }
    }
  });

  it("tavan daha dardırsa nəticə tavandır", () => {
    expect(derivedVisibility(Visibility.PUBLIC, Visibility.CLASS)).toBe(Visibility.CLASS);
    expect(derivedVisibility(Visibility.UNIVERSITY, Visibility.PRIVATE)).toBe(
      Visibility.PRIVATE,
    );
  });

  it("tavan daha genişdirsə nəticə yenə MƏNBƏDİR (tavan açmır)", () => {
    expect(derivedVisibility(Visibility.PRIVATE, Visibility.PUBLIC)).toBe(
      Visibility.PRIVATE,
    );
    expect(derivedVisibility(Visibility.CLASS, Visibility.UNIVERSITY)).toBe(
      Visibility.CLASS,
    );
  });

  it("TimelineEntry.visibility post-dan kopyalanır", () => {
    for (const level of VISIBILITY_VALUES) {
      const entry = buildTimelineEntry(
        "post-1",
        "cohort-1",
        sourceOf({ visibility: level as VisibilityType }),
      );
      expect(entry.visibility).toBe(level);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. TimelineEntry sahələri
// ---------------------------------------------------------------------------

describe("buildTimelineEntry", () => {
  it("mənbə növünü POST kimi işarələyir və postId-ni bağlayır", () => {
    const entry = buildTimelineEntry("post-42", "cohort-7", sourceOf());

    expect(entry.sourceType).toBe(TimelineSourceType.POST);
    expect(entry.postId).toBe("post-42");
    expect(entry.cohortId).toBe("cohort-7");
  });

  it("kateqoriyanı post-dan olduğu kimi götürür", () => {
    const entry = buildTimelineEntry(
      "post-1",
      "cohort-1",
      sourceOf({ category: PostCategory.CAPSTONE }),
    );
    expect(entry.category).toBe(PostCategory.CAPSTONE);
  });

  it("başlıq üçün nailiyyət adı ən yüksək prioritetdir", () => {
    const title = timelineTitleFor(
      sourceOf({ achievementTitle: "Respublika olimpiadası", memoryTitle: "Xatirə" }),
    );
    expect(title).toBe("Respublika olimpiadası");
  });

  it("nailiyyət yoxdursa mətnin İLK SƏTRİ başlıq olur", () => {
    const title = timelineTitleFor(sourceOf({ body: "Birinci sətir\nİkinci sətir" }));
    expect(title).toBe("Birinci sətir");
  });

  it("mətn boşdursa kateqoriya etiketi başlıq olur (başlıq heç vaxt boş qalmır)", () => {
    const title = timelineTitleFor(
      sourceOf({ body: null, category: PostCategory.EVENT_PHOTOS }),
    );
    expect(title).toBe("Tədbir fotoları");
    expect(title.length).toBeGreaterThan(0);
  });

  it("xülasə başlıqla eyni olarsa `null` qaytarılır", () => {
    const source = sourceOf({ body: "Qısa mətn" });
    expect(timelineSummaryFor(source, timelineTitleFor(source))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Achievement — T9
// ---------------------------------------------------------------------------

describe("buildAchievement", () => {
  const details = {
    category: AchievementCategory.STARTUP,
    title: "QU Founders — birinci yer",
    organization: "Qarabağ Universiteti",
    awardedAt: localDate(2026, 4, 20),
    proofUrl: null,
  };

  it("statusu HƏMİŞƏ SUBMITTED-dir (istifadəçi özünü təsdiqləyə bilməz)", () => {
    const achievement = buildAchievement(
      "post-1",
      "cohort-1",
      "user-1",
      sourceOf(),
      details,
    );
    expect(achievement.status).toBe(AchievementStatus.SUBMITTED);
  });

  it("kateqoriya İSTİFADƏÇİDƏN gəlir, post kateqoriyasından TÖRƏDİLMİR", () => {
    const achievement = buildAchievement(
      "post-1",
      "cohort-1",
      "user-1",
      // Post kateqoriyası TRIPS, nailiyyət kateqoriyası STARTUP — kəsişmir.
      sourceOf({ category: PostCategory.TRIPS }),
      details,
    );

    expect(achievement.category).toBe(AchievementCategory.STARTUP);
    expect(achievement.category).not.toBe(PostCategory.TRIPS);
  });

  it("görünürlüyü post-dan kopyalayır", () => {
    const achievement = buildAchievement(
      "post-1",
      "cohort-1",
      "user-1",
      sourceOf({ visibility: Visibility.UNIVERSITY }),
      details,
    );
    expect(achievement.visibility).toBe(Visibility.UNIVERSITY);
  });

  it("sahibi və tarixi olduğu kimi saxlayır", () => {
    const achievement = buildAchievement(
      "post-9",
      "cohort-3",
      "user-77",
      sourceOf(),
      details,
    );

    expect(achievement.ownerId).toBe("user-77");
    expect(achievement.postId).toBe("post-9");
    expect(achievement.awardedAt).toEqual(details.awardedAt);
  });
});
