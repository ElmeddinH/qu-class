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
  POST_CATEGORY_VALUES,
  PostCategory,
  TimelineSourceType,
  VISIBILITY_VALUES,
  Visibility,
  type Visibility as VisibilityType,
} from "@/lib/enums";
import { academicYearOf } from "@/lib/stage";
import { isStricter } from "@/lib/visibility";

import {
  ACHIEVEMENT_TIMELINE_CATEGORY,
  EVENT_TIMELINE_CATEGORY,
  buildAchievement,
  buildEventTimelineEntry,
  eventTimelineCategory,
  buildAchievementTimelineEntry,
  buildTimelineEntry,
  derivedVisibility,
  timelineSummaryFor,
  timelineTitleFor,
  type AchievementTimelineSource,
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

// ---------------------------------------------------------------------------
// 5. Achievement → Timeline (Blok 8 — moderasiya təsdiqi)
// ---------------------------------------------------------------------------

function achievementSourceOf(
  overrides: Partial<AchievementTimelineSource> = {},
): AchievementTimelineSource {
  return {
    achievementId: "ach-001",
    cohortId: "cohort-1",
    title: "Respublika olimpiadası — birinci yer",
    description: "Riyaziyyat üzrə respublika mərhələsində birinci yer.",
    organization: "Təhsil Nazirliyi",
    awardedAt: localDate(2026, 10, 5), // 5 noyabr 2026
    visibility: Visibility.CLASS,
    ...overrides,
  };
}

describe("buildAchievementTimelineEntry", () => {
  it("mənbə növünü ACHIEVEMENT kimi işarələyir və achievementId-ni bağlayır", () => {
    const entry = buildAchievementTimelineEntry(achievementSourceOf());

    expect(entry.sourceType).toBe(TimelineSourceType.ACHIEVEMENT);
    expect(entry.achievementId).toBe("ach-001");
    expect(entry.cohortId).toBe("cohort-1");
  });

  // --- 🔒 Görünürlük: 16 kombinasiya ---

  it("görünürlük nailiyyətdən KOPYALANIR (tavan verilməyəndə)", () => {
    for (const level of VISIBILITY_VALUES) {
      const entry = buildAchievementTimelineEntry(
        achievementSourceOf({ visibility: level as VisibilityType }),
      );
      expect(entry.visibility).toBe(level);
    }
  });

  it("bütün 16 kombinasiyada nəticə MƏNBƏDƏN AÇIQ DEYİL", () => {
    for (const source of VISIBILITY_VALUES) {
      for (const ceiling of VISIBILITY_VALUES) {
        const entry = buildAchievementTimelineEntry(
          achievementSourceOf({ visibility: source as VisibilityType }),
          ceiling as VisibilityType,
        );

        expect(
          isStricter(source as VisibilityType, entry.visibility as VisibilityType),
          `${source} + tavan ${ceiling} → ${entry.visibility} (mənbədən açıqdır!)`,
        ).toBe(false);
      }
    }
  });

  it("tavan daha dardırsa nəticə tavandır, genişdirsə yenə mənbədir", () => {
    expect(
      buildAchievementTimelineEntry(
        achievementSourceOf({ visibility: Visibility.PUBLIC }),
        Visibility.CLASS,
      ).visibility,
    ).toBe(Visibility.CLASS);

    expect(
      buildAchievementTimelineEntry(
        achievementSourceOf({ visibility: Visibility.CLASS }),
        Visibility.PUBLIC,
      ).visibility,
    ).toBe(Visibility.CLASS);
  });

  // --- Akademik il: sentyabr sərhədi ---

  it("academicYear `awardedAt`-dan hesablanır (31 avqust HƏLƏ əvvəlki il)", () => {
    const entry = buildAchievementTimelineEntry(
      achievementSourceOf({ awardedAt: localDate(2026, 7, 31) }),
    );

    expect(entry.academicYear).toBe("2025-2026");
    expect(entry.academicYear).toBe(academicYearOf(localDate(2026, 7, 31)));
  });

  it("1 sentyabr YENİ tədris ilinə düşür", () => {
    const entry = buildAchievementTimelineEntry(
      achievementSourceOf({ awardedAt: localDate(2026, 8, 1) }),
    );
    expect(entry.academicYear).toBe("2026-2027");
  });

  it("`occurredAt` təsdiq tarixi DEYİL, `awardedAt`-dır", () => {
    const awardedAt = localDate(2025, 2, 14);
    const entry = buildAchievementTimelineEntry(achievementSourceOf({ awardedAt }));

    expect(entry.occurredAt).toEqual(awardedAt);
  });

  // --- Kateqoriya: post varsa ondan, yoxdursa sabit ---

  it("post kateqoriyası varsa ondan götürülür", () => {
    const entry = buildAchievementTimelineEntry(
      achievementSourceOf({ postCategory: PostCategory.COMPETITION }),
    );
    expect(entry.category).toBe(PostCategory.COMPETITION);
  });

  it("post yoxdursa sabit PostCategory işlədilir (AchievementCategory YOX)", () => {
    const entry = buildAchievementTimelineEntry(
      achievementSourceOf({ postCategory: null }),
    );

    expect(entry.category).toBe(ACHIEVEMENT_TIMELINE_CATEGORY);
    // Xronologiya filtri 12 `PostCategory` üzərindədir — "STARTUP" heç bir
    // filtrə düşməzdi.
    expect(POST_CATEGORY_VALUES).toContain(entry.category);
  });

  // --- Başlıq / xülasə ---

  it("xülasə izahdan gəlir, izah yoxdursa təşkilatdan", () => {
    expect(
      buildAchievementTimelineEntry(achievementSourceOf()).summary,
    ).toBe("Riyaziyyat üzrə respublika mərhələsində birinci yer.");

    expect(
      buildAchievementTimelineEntry(achievementSourceOf({ description: null })).summary,
    ).toBe("Təhsil Nazirliyi");

    expect(
      buildAchievementTimelineEntry(
        achievementSourceOf({ description: null, organization: null }),
      ).summary,
    ).toBeNull();
  });

  it("xülasə başlıqla eyni olarsa `null` qaytarılır", () => {
    const entry = buildAchievementTimelineEntry(
      achievementSourceOf({ title: "Qrant", description: "Qrant" }),
    );
    expect(entry.summary).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Event → TimelineEntry (Blok 9 — «Class Timeline-a əlavə et»)
// ---------------------------------------------------------------------------

function eventSourceOf(overrides: Partial<Parameters<typeof buildEventTimelineEntry>[0]> = {}) {
  return {
    eventId: "evt-1",
    cohortId: "cohort-1",
    title: "Buraxılış gecəsi",
    description: "Sinfin son görüşü.",
    summary: null as string | null,
    location: "Xankəndi, QU kampusu",
    category: "CEREMONY",
    startsAt: new Date("2026-06-20T18:00:00.000Z"),
    visibility: Visibility.CLASS as VisibilityType,
    ...overrides,
  };
}

describe("eventTimelineCategory", () => {
  it("🔴 hər `EventCategory` MÜTLƏQ `PostCategory`-yə düşür", () => {
    // Xronologiya filtri 12 `PostCategory` üzərindədir; xam `EventCategory`
    // yazılsaydı ("SEMINAR") qeyd heç bir filtrə düşməzdi.
    for (const [eventCategory, postCategory] of Object.entries(EVENT_TIMELINE_CATEGORY)) {
      expect(POST_CATEGORY_VALUES, eventCategory).toContain(postCategory);
    }
  });

  it("naməlum kateqoriya təhlükəsiz defolta düşür", () => {
    expect(eventTimelineCategory("SOMETHING_NEW")).toBe(PostCategory.EVENT_PHOTOS);
    expect(POST_CATEGORY_VALUES).toContain(eventTimelineCategory("SOMETHING_NEW"));
  });

  it("səyahət və yarış öz qarşılığını tapır", () => {
    expect(eventTimelineCategory("TRIP")).toBe(PostCategory.TRIPS);
    expect(eventTimelineCategory("COMPETITION")).toBe(PostCategory.COMPETITION);
  });
});

describe("buildEventTimelineEntry", () => {
  it("`sourceType = EVENT` və `eventId` doldurulur", () => {
    const entry = buildEventTimelineEntry(eventSourceOf());
    expect(entry.sourceType).toBe(TimelineSourceType.EVENT);
    expect(entry.eventId).toBe("evt-1");
    expect(entry.cohortId).toBe("cohort-1");
  });

  it("`occurredAt` tədbirin BAŞLAMA vaxtıdır (əlavə edilmə tarixi YOX)", () => {
    const entry = buildEventTimelineEntry(eventSourceOf());
    expect(entry.occurredAt).toEqual(new Date("2026-06-20T18:00:00.000Z"));
    expect(entry.academicYear).toBe(academicYearOf(entry.occurredAt));
  });

  it("🔒 görünürlük tədbirdən KOPYALANIR və ondan AÇIQ ola bilmir", () => {
    for (const level of VISIBILITY_VALUES) {
      const entry = buildEventTimelineEntry(eventSourceOf({ visibility: level }));
      expect(entry.visibility).toBe(level);
      expect(isStricter(level, entry.visibility as VisibilityType)).toBe(false);
    }
  });

  it("🔒 tavan verilsə qeyd DARALIR, genişlənmir", () => {
    const entry = buildEventTimelineEntry(
      eventSourceOf({ visibility: Visibility.PUBLIC }),
      Visibility.CLASS,
    );
    expect(entry.visibility).toBe(Visibility.CLASS);
  });

  it("xülasə prioriteti: yekun mətni → təsvir → məkan", () => {
    expect(buildEventTimelineEntry(eventSourceOf({ summary: "40 nəfər gəldi." })).summary).toBe(
      "40 nəfər gəldi.",
    );
    expect(buildEventTimelineEntry(eventSourceOf()).summary).toBe("Sinfin son görüşü.");
    expect(
      buildEventTimelineEntry(eventSourceOf({ description: null })).summary,
    ).toBe("Xankəndi, QU kampusu");
    expect(
      buildEventTimelineEntry(eventSourceOf({ description: null, location: null })).summary,
    ).toBeNull();
  });

  it("xülasə başlıqla eyni olarsa `null` qaytarılır", () => {
    const entry = buildEventTimelineEntry(
      eventSourceOf({ title: "Görüş", description: "Görüş" }),
    );
    expect(entry.summary).toBeNull();
  });
});
