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
//   3. K-ANONİMLİK — `suppressSmallBuckets()`. 3 nəfərdən kiçik xana ("Tokioda
//      1 məzun") faktiki olaraq konkret şəxsi göstərir; belə xanalar "Digər"ə
//      yığılır.
//
// Üstəlik `coarsenLocation()` proyeksiya qapısıdır: çıxışa YALNIZ şəhər/ölkə
// buraxılır — dəqiq ünvan və koordinat heç vaxt.
// ============================================================================

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  coarsenLocation,
  statsConsentWhere,
  suppressSmallBuckets,
  visibilityWhereForUserOwned,
  type Viewer,
} from "@/lib/visibility";

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

/**
 * Xəritə üçün KOBUDLAŞDIRILMIŞ məkanlar.
 *
 * `coarsenLocation()` burada qəsdən sətir-sətir tətbiq olunur: sorğuya
 * gələcəkdə `address` və ya koordinat sahəsi əlavə edilsə belə, çıxışa yalnız
 * şəhər/ölkə buraxılacaq. Nəticə həm də `suppressSmallBuckets`-dən keçir —
 * tək nəfərlik şəhər xanası xəritədə həmin şəxsi göstərmiş olardı.
 */
export async function listCoarseLocations(
  viewer: Viewer,
  filters: StatsFilters = {},
): Promise<SuppressedBuckets<LocationBucket>> {
  const rows = await prisma.careerEntry.groupBy({
    by: ["country", "city"],
    where: { AND: [currentCareerWhere(viewer, filters), { country: { not: null } }] },
    _count: { _all: true },
  });

  return suppressSmallBuckets(
    rows.map((row) => ({
      ...coarsenLocation({ city: row.city, country: row.country }),
      count: row._count._all,
    })),
  );
}

/**
 * `groupBy` nəticəsini k-anonimlikdən keçmiş xanalara çevirir.
 * Boş/`null` açarlı sətirlər atılır — "naməlum ölkə" məlumat daşımır.
 */
function toBuckets<T extends { _count: { _all: number } }>(
  rows: T[],
  keyOf: (row: T) => string | null,
): SuppressedBuckets<StatsBucket> {
  return suppressSmallBuckets(
    rows
      .map((row) => ({ key: keyOf(row), count: row._count._all }))
      .filter((bucket): bucket is StatsBucket => Boolean(bucket.key)),
  );
}

/** "İndi haradayıq?" panelinin bütün xanaları — tək çağırışda. */
export async function getWhereAreWeNowStats(
  viewer: Viewer,
  filters: StatsFilters = {},
): Promise<WhereAreWeNowStats> {
  const careerWhere = currentCareerWhere(viewer, filters);

  const [respondents, byCountry, byIndustry, byJobFunction, byDegree, locations] =
    await Promise.all([
      // Sətir yox, İSTİFADƏÇİ sayı — bir nəfər iki qeydlə iki dəfə sayılmasın.
      prisma.careerEntry.groupBy({ by: ["userId"], where: careerWhere }),

      prisma.careerEntry.groupBy({
        by: ["country"],
        where: { AND: [careerWhere, { country: { not: null } }] },
        _count: { _all: true },
      }),

      prisma.careerEntry.groupBy({
        by: ["industry"],
        where: { AND: [careerWhere, { industry: { not: null } }] },
        _count: { _all: true },
      }),

      // `jobFunction` — `industry` ilə EYNİ nümunə: üç qat (görünürlük +
      // includeInStats + k-anonimlik) `careerWhere`-dən, `toBuckets`-dən keçir.
      prisma.careerEntry.groupBy({
        by: ["jobFunction"],
        where: { AND: [careerWhere, { jobFunction: { not: null } }] },
        _count: { _all: true },
      }),

      prisma.educationEntry.groupBy({
        by: ["degree"],
        where: educationWhere(viewer, filters),
        _count: { _all: true },
      }),

      listCoarseLocations(viewer, filters),
    ]);

  return {
    respondentCount: respondents.length,
    countries: toBuckets(byCountry, (row) => row.country),
    industries: toBuckets(byIndustry, (row) => row.industry),
    jobFunctions: toBuckets(byJobFunction, (row) => row.jobFunction),
    degrees: toBuckets(byDegree, (row) => row.degree),
    locations,
  };
}
