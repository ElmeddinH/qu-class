// ============================================================================
// src/services/stats.service.ts
// "İndi haradayıq?" (Where Are We Now) aqreqasiyası — spec §13.
//
// Bu qat ÜÇ QAT qorunur və üçü də məcburidir:
//
//   1. GÖRÜNÜRLÜK — `visibilityWhereForUserOwned(viewer)`.
//      `CareerEntry` / `EducationEntry`-də `cohortId` sütunu YOXDUR, ona görə
//      adi `visibilityWhere` DEYİL, `userId`-li variant işlədilir
//      (bax `src/lib/visibility.ts` başındakı cədvəl, B ailəsi).
//
//   2. AQREQASİYA RAZILIĞI — `statsConsentWhere` (`includeInStats: true`).
//      ⚠️ Görünürlük səviyyəsi KİFAYƏT DEYİL. İstifadəçi karyerasını sinfə
//      göstərməyə razı ola, statistikaya qoşulmağa isə razı olmaya bilər.
//      İki razılıq MÜSTƏQİLDİR və hər ikisi tələb olunur.
//
//   3. K-ANONİMLİK — `MIN_BUCKET_SIZE` (= 3). 3 nəfərdən kiçik xana ("Tokioda
//      1 məzun") faktiki olaraq konkret şəxsi göstərir.
//
//      ⚠️ BLOK 10B DƏYİŞİKLİYİ: k-anonimlik artıq burada, xana-xana
//      `suppressSmallBuckets()` ilə tətbiq OLUNMUR. Səbəb — 🔴 TƏLƏ A: hər
//      xananı ÖZ `groupBy` sorğusundan qurmaq xanaları FƏRQLİ sətir çoxluqları
//      üzərində hesablayır və oxucu onları çıxıb qalıq (deməli fərd) tapa bilir.
//      Bütün məntiq TƏK saf funksiyaya köçdü: `lib/career-stats.ts` →
//      `aggregateCareerStats` (TƏK dataset, TƏK keçid, hər xana bütün sətirləri
//      örtür). Bu fayl yalnız xam sətirləri gətirir.
//
//      `suppressSmallBuckets()` / `MIN_BUCKET_SIZE` yenə `lib/visibility.ts`-in
//      vahid həqiqət mənbəyidir və başqa səthlərdə (Blok 10A başlıq zolağı)
//      işlədilir — silinməyib.
//
// Üstəlik `coarsenLocation()` proyeksiya qapısıdır: çıxışa YALNIZ şəhər/ölkə
// buraxılır — dəqiq ünvan və koordinat heç vaxt.
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  aggregateCareerStats,
  pickHighestDegree,
  type CareerStatsRow,
  type WhereAreWeNow,
} from "@/lib/career-stats";
import { prisma } from "@/lib/db";
import { AchievementStatus } from "@/lib/enums";
import { isHeadlineStatsVisible } from "@/lib/headline-stats";
import {
  coarsenLocation,
  fieldVisibleWhere,
  statsConsentWhere,
  visibilityWhereForUserOwned,
  visibleWithStatus,
  type ControlledField,
  type Viewer,
} from "@/lib/visibility";

/**
 * Transaksiya klienti — `prisma.$transaction(async (tx) => …)` içindəki obyekt.
 *
 * Aqreqasiya köməkçiləri `prisma`-nı BİRBAŞA tutmur, klienti arqument kimi
 * alır: yalnız belə olanda hər üç oxunuş EYNİ snapshot-a düşür (TƏLƏ T43).
 */
type StatsClient = Prisma.TransactionClient | PrismaClient;

export interface StatsFilters {
  /** Yalnız bu sinfin üzvləri. Verilməzsə bütün universitet. */
  cohortId?: string;
}

export interface StatsBucket {
  key: string;
  count: number;
}

export interface LocationBucket {
  city: string | null;
  country: string | null;
  count: number;
}

export interface SuppressedBuckets<T> {
  visible: T[];
  /** Gizlədilmiş kiçik xanaların cəmi — "Digər" sütunu. */
  otherCount: number;
}

