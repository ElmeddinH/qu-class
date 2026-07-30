// ============================================================================
// src/lib/milestones.ts
// Sistem milestone-larının SAF hesablaması (spec §10 — Class Timeline).
//
// 🔴 BU FAYL SAFDIR: Prisma, React, servis — heç biri import edilmir. Səbəb
// `lib/directory-filters.ts` ilə eynidir: tarix hesablaması bazasız testlə
// bərkidilir (`milestones.test.ts`), servis isə yalnız nəticəni yazır.
//
// ----------------------------------------------------------------------------
// MİLESTONE NƏDİR
// ----------------------------------------------------------------------------
// `TimelineEntry.isSystemMilestone = true` olan qeyd. Onun `postId`,
// `achievementId`, `eventId` — üçü də `null`-dır: mənbəyi YOXDUR, cohort-un
// TARİXLƏRİNDƏN törəyir. Dörd növ:
//
//   açar          nə vaxt                                  başlıq
//   ────────────  ───────────────────────────────────────  ─────────────────────
//   admission     academicStartsAt − 60 gün                Qəbul nəticələri…
//   start         academicStartsAt                         Dərslər başladı
//   year-<YYYY>   sentyabr 1 (start ↔ graduatesAt arası)   <il> tədris ili başladı
//   graduation    graduatesAt                              Məzuniyyət
//
// ----------------------------------------------------------------------------
// 🔴 ÜÇ QAYDA — pozulsa səssiz səhv olur
// ----------------------------------------------------------------------------
// 1. GÖRÜNÜRLÜK `UNIVERSITY` (TƏLƏ B). `timelineVisibilityWhere` sahib şaxəsini
//    MƏNBƏ əlaqələrindən qurur (post / achievement / event). Milestone-un üçü də
//    `null` olduğu üçün heç bir sahib şaxəsinə uyğun gəlmir → yalnız səviyyə
//    şaxəsi işləyir. `PRIVATE` milestone HEÇ KİMƏ görünməzdi, hətta yaradana da.
//
// 2. ID DETERMİNİSTİKDİR (`mil-<cohortId>-<açar>`). Səhifə hər açılışda
//    `ensureCohortMilestones` çağırır; `create` işlətsək hər ziyarət yeni sətir
//    yaradardı. Deterministik id + `upsert` = idempotentlik.
//
// 3. GƏLƏCƏK TARİXLİ MİLESTONE YARADILMIR. Xronologiya baş VERMİŞ hadisələrin
//    siyahısıdır: 2030-da məzun olacaq sinfin səhifəsində «Məzuniyyət» qeydi
//    görünsəydi, istifadəçi onu olmuş hadisə sayardı.
// ============================================================================

import { PostCategory, TimelineSourceType, Visibility } from "@/lib/enums";
import { academicYearOf } from "@/lib/stage";

/** Qəbul nəticələri dərslərdən neçə gün əvvəl elan olunur (spec §10). */
export const ADMISSION_ANNOUNCE_DAYS_BEFORE = 60;

/** Akademik ilin başlanğıc ayı — 0-əsaslı (sentyabr). `lib/stage.ts` ilə eyni. */
const SEPTEMBER = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `buildCohortMilestones` üçün lazım olan minimal cohort forması. */
export interface MilestoneCohort {
  id: string;
  admissionYear: number;
  academicStartsAt: Date;
  graduatesAt: Date;
}

/**
 * `prisma.timelineEntry.upsert({ create })` üçün hazır obyekt.
 * Sahələr sxemdəki adlarla birə-bir uyğundur — servis onları çevirmir.
 */
export interface CohortMilestone {
  id: string;
  cohortId: string;
  sourceType: string;
  title: string;
  summary: string;
  category: string;
  occurredAt: Date;
  academicYear: string;
  visibility: string;
  isSystemMilestone: true;
}

/**
 * Deterministik id.
 *
 * ⚠️ Prefiks (`mil-`) seed-in `tml-` prefiksindən FƏRQLİDİR: milestone-lar
 * artıq bu moduldan törəyir, yəni iki mənbədən eyni sətir yaranmır.
 */
