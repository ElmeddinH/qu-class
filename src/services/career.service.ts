// ============================================================================
// src/services/career.service.ts
// `/me/career` — karyera, təhsil və dəstək təkliflərinin İDARƏSİ (yazı tərəfi).
//
// OXU tərəfi başqa yerlərdədir və qəsdən ayrıdır:
//   · profil hekayəsi → `user.service.buildProfileView()` (sətir görünürlüyü
//     `visibilityWhereForUserOwned` ilə DB-də tətbiq olunur)
//   · "İndi haradayıq?" → `stats.service` (görünürlük + `includeInStats` +
//     k-anonimlik, üç qat)
// Bu fayl YALNIZ SAHİBİN öz qeydlərini oxuyur və yazır.
//
// ----------------------------------------------------------------------------
// 🔴 ÜÇ MÜSTƏQİL RAZILIQ — QARIŞDIRILMAMALIDIR
// ----------------------------------------------------------------------------
//   1. `visibility`      — "kim GÖRƏ bilər" (PUBLIC / UNIVERSITY / CLASS / PRIVATE)
//   2. `includeInStats`  — "aqreqasiyaya (İndi haradayıq?) DAXİL olsun"
//   3. `openToSupport`   — "dəstək təkliflərim GÖSTƏRİLSİN" (User sütunu)
//
// (1) və (2) ayrı sütunlardır: karyerasını sinfə göstərməyə razı olan adam
// xəritədə xanaya düşməyə razı olmaya bilər (spec §13). `stats.service` hər
// ikisini TƏLƏB edir. (3) isə tamam ayrı qapıdır: `listSupportOffers`
// `openToSupport: false` olan istifadəçinin təkliflərini QAYTARMIR — yəni 7
// təklif seçib bayrağı açmayan adam heç yerdə görünmür.
//
// ----------------------------------------------------------------------------
// ⚠️ SAHİBLİK YOXLAMASI — `where` ŞƏRTİNDƏ, əvvəlcədən OXUMAQLA yox
// ----------------------------------------------------------------------------
// `CareerEntry` / `EducationEntry`-də `cohortId` sütunu yoxdur (bax
// `lib/visibility.ts` başlığı, B ailəsi), sahiblik `userId`-dədir. Redaktə və
// silmə `updateMany` / `deleteMany` ilə edilir və şərtə HƏMİŞƏ
// `userId: viewer.userId` daxil edilir. Nəticədə:
//   · başqasının sətrini redaktə etmək MÜMKÜN DEYİL (şərt uyğun gəlmir),
//   · "əvvəlcə oxu, sonra yaz" yarışı (TOCTOU) yaranmır — yoxlama ilə yazı
//     eyni SQL ifadəsindədir.
// `count === 0` → `NOT_FOUND`: "sənin deyil" ilə "yoxdur" fərqi AÇILMIR
// (mövcudluq özü də məlumatdır).
// ============================================================================

import { prisma } from "@/lib/db";
import {
  DegreeSchema,
  IndustrySchema,
  SupportOfferTypeSchema,
  VisibilitySchema,
  type Visibility,
} from "@/lib/enums";
import type { Viewer } from "@/lib/visibility";

// ---------------------------------------------------------------------------
// Nəticə forması
// ---------------------------------------------------------------------------

export type CareerMutationFailure =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "INVALID_INPUT";

export type CareerMutationResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; reason: CareerMutationFailure };

// ---------------------------------------------------------------------------
// Tiplər
// ---------------------------------------------------------------------------

export interface OwnCareerEntry {
  id: string;
  company: string;
  position: string;
  industry: string | null;
  city: string | null;
  country: string | null;
  startDate: Date;
  endDate: Date | null;
  isCurrent: boolean;
  description: string | null;
  /** (1) Kim görə bilər. */
  visibility: string;
  /** (2) Aqreqasiyaya daxil olsun — (1)-dən MÜSTƏQİLDİR. */
  includeInStats: boolean;
}

export interface OwnEducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string | null;
  country: string | null;
  startYear: number;
  endYear: number | null;
  isCurrent: boolean;
  visibility: string;
  includeInStats: boolean;
}

export interface OwnSupportOffer {
  type: string;
  note: string | null;
}