export interface WhereAreWeNowStats {
  /** Statistikaya razılıq vermiş və viewer-ə görünən İSTİFADƏÇİ sayı. */
  respondentCount: number;
  countries: SuppressedBuckets<StatsBucket>;
  industries: SuppressedBuckets<StatsBucket>;
  /** `CareerEntry.jobFunction` — Blok 7B. `industries` ilə EYNİ üç qatdan keçir. */
  jobFunctions: SuppressedBuckets<StatsBucket>;
  degrees: SuppressedBuckets<StatsBucket>;
  locations: SuppressedBuckets<LocationBucket>;
}

/**
 * Karyera qeydləri üçün ümumi şərt.
 *
 * `isCurrent: true` — sual "indi haradayıq", keçmiş iş yerləri deyil. Eyni
 * zamanda bu, bir nəfərin 3 iş qeydi ilə statistikanı əyməsinin qarşısını alır
 * (adam başına ən çoxu bir cari qeyd).
 */
function currentCareerWhere(
  viewer: Viewer,
  filters: StatsFilters,
): Prisma.CareerEntryWhereInput {
  return {
    AND: [
      statsConsentWhere,
      visibilityWhereForUserOwned<Prisma.CareerEntryWhereInput>(viewer),
      { isCurrent: true },
      ...(filters.cohortId
        ? [{ user: { memberships: { some: { cohortId: filters.cohortId } } } }]
        : []),
    ],
  };
}

function educationWhere(
  viewer: Viewer,
  filters: StatsFilters,
): Prisma.EducationEntryWhereInput {
  return {
    AND: [
      statsConsentWhere,
      visibilityWhereForUserOwned<Prisma.EducationEntryWhereInput>(viewer),
      ...(filters.cohortId
        ? [{ user: { memberships: { some: { cohortId: filters.cohortId } } } }]
        : []),
    ],
  };
}

// ===========================================================================
// TƏK DATASET — Blok 10B (🔴 TƏLƏ A)
//
// Aqreqasiya artıq BEŞ ayrı `groupBy` sorğusundan YIĞILMIR. Səbəb `lib/
// career-stats.ts` başlığında ətraflı yazılıb, qısası: hər sorğunun `where`-i
// fərqli idi (`{ industry: { not: null } }`, `{ country: { not: null } }`…),
// yəni hər xana FƏRQLİ sətir çoxluğu üzərində hesablanırdı. Xanaların cəmləri
// uyğun gəlmədiyi üçün oxucu onları çıxıb qalıq (deməli fərd) tapa bilirdi.
//
// İndi servis YALNIZ xam sətirləri gətirir və `aggregateCareerStats`-ı çağırır.
// Aqreqasiya məntiqi burada TƏKRAR YAZILMIR.
//
// ⚠️ SORĞU `latitude` / `longitude` SEÇMİR (TƏLƏ B) — sxemdə belə sütun yoxdur
// və əlavə edilməməlidir. Koordinat `lib/geo.ts`-dəki STATİK cədvəldəndir.
// ⚠️ SORĞU MAAŞ SAHƏSİ SEÇMİR (TƏLƏ D) — sxemdə belə sütun QƏSDƏN yoxdur.
// ===========================================================================

/**
 * Bir nəfər = bir sətir.
 *
 * `CareerEntry.isCurrent` təkliyi Blok 7-də təmin edilib (yeni cari qeyd
 * köhnəsini keçmişə keçirir), ona görə cari qeydlər onsuz da nəfər başına
 * birdir — bu qorumaya GÜVƏNİLİR, təkrar yoxlama yazılmır. `EducationEntry`
 * isə çoxdur: `pickHighestDegree` nəfər başına BİRİNİ seçir, əks halda üç
 * diplomlu adam üç dəfə sayılıb cəm invariantını sındırardı.
 */
async function fetchCareerStatsRows(
  client: StatsClient,
  viewer: Viewer,
  filters: StatsFilters,
): Promise<CareerStatsRow[]> {
  // ⚠️ ARDICIL, `Promise.all` DEYİL (TƏLƏ T43): interaktiv transaksiyada
  // paralel sorğular eyni bağlantını paylaşmır və snapshot zəmanəti itir.
  const careerRows = await client.careerEntry.findMany({
    where: currentCareerWhere(viewer, filters),
    select: {
      userId: true,
      city: true,
      country: true,
      company: true,
      industry: true,
      jobFunction: true,
    },
    // Deterministik sıra: eyni məlumat üçün eyni çıxış (test müqayisələri).
    orderBy: { id: "asc" },
  });

  const educationRows = await client.educationEntry.findMany({
    where: educationWhere(viewer, filters),
    select: { userId: true, degree: true },
    orderBy: { id: "asc" },
  });

  const degreesByUser = new Map<string, string[]>();
  for (const row of educationRows) {
    const list = degreesByUser.get(row.userId);
    if (list) list.push(row.degree);
    else degreesByUser.set(row.userId, [row.degree]);
  }

  return careerRows.map((row) => ({
    userId: row.userId,
    city: row.city,
    country: row.country,
    company: row.company,
    industry: row.industry,
    jobFunction: row.jobFunction,
    degree: pickHighestDegree(degreesByUser.get(row.userId) ?? []),
  }));
}

