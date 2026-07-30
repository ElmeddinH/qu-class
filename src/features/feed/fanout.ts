// ============================================================================
// src/features/feed/fanout.ts
// Feed → Timeline / Achievements yayılmasının SAF hesablaması (PLAN.md §4.4).
//
// Bu fayl Prisma import ETMİR və heç bir DB sorğusu qurmur — yalnız post
// məlumatından törəmə sətirlərin sahələrini hesablayır. Səbəb: yayılma
// qaydaları (görünürlük tavanı, akademik il, başlıq) məhz burada səhv salınırsa
// məxfilik sızması olur, ona görə onlar bazasız unit testlə bərkidilir
// (`fanout.test.ts`).
//
// 🔒 ƏSAS QAYDA: törəmə qeyd MƏNBƏDƏN DAHA AÇIQ OLA BİLMƏZ.
// `narrowest(post.visibility, ceiling)` — tavan verilməsə də funksiya
// mənbəni olduğu kimi kopyalayır, heç vaxt açmır.
// ============================================================================

import {
  AchievementStatus,
  PostCategory,
  TimelineSourceType,
  Visibility,
  type AchievementCategory,
  type Visibility as VisibilityType,
} from "@/lib/enums";
import { academicYearOf } from "@/lib/stage";
import { narrowest } from "@/lib/visibility";

import { POST_CATEGORY_META } from "./catalog";

/** Timeline başlığının maksimum uzunluğu — kartda bir-iki sətrə sığmalıdır. */
export const TIMELINE_TITLE_MAX = 120;
/** Timeline xülasəsi. */
export const TIMELINE_SUMMARY_MAX = 280;

// ---------------------------------------------------------------------------
// Görünürlük tavanı
// ---------------------------------------------------------------------------

/**
 * Törəmə qeydin görünürlüyü.
 *
 * `ceiling` default `PUBLIC`-dir, yəni məhdudiyyət qoymur — nəticə mənbənin
 * səviyyəsidir. Cohort səviyyəsində tavan tətbiq olunası olsa (məs. arxivlənmiş
 * sinif yalnız `CLASS` göstərsin) onu buraya ötürmək kifayətdir.
 *
 * ⚠️ Bu funksiya YALNIZ daraldır. `narrowest` iki səviyyədən daha
 * MƏHDUDLAŞDIRICI olanı qaytarır, ona görə çıxış heç vaxt mənbədən açıq olmur.
 */
export function derivedVisibility(
  source: VisibilityType,
  ceiling: VisibilityType = Visibility.PUBLIC,
): VisibilityType {
  return narrowest(source, ceiling);
}

// ---------------------------------------------------------------------------
// Başlıq / xülasə
// ---------------------------------------------------------------------------

function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/** Mətnin ilk sətri — Timeline başlığı üçün. */
function firstLine(text: string): string {
  const [line] = text.split(/\r?\n/);
  return line?.trim() ?? "";
}

/** Post-un yayılmada işlədilən sahələri. */
export interface PostFanoutSource {
  category: PostCategory;
  visibility: VisibilityType;
  occurredAt: Date;
  body: string | null;
  /** `kind = ACHIEVEMENT` olduqda nailiyyətin adı — başlıq üçün üstünlük. */
  achievementTitle?: string | null;
  /** `kind = MEMORY` olduqda xatirənin başlığı. */
  memoryTitle?: string | null;
}

/**
 * `TimelineEntry.title` — sxemdə NULLABLE DEYİL, yəni həmişə bir dəyər lazımdır.
 *
 * Prioritet: nailiyyət adı → xatirə başlığı → mətnin ilk sətri → kateqoriya
 * etiketi. Sonuncu sığorta: mətnsiz foto paylaşımı da xronologiyada adsız
 * qalmır ("Tədbir fotoları" kimi görünür).
 */