/** `/me/career` səhifəsinin bütün məzmunu — tək çağırışda. */
export interface CareerWorkspace {
  career: OwnCareerEntry[];
  education: OwnEducationEntry[];
  offers: OwnSupportOffer[];
  /** (3) `User.openToSupport` — təkliflərin ümumi açarı. */
  openToSupport: boolean;
}

export interface CareerEntryInput {
  company: string;
  position: string;
  industry: string | null;
  city: string | null;
  country: string | null;
  startDate: Date;
  endDate: Date | null;
  isCurrent: boolean;
  description: string | null;
  visibility: string;
  includeInStats: boolean;
}

export interface EducationEntryInput {
  institution: string;
  degree: string;
  field: string | null;
  country: string | null;
  startYear: number;
  endYear: number | null;
  isCurrent: boolean;
  visibility: string;
  includeInStats: boolean;
}

export interface SupportSettingsInput {
  openToSupport: boolean;
  offers: Array<{ type: string; note: string | null }>;
}

// ---------------------------------------------------------------------------
// Oxu — YALNIZ sahibin öz qeydləri
// ---------------------------------------------------------------------------

/**
 * `/me/career` üçün tam iş sahəsi.
 *
 * ⚠️ `visibilityWhere*` şərti YOXDUR və olmamalıdır: sorğu yalnız
 * `viewer.userId` üçün qurulur, yəni bütün sətirlər onsuz da sahibindir və
 * "sahibi həmişə öz məzmununu görür" qaydası tətbiq olunur. Kənar `userId`
 * arqumenti də yoxdur — başqasının iş sahəsini açmaq mümkün deyil.
 */
export async function getCareerWorkspace(viewer: Viewer): Promise<CareerWorkspace | null> {
  if (viewer.kind !== "USER") return null;

  const user = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: {
      openToSupport: true,
      careerEntries: {
        select: {
          id: true,
          company: true,
          position: true,
          industry: true,
          city: true,
          country: true,
          startDate: true,
          endDate: true,
          isCurrent: true,
          description: true,
          visibility: true,
          includeInStats: true,
        },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      },
      educationEntries: {
        select: {
          id: true,
          institution: true,
          degree: true,
          field: true,
          country: true,
          startYear: true,
          endYear: true,
          isCurrent: true,
          visibility: true,
          includeInStats: true,
        },
        orderBy: [{ startYear: "desc" }],
      },
      supportOffers: {
        select: { type: true, note: true },
        orderBy: { type: "asc" },
      },
    },
  });

  if (!user) return null;

  return {
    career: user.careerEntries,
    education: user.educationEntries,
    offers: user.supportOffers,
    openToSupport: user.openToSupport,
  };
}

// ---------------------------------------------------------------------------
// Enum doğrulaması — servis QATI da yoxlayır
// ---------------------------------------------------------------------------

/**
 * Form sxemi (Zod) onsuz da doğrulayır, amma servis ÖZ girişinə güvənmir:
 * `updateProfile`-dan fərqli olaraq bu funksiyalar gələcəkdə admin panelindən
 * və ya import skriptindən də çağırıla bilər. DB sütunları `String`-dir, yəni
 * doğrulanmamış dəyər səssizcə yazılar və oxu tərəfində "naməlum səviyyə"
 * kimi görünərdi (fail closed → sahə gizlənər).
 */