/**
 * Razılıq vermiş və viewer-ə GÖRÜNƏN üzv sayı.
 *
 * `respondentCount`-dan böyük ola bilər: yalnız təhsil qeydinə razılıq verən,
 * cari iş qeydi olmayan üzv panelə düşmür (sual "indi haradasan?"-dır), amma
 * razılıq şəffaflığı zolağında sayılmalıdır — əks halda "8 nəfərdən 6-sı"
 * cümləsi yerinə "6 nəfərdən 6-sı" yazıb razılıq verib də sayılmayanları
 * gizlətmiş olardıq.
 *
 * ⚠️ Say VIEWER GÖRÜNÜRLÜYÜNDƏN keçir. Görünürlükdən kənar razılıqları saysaydıq
 * viewer "2 nəfər daha razılıq verib, amma qeydini görə bilmirsən" məlumatını
 * alardı — bu, gizli sətrin MÖVCUDLUĞUNU sızdırır.
 */
async function countConsentedMembers(
  client: StatsClient,
  viewer: Viewer,
  filters: StatsFilters,
): Promise<number> {
  // ⚠️ ARDICIL (TƏLƏ T43) — bax `fetchCareerStatsRows`-dakı qeyd.
  const career = await client.careerEntry.groupBy({
    by: ["userId"],
    where: {
      AND: [
        statsConsentWhere,
        visibilityWhereForUserOwned<Prisma.CareerEntryWhereInput>(viewer),
        ...(filters.cohortId
          ? [{ user: { memberships: { some: { cohortId: filters.cohortId } } } }]
          : []),
      ],
    },
  });

  const education = await client.educationEntry.groupBy({
    by: ["userId"],
    where: educationWhere(viewer, filters),
  });

  return new Set([...career, ...education].map((row) => row.userId)).size;
}

export interface CareerOutcomeFilters extends StatsFilters {
  /** Baxanın öz `userId`-si — «sənin məlumatın iştirak edir/etmir» sətri üçün. */
  viewerId?: string;
}

/**
 * "İndi haradayıq?" panelinin TAM nəticəsi — 8 xana + şəffaflıq sayğacları.
 *
 * Səhifə (`/class/[slug]/map`) və v1 endpoint-i MƏHZ bunu çağırır.
 */
export async function getCareerOutcomeStats(
  viewer: Viewer,
  filters: CareerOutcomeFilters = {},
): Promise<WhereAreWeNow> {
  // 🔴 TƏLƏ T43 — ÜÇ OXUNUŞ DA EYNİ SNAPSHOT-DAN.
  //
  // Əvvəl bunlar `Promise.all` ilə üç MÜSTƏQİL sorğu kimi gedirdi. Aralarında
  // bir istifadəçi `includeInStats`-ı söndürsəydi, `respondentCount` (sətirlərdən)
  // ilə `totalConsented` (ayrı sayğacdan) uyğunsuz cütlük verərdi — «6 nəfərdən
  // 7-si razılıq verib». Bu, ölçülə bilən siqnaldır: iki yükləmə arasında
  // razılığını geri götürən KONKRET şəxsin mövcudluğu şəffaflıq zolağından
  // oxunur. Layihənin qaydası (`admin-users.service.ts` → rol dəyişikliyi)
  // sayımı TRANSAKSİYA İÇİNDƏ tələb edir; burada da eynidir.
  const { rows, totalConsented, memberCount } = await prisma.$transaction(
    async (tx) => ({
      rows: await fetchCareerStatsRows(tx, viewer, filters),
      totalConsented: await countConsentedMembers(tx, viewer, filters),
      memberCount:
        filters.cohortId === undefined
          ? undefined
          : await tx.cohortMembership.count({ where: { cohortId: filters.cohortId } }),
    }),
  );

  return aggregateCareerStats(rows, {
    totalConsented,
    memberCount,
    viewerId: filters.viewerId,
  });
}