export function timelineTitleFor(source: PostFanoutSource): string {
  const candidate =
    source.achievementTitle?.trim() ||
    source.memoryTitle?.trim() ||
    firstLine(source.body ?? "");

  if (candidate.length > 0) return clamp(candidate, TIMELINE_TITLE_MAX);
  return POST_CATEGORY_META[source.category].label;
}

/** Başlıqla eyni olan xülasə göstərmək mənasızdır → belə halda `null`. */
export function timelineSummaryFor(source: PostFanoutSource, title: string): string | null {
  const body = source.body?.trim() ?? "";
  if (body.length === 0) return null;

  const summary = clamp(body, TIMELINE_SUMMARY_MAX);
  return summary === title ? null : summary;
}

// ---------------------------------------------------------------------------
// TimelineEntry
// ---------------------------------------------------------------------------

/** `prisma.timelineEntry.create({ data })` üçün hazır obyekt. */
export interface TimelineEntryFanout {
  cohortId: string;
  sourceType: string;
  postId: string;
  title: string;
  summary: string | null;
  category: string;
  occurredAt: Date;
  academicYear: string;
  visibility: string;
}

/**
 * Post-dan TimelineEntry sahələri.
 *
 * · `category`, `occurredAt` — post-dan olduğu kimi
 * · `academicYear` — `occurredAt`-dan hesablanır (sentyabr 1 – avqust 31)
 * · `visibility` — post-dan KOPYALANIR, `derivedVisibility` ilə daraldıla bilər
 */
export function buildTimelineEntry(
  postId: string,
  cohortId: string,
  source: PostFanoutSource,
  ceiling?: VisibilityType,
): TimelineEntryFanout {
  const title = timelineTitleFor(source);

  return {
    cohortId,
    sourceType: TimelineSourceType.POST,
    postId,
    title,
    summary: timelineSummaryFor(source, title),
    category: source.category,
    occurredAt: source.occurredAt,
    academicYear: academicYearOf(source.occurredAt),
    visibility: derivedVisibility(source.visibility, ceiling),
  };
}

// ---------------------------------------------------------------------------
// Achievement
// ---------------------------------------------------------------------------

/** İstifadəçinin inline formda doldurduğu nailiyyət məlumatı (çevrilmiş). */
export interface AchievementFanoutInput {
  /** ⚠️ İSTİFADƏÇİDƏN gəlir — post kateqoriyasından TÖRƏDİLMİR (tələ T9). */
  category: AchievementCategory;
  title: string;
  organization: string | null;
  awardedAt: Date;
  proofUrl: string | null;
}

/** `prisma.achievement.create({ data })` üçün hazır obyekt. */
export interface AchievementFanout {
  ownerId: string;
  cohortId: string;
  postId: string;
  category: string;
  title: string;
  description: string | null;
  organization: string | null;
  proofUrl: string | null;
  awardedAt: Date;
  status: string;
  visibility: string;
}

/**
 * Post-dan Achievement sahələri.
 *
 * · `status` — həmişə `SUBMITTED`: nailiyyət təsdiqdən keçir (spec §12),
 *   istifadəçi öz nailiyyətini `VERIFIED` edə bilməz
 * · `category` — İSTİFADƏÇİDƏN, post kateqoriyası ilə əlaqəsi yoxdur (T9)
 * · `visibility` — post-dan kopyalanır (törəmə qeyd mənbədən açıq olmur)
 */
export function buildAchievement(
  postId: string,
  cohortId: string,
  ownerId: string,
  source: PostFanoutSource,
  details: AchievementFanoutInput,
  ceiling?: VisibilityType,
): AchievementFanout {
  return {
    ownerId,
    cohortId,
    postId,
    category: details.category,
    title: clamp(details.title, 200),
    description: source.body?.trim() ? clamp(source.body, TIMELINE_SUMMARY_MAX) : null,
    organization: details.organization,
    proofUrl: details.proofUrl,
    awardedAt: details.awardedAt,
    status: AchievementStatus.SUBMITTED,
    visibility: derivedVisibility(source.visibility, ceiling),
  };
}