function parseVisibility(value: string): Visibility | null {
  const parsed = VisibilitySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// ---------------------------------------------------------------------------
// CareerEntry — yaratma / redaktə / silmə
// ---------------------------------------------------------------------------

/**
 * ⚠️ `isCurrent` TƏK ola bilər.
 *
 * Səbəb `stats.service.currentCareerWhere`-dədir: "İndi haradayıq?" xanaları
 * `isCurrent: true` SƏTİRLƏRİNİ sayır. Bir nəfərin iki "cari" işi olsa
 * `respondentCount` (groupBy userId) düzgün qalır, amma ölkə/sənaye xanaları
 * onu İKİ DƏFƏ sayır — yəni adam iki ölkədə "yaşayır" kimi görünür və
 * k-anonimlik hesabı da əyilir.
 *
 * Ona görə yeni/redaktə olunan qeyd `isCurrent = true` gələndə HƏMİN
 * TRANSAKSİYADA istifadəçinin qalan qeydləri `false`-a çevrilir. Bu, səssiz
 * məlumat itkisi deyil: formada açıq xəbərdarlıq var ("bir nəfərin yalnız bir
 * cari işi ola bilər").
 */
async function clearOtherCurrentCareer(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  exceptId: string | null,
): Promise<void> {
  await tx.careerEntry.updateMany({
    where: {
      userId,
      isCurrent: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    data: { isCurrent: false },
  });
}

export async function createCareerEntry(
  viewer: Viewer,
  input: CareerEntryInput,
): Promise<CareerMutationResult<{ id: string }>> {
  if (viewer.kind !== "USER") return { ok: false, reason: "UNAUTHENTICATED" };

  const visibility = parseVisibility(input.visibility);
  if (!visibility) return { ok: false, reason: "INVALID_INPUT" };
  if (input.industry && !IndustrySchema.safeParse(input.industry).success) {
    return { ok: false, reason: "INVALID_INPUT" };
  }

  const userId = viewer.userId;

  const created = await prisma.$transaction(async (tx) => {
    const entry = await tx.careerEntry.create({
      data: {
        userId,
        company: input.company,
        position: input.position,
        industry: input.industry,
        city: input.city,
        country: input.country,
        startDate: input.startDate,
        endDate: input.endDate,
        isCurrent: input.isCurrent,
        description: input.description,
        visibility,
        includeInStats: input.includeInStats,
      },
      select: { id: true },
    });

    if (input.isCurrent) await clearOtherCurrentCareer(tx, userId, entry.id);

    return entry;
  });

  return { ok: true, value: created };
}

export async function updateCareerEntry(
  viewer: Viewer,
  entryId: string,
  input: CareerEntryInput,
): Promise<CareerMutationResult> {
  if (viewer.kind !== "USER") return { ok: false, reason: "UNAUTHENTICATED" };

  const visibility = parseVisibility(input.visibility);
  if (!visibility) return { ok: false, reason: "INVALID_INPUT" };
  if (input.industry && !IndustrySchema.safeParse(input.industry).success) {
    return { ok: false, reason: "INVALID_INPUT" };
  }

  const userId = viewer.userId;

  const changed = await prisma.$transaction(async (tx) => {
    // 🔴 SAHİBLİK: `userId` şərtdədir. Başqasının qeydi üçün `count = 0`.
    const result = await tx.careerEntry.updateMany({
      where: { id: entryId, userId },
      data: {
        company: input.company,
        position: input.position,
        industry: input.industry,
        city: input.city,
        country: input.country,
        startDate: input.startDate,
        endDate: input.endDate,
        isCurrent: input.isCurrent,
        description: input.description,
        visibility,
        includeInStats: input.includeInStats,
      },
    });

    if (result.count === 0) return 0;
    if (input.isCurrent) await clearOtherCurrentCareer(tx, userId, entryId);

    return result.count;
  });

  return changed === 0 ? { ok: false, reason: "NOT_FOUND" } : { ok: true, value: undefined };
}

export async function deleteCareerEntry(
  viewer: Viewer,
  entryId: string,
): Promise<CareerMutationResult> {
  if (viewer.kind !== "USER") return { ok: false, reason: "UNAUTHENTICATED" };

  // Hard delete: karyera qeydi məzmun deyil, faktdır — soft delete lazım
  // gəlmir (`Post` fərqlidir, orada moderasiya izi saxlanılır).
  const result = await prisma.careerEntry.deleteMany({
    where: { id: entryId, userId: viewer.userId },
  });

  return result.count === 0
    ? { ok: false, reason: "NOT_FOUND" }
    : { ok: true, value: undefined };
}

// ---------------------------------------------------------------------------
// EducationEntry
// ---------------------------------------------------------------------------
//
// ⚠️ Burada `isCurrent` üçün TƏKLİK MƏCBURİYYƏTİ YOXDUR — və bu, qəsdəndir:
// bir nəfər eyni vaxtda magistratura və sertifikat proqramında ola bilər.
// `stats.service.educationWhere` isə `isCurrent`-ə GÖRƏ süzmür (dərəcə xanaları
// bütün qeydləri sayır), yəni karyeradakı ikiqat sayma problemi yaranmır.

export async function createEducationEntry(
  viewer: Viewer,
  input: EducationEntryInput,
): Promise<CareerMutationResult<{ id: string }>> {
  if (viewer.kind !== "USER") return { ok: false, reason: "UNAUTHENTICATED" };

  const visibility = parseVisibility(input.visibility);
  if (!visibility) return { ok: false, reason: "INVALID_INPUT" };
  if (!DegreeSchema.safeParse(input.degree).success) {
    return { ok: false, reason: "INVALID_INPUT" };
  }

  const created = await prisma.educationEntry.create({
    data: {
      userId: viewer.userId,
      institution: input.institution,
      degree: input.degree,
      field: input.field,
      country: input.country,
      startYear: input.startYear,
      endYear: input.endYear,
      isCurrent: input.isCurrent,
      visibility,
      includeInStats: input.includeInStats,
    },
    select: { id: true },
  });

  return { ok: true, value: created };
}

export async function updateEducationEntry(
  viewer: Viewer,
  entryId: string,
  input: EducationEntryInput,
): Promise<CareerMutationResult> {
  if (viewer.kind !== "USER") return { ok: false, reason: "UNAUTHENTICATED" };

  const visibility = parseVisibility(input.visibility);
  if (!visibility) return { ok: false, reason: "INVALID_INPUT" };
  if (!DegreeSchema.safeParse(input.degree).success) {
    return { ok: false, reason: "INVALID_INPUT" };
  }

  // 🔴 SAHİBLİK: `userId` şərtdədir (yuxarıdaki fayl başlığına bax).
  const result = await prisma.educationEntry.updateMany({
    where: { id: entryId, userId: viewer.userId },
    data: {
      institution: input.institution,
      degree: input.degree,
      field: input.field,
      country: input.country,
      startYear: input.startYear,
      endYear: input.endYear,
      isCurrent: input.isCurrent,
      visibility,
      includeInStats: input.includeInStats,
    },
  });

  return result.count === 0
    ? { ok: false, reason: "NOT_FOUND" }
    : { ok: true, value: undefined };
}

export async function deleteEducationEntry(
  viewer: Viewer,
  entryId: string,
): Promise<CareerMutationResult> {
  if (viewer.kind !== "USER") return { ok: false, reason: "UNAUTHENTICATED" };

  const result = await prisma.educationEntry.deleteMany({
    where: { id: entryId, userId: viewer.userId },
  });

  return result.count === 0
    ? { ok: false, reason: "NOT_FOUND" }
    : { ok: true, value: undefined };
}

// ---------------------------------------------------------------------------
// SupportOffer + openToSupport — ÜÇÜNCÜ razılıq
// ---------------------------------------------------------------------------

/**
 * Dəstək təkliflərini və ümumi açarı TƏK TRANSAKSİYADA yazır.
 *
 * ⚠️ İki şey birlikdə saxlanılır, çünki onlar istifadəçi üçün BİR qərardır:
 * "mən dəstək verməyə hazıram və bunlarla". Ayrı yazsaq bayraq açıq, siyahı
 * boş (və ya əksi) vəziyyət yaranardı.
 *
 * ⚠️ `SupportOffer` `@@unique([userId, type])` daşıyır — 7 növün hər birindən
 * yalnız bir sətir. Ona görə "hamısını sil + seçilənləri yaz" işlədilir:
 * `note` sahəsi hər dəfə formadan gəlir, saxlanacaq əlavə vəziyyət yoxdur
 * (`UserTag`-dan fərqli olaraq — orada `level` itə bilərdi, bax
 * `lib/relation-diff.ts`).
 */
export async function updateSupportSettings(
  viewer: Viewer,
  input: SupportSettingsInput,
): Promise<CareerMutationResult> {
  if (viewer.kind !== "USER") return { ok: false, reason: "UNAUTHENTICATED" };

  const seen = new Set<string>();
  const offers: Array<{ type: string; note: string | null }> = [];

  for (const offer of input.offers) {
    if (!SupportOfferTypeSchema.safeParse(offer.type).success) {
      return { ok: false, reason: "INVALID_INPUT" };
    }
    if (seen.has(offer.type)) continue; // dublikat → P2002 olardı
    seen.add(offer.type);
    offers.push(offer);
  }

  const userId = viewer.userId;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { openToSupport: input.openToSupport },
    });

    await tx.supportOffer.deleteMany({ where: { userId } });

    if (offers.length > 0) {
      await tx.supportOffer.createMany({
        data: offers.map((offer) => ({ userId, type: offer.type, note: offer.note })),
      });
    }
  });

  return { ok: true, value: undefined };
}