/**
 * Xəritə üçün KOBUDLAŞDIRILMIŞ məkanlar.
 *
 * ⚠️ Blok 10B-də ARTIQ ayrı sorğu DEYİL — `getCareerOutcomeStats`-ın şəhər
 * xanasından törəyir (TƏK dataset qaydası). `coarsenLocation()` yenə sətir-sətir
 * tətbiq olunur: bu, proyeksiya qapısıdır — sxemə gələcəkdə `address` və ya
 * koordinat sahəsi əlavə edilsə də çıxışa yalnız şəhər/ölkə buraxılacaq.
 */
export async function listCoarseLocations(
  viewer: Viewer,
  filters: StatsFilters = {},
): Promise<SuppressedBuckets<LocationBucket>> {
  const stats = await getCareerOutcomeStats(viewer, filters);
  return toLocationBuckets(stats);
}

function toLocationBuckets(stats: WhereAreWeNow): SuppressedBuckets<LocationBucket> {
  return {
    visible: stats.cities.visible.map((bucket) => ({
      ...coarsenLocation({ city: bucket.city, country: bucket.country }),
      count: bucket.count,
    })),
    otherCount: stats.cities.undisclosedCount,
  };
}

/**
 * "İndi haradayıq?" xülasəsi — Blok 5 widget-inin işlətdiyi FORMA.
 *
 * ⚠️ İMZA VƏ ÇIXIŞ FORMASI DƏYİŞMƏYİB (`features/class-home/widgets/
 * WhereAreWeNowSummary.tsx` və mövcud inteqrasiya testləri bunu gözləyir), amma
 * DAXİLİ tamamilə dəyişdi: rəqəmlər indi TƏK aqreqasiyadan gəlir, beş ayrı
 * `groupBy`-dan yox.
 *
 * ⚠️ `otherCount` = "dəyəri var, amma açıqlanmır". Bu, əvvəlki davranışla
 * uyğundur: `Σ visible + otherCount` = həmin ölçü üzrə DƏYƏRİ OLAN sətirlərin
 * sayı (dəyəri olmayanlar `unknownCount`-dadır və heç vaxt "Digər"ə düşməmişdi).
 *
 * ⚠️ `degrees` xanası artıq SƏTİR yox, NƏFƏR sayır (bir nəfərin üç diplomu bir
 * dəfə sayılır) — köhnə davranış cəmi şişirdirdi.
 *
 * ⚠️ Yeni səthlər üçün `getCareerOutcomeStats` işlədilir; bu funksiya köhnə
 * çağıranların müqaviləsidir.
 */
export async function getWhereAreWeNowStats(
  viewer: Viewer,
  filters: StatsFilters = {},
): Promise<WhereAreWeNowStats> {
  const stats = await getCareerOutcomeStats(viewer, filters);

  const toLegacy = (cell: {
    visible: Array<{ key: string; count: number }>;
    undisclosedCount: number;
  }): SuppressedBuckets<StatsBucket> => ({
    visible: cell.visible.map((bucket) => ({ key: bucket.key, count: bucket.count })),
    otherCount: cell.undisclosedCount,
  });

  return {
    respondentCount: stats.respondentCount,
    countries: toLegacy(stats.countries),
    industries: toLegacy(stats.industries),
    jobFunctions: toLegacy(stats.jobFunctions),
    degrees: toLegacy(stats.educationLevels),
    locations: toLocationBuckets(stats),
  };
}

// ===========================================================================
// Class Page başlıq zolağı (Blok 10A)
//
// ⚠️ YENİ FUNKSİYADIR — yuxarıdaki `getWhereAreWeNowStats` və köməkçiləri
// DƏYİŞDİRİLMƏYİB. Zolaq başqa suala cavab verir: "İndi haradayıq?" məzunların
// KARYERA aqreqasiyasıdır (razılıq + k-anonimlik), bu isə sinfin ÖZ ölçüsüdür.
// ===========================================================================