// ---------------------------------------------------------------------------
// Achievement → TimelineEntry (Blok 8 — moderasiya təsdiqindən sonra)
// ---------------------------------------------------------------------------

/**
 * Nailiyyət təsdiqləndikdə xronologiyaya düşən qeydin kateqoriyası —
 * nailiyyət POST-dan gəlməyibsə.
 *
 * ⚠️ `AchievementCategory` (AWARD, STARTUP, PATENT…) və `PostCategory`
 * (FIRST_DAY, EXAM_PERIOD…) TAMAMİLƏ AYRI siyahılardır (bax `catalog.ts`
 * başlığı), yəni nailiyyət kateqoriyasını `TimelineEntry.category`-yə birbaşa
 * yazmaq olmaz — xronologiya filtri 12 `PostCategory` üzərində qurulub və
 * "STARTUP" heç bir filtrə düşməzdi. Post varsa onun kateqoriyası götürülür,
 * yoxdursa bu sabit.
 */
export const ACHIEVEMENT_TIMELINE_CATEGORY = PostCategory.ACADEMIC_ACHIEVEMENT;

/** Təsdiqlənmiş nailiyyətin yayılmada işlədilən sahələri. */
export interface AchievementTimelineSource {
  achievementId: string;
  cohortId: string;
  title: string;
  description: string | null;
  organization: string | null;
  awardedAt: Date;
  /** ⚠️ Nailiyyətin ÖZ səviyyəsi — qeyd ondan daha açıq ola bilməz. */
  visibility: VisibilityType;
  /** Nailiyyət lent paylaşımından gəlibsə həmin postun kateqoriyası. */
  postCategory?: PostCategory | null;
}

/** `prisma.timelineEntry.upsert({ create })` üçün hazır obyekt. */
export interface AchievementTimelineFanout {
  cohortId: string;
  sourceType: string;
  achievementId: string;
  title: string;
  summary: string | null;
  category: string;
  occurredAt: Date;
  academicYear: string;
  visibility: string;
}

/**
 * Təsdiqlənmiş (`VERIFIED` / `FEATURED`) nailiyyətdən TimelineEntry sahələri.
 *
 * · `occurredAt` — `awardedAt` (təsdiq tarixi DEYİL: xronologiya hadisənin
 *   BAŞ VERDİYİ vaxta görə düzülür, moderatorun növbəyə baxdığı günə görə yox)
 * · `academicYear` — `awardedAt`-dan hesablanır (sentyabr 1 – avqust 31)
 * · `visibility` — nailiyyətdən KOPYALANIR (`derivedVisibility` yalnız daraldır)
 *
 * ⚠️ TƏLƏ T11: `TimelineEntry.achievementId` `@unique`-dir → servis bu obyekti
 * `create` ilə deyil, `upsert` ilə yazır (nailiyyət iki dəfə təsdiqlənə bilər:
 * VERIFIED → FEATURED).
 */
export function buildAchievementTimelineEntry(
  source: AchievementTimelineSource,
  ceiling?: VisibilityType,
): AchievementTimelineFanout {
  const title = clamp(source.title, TIMELINE_TITLE_MAX);
  const summary = source.description?.trim()
    ? clamp(source.description, TIMELINE_SUMMARY_MAX)
    : source.organization?.trim()
      ? clamp(source.organization, TIMELINE_SUMMARY_MAX)
      : null;

  return {
    cohortId: source.cohortId,
    sourceType: TimelineSourceType.ACHIEVEMENT,
    achievementId: source.achievementId,
    title,
    summary: summary === title ? null : summary,
    category: source.postCategory ?? ACHIEVEMENT_TIMELINE_CATEGORY,
    occurredAt: source.awardedAt,
    academicYear: academicYearOf(source.awardedAt),
    visibility: derivedVisibility(source.visibility, ceiling),
  };
}