export function milestoneId(cohortId: string, key: string): string {
  return `mil-${cohortId}-${key}`;
}

/**
 * Sentyabrın 1-i — YERLİ komponentlərlə qurulur.
 *
 * ⚠️ `Date.UTC(year, 8, 1)` işlətmirik: UTC-dən geri qalan qurşaqda o an yerli
 * 31 avqusta düşür və `academicYearOf` (yerli komponentlərlə işləyir) bir il
 * geri sürüşərdi — milestone yanlış tədris ili bölməsində görünərdi.
 * Saat 12 seçilib ki, yay/qış saatı keçidi günü dəyişməsin.
 */
function septemberFirst(year: number): Date {
  return new Date(year, SEPTEMBER, 1, 12, 0, 0, 0);
}

function entry(
  cohort: MilestoneCohort,
  key: string,
  occurredAt: Date,
  title: string,
  summary: string,
  category: string,
): CohortMilestone {
  return {
    id: milestoneId(cohort.id, key),
    cohortId: cohort.id,
    sourceType: TimelineSourceType.SYSTEM,
    title,
    summary,
    category,
    occurredAt,
    academicYear: academicYearOf(occurredAt),
    // TƏLƏ B — `PRIVATE` və ya `CLASS` deyil: milestone universitet miqyaslı
    // struktur hadisəsidir və sahibi yoxdur.
    visibility: Visibility.UNIVERSITY,
    isSystemMilestone: true,
  };
}

/**
 * Cohort tarixlərindən törəyən milestone-lar — BAŞ VERMİŞ olanlar.
 *
 * Nəticə `occurredAt` üzrə artan sırada gəlir və eyni cohort + eyni `now` üçün
 * həmişə eynidir (id-lər də daxil olmaqla).
 *
 * @param now sərhəd anı; testdə sabit tarix ötürülür.
 */
export function buildCohortMilestones(
  cohort: MilestoneCohort,
  now: Date = new Date(),
): CohortMilestone[] {
  const milestones: CohortMilestone[] = [];

  milestones.push(
    entry(
      cohort,
      "admission",
      new Date(cohort.academicStartsAt.getTime() - ADMISSION_ANNOUNCE_DAYS_BEFORE * DAY_MS),
      "Qəbul nəticələri elan olundu",
      `${cohort.admissionYear} qəbulu üzrə siyahılar açıqlandı və sinif səhifəsi yaradıldı.`,
      PostCategory.ORIENTATION,
    ),
  );

  milestones.push(
    entry(
      cohort,
      "start",
      cohort.academicStartsAt,
      "Dərslər başladı",
      "İlk dərs günü — sinif rəsmi olaraq tələbə mərhələsinə keçdi.",
      PostCategory.FIRST_DAY,
    ),
  );

  // Hər tədris ilinin başlanğıcı. Birinci sentyabr `academicStartsAt`-dan
  // ƏVVƏLDİRSƏ buraxılır — «Dərslər başladı» onsuz da həmin ili işarələyir.
  for (
    let year = cohort.academicStartsAt.getFullYear();
    year <= cohort.graduatesAt.getFullYear();
    year += 1
  ) {
    const start = septemberFirst(year);
    if (start <= cohort.academicStartsAt || start >= cohort.graduatesAt) continue;

    const academicYear = academicYearOf(start);
    milestones.push(
      entry(
        cohort,
        `year-${year}`,
        start,
        `${academicYear} tədris ili başladı`,
        "Yeni tədris ili — sinif növbəti kursa keçdi.",
        PostCategory.FIRST_DAY,
      ),
    );
  }

  milestones.push(
    entry(
      cohort,
      "graduation",
      cohort.graduatesAt,
      "Məzuniyyət",
      "Sinif məzun mərhələsinə keçdi. Class Page bağlanmır — məzmun dəyişir.",
      PostCategory.GENERAL,
    ),
  );

  // Qayda 3 — gələcək hadisə xronologiyada olmur.
  return milestones
    .filter((milestone) => milestone.occurredAt <= now)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}