export interface CohortHeadlineStats {
  memberCount: number;
  /** Fərqli şəhər sayı — SİYAHI YOX, yalnız say. */
  cityCount: number;
  countryCount: number;
  clubCount: number;
  /** Yalnız `VERIFIED` + `FEATURED` (aşağıdaki izaha bax). */
  achievementCount: number;
}

/**
 * Sinif başlığındaki rəqəm zolağı: N üzv · X şəhərdən · Y ölkədən · Z klubda ·
 * W nailiyyət.
 *
 * 🔴 DÖRD QAYDA (hər biri ayrıca sızma qapısıdır):
 *
 * 1. YALNIZ SAYLAR. Ad, şəhər və ya klub SİYAHISI qaytarılmır — siyahı
 *    aqreqasiyanı fərdi məlumata çevirir (kim harada?). Siyahı səthi Blok 10B-nin
 *    («İndi haradayıq?» xəritəsi) işidir və orada `suppressSmallBuckets`
 *    tətbiq olunur.
 *
 * 2. SAYILAN SƏTİRLƏR GÖRÜNÜRLÜK ŞƏRTİNDƏN KEÇİR. Şəhər/ölkə sayı
 *    `fieldVisibleWhere(viewer, "currentCity" | "currentCountry")` ilə,
 *    klublar `fieldVisibleWhere(viewer, "clubs")` ilə, nailiyyətlər isə
 *    `visibleWithStatus` ilə süzülür. Gizlədilmiş sahəyə görə SAYMAQ da
 *    sızmadır (T17-nin eyni məntiqi: dəyər görünməsə də "var" faktı çıxır).
 *
 * 3. KİÇİK SİNİFDƏ ZOLAQ TAMAMİLƏ GİZLƏNİR → `null` qaytarılır.
 *    Hədd `lib/headline-stats.ts` → `HEADLINE_MIN_MEMBERS` (= `MIN_BUCKET_SIZE`,
 *    yeni sabit yaradılmayıb). 2 nəfərlik sinifdə "1 ölkədən" cümləsi konkret
 *    adamın harada olduğunu deyir.
 *
 * 4. NAİLİYYƏT SAYI YALNIZ `VERIFIED` + `FEATURED`. `SUBMITTED` sayılsaydı
 *    moderasiyada olan (hələ təsdiqlənməmiş) nailiyyətin MÖVCUDLUĞU açıqlanardı
 *    — Blok 8-in moderasiya axını məhz bunu gizlədir.
 */
export async function getCohortHeadlineStats(
  viewer: Viewer,
  cohortId: string,
): Promise<CohortHeadlineStats | null> {
  const memberCount = await prisma.cohortMembership.count({ where: { cohortId } });

  // Qayda 3 — kiçik sinif: heç bir sorğu da getmir.
  if (!isHeadlineStatsVisible(memberCount)) return null;

  const memberWhere = (field: ControlledField): Prisma.UserWhereInput => ({
    AND: [
      { memberships: { some: { cohortId } } },
      fieldVisibleWhere<Prisma.UserWhereInput>(viewer, field),
    ],
  });

  const [cities, countries, clubs, achievementCount] = await Promise.all([
    prisma.user.groupBy({
      by: ["currentCity"],
      where: { AND: [memberWhere("currentCity"), { currentCity: { not: null } }] },
    }),

    prisma.user.groupBy({
      by: ["currentCountry"],
      where: { AND: [memberWhere("currentCountry"), { currentCountry: { not: null } }] },
    }),

    // Fərqli KLUB sayı — üzvlük sətri yox, klub. `clubs` sahəsi gizlədilmiş
    // istifadəçinin üzvlüyü sayılmır (qayda 2).
    prisma.clubMembership.groupBy({
      by: ["clubId"],
      where: { user: memberWhere("clubs") },
    }),

    // Qayda 4 — `SUBMITTED` və `ARCHIVED` sayılmır.
    prisma.achievement.count({
      where: {
        AND: [
          { cohortId },
          visibleWithStatus<Prisma.AchievementWhereInput>(
            viewer,
            [AchievementStatus.VERIFIED, AchievementStatus.FEATURED],
            "ownerId",
          ),
        ],
      },
    }),
  ]);

  return {
    memberCount,
    cityCount: cities.filter((row) => (row.currentCity ?? "").trim() !== "").length,
    countryCount: countries.filter((row) => (row.currentCountry ?? "").trim() !== "")
      .length,
    clubCount: clubs.length,
    achievementCount,
  };
}
