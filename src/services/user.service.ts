// ============================================================================
// src/services/user.service.ts
// Profil oxunuşu, sinif kataloqu və sahə-səviyyə məxfilik idarəetməsi.
//
// ⚠️ BU FAYLIN ƏN VACİB HİSSƏSİ `buildProfileView()`-dur.
// `redactProfile()` HAZIR `ProfileView` gözləyir və sahəni yalnız obyektdə
// MÖVCUDDURSA yoxlayır (`if (!(field in user)) continue`). `interests`,
// `hobbies`, `skills`, `languages`, `clubs`, `careerHistory`, `education`
// `User` sütunu DEYİL — `UserTag` / `ClubMembership` / `CareerEntry` /
// `EducationEntry`-dən gəlir. Düzləndirilməsələr `redactProfile` onları
// sadəcə atlayır: heç nə sınmır, sadəcə həmin 7 məxfilik açarı SƏSSİZCƏ
// işləməz. Yeni əlaqə sahəsi əlavə edirsənsə burada da düzləndir.
//
// İKİ MÜSTƏQİL QAPI var və hər ikisi tətbiq olunur (dar olan qazanır):
//   1. SƏTİR səviyyəsi — `CareerEntry.visibility` / `EducationEntry.visibility`
//      DB-də, `visibilityWhereForUserOwned()` ilə (iç-içə `where`).
//   2. SAHƏ səviyyəsi — `FieldVisibility` cədvəli, `redactProfile()` ilə.
// Yəni `careerHistory` sahəsi PUBLIC olsa belə, PRIVATE işarələnmiş ayrıca iş
// yerinin sətri heç vaxt yüklənmir.
// ============================================================================

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  DIRECTORY_PAGE_SIZE,
  DIRECTORY_FILTERS,
  directoryFilterDef,
  emptyDirectoryFilters,
  type DirectoryFilterKey,
  type DirectoryFilterState,
  type FacetedFilterKey,
} from "@/lib/directory-filters";
import {
  ClubRole,
  TagType,
  UserStage,
  VisibilitySchema,
  type UserStage as UserStageType,
  type Visibility,
} from "@/lib/enums";
import {
  computeOnboardingProgress,
  type OnboardingProgress,
} from "@/lib/onboarding";
import {
  changedVisibility,
  diffIdSet,
  diffUserTags,
  type UserTagState,
} from "@/lib/relation-diff";
import { resolveStage, stageFromMemberships } from "@/lib/stage";
import { tokenizedContains } from "@/lib/text-search";
import {
  CONTROLLED_PROFILE_FIELDS,
  SCALAR_PROFILE_FIELDS,
  defaultLevelFor,
  fieldVisibleWhere,
  redactProfile,
  visibilityWhereForUserOwned,
  type ControlledField,
  type ProfileView,
  type Viewer,
} from "@/lib/visibility";

// ---------------------------------------------------------------------------
// Tiplər
// ---------------------------------------------------------------------------

export interface ProfileCohort {
  id: string;
  slug: string;
  displayName: string;
  role: string;
  isPrimary: boolean;
}

export interface ProfileCareerEntry {
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
}

export interface ProfileEducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string | null;
  country: string | null;
  startYear: number;
  endYear: number | null;
  isCurrent: boolean;
}

export interface ProfileClub {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface ProfileLanguage {
  name: string;
  level: string | null;
}

/** Məzunun dəstək təklifi (spec §9) — `User.openToSupport` ilə qapılanır. */
export interface ProfileSupportOffer {
  type: string;
  note: string | null;
}

/**
 * ÜÇÜNCÜ razılıq: dəstək təklifləri.
 *
 * ⚠️ Bu, nə `visibility`, nə də `includeInStats`-dır — AYRI bayraqdır
 * (`User.openToSupport`). `cohort.service.listSupportOffers` yalnız bayrağı
 * AÇIQ olanları qaytarır, ona görə 7 təklifi seçib bayrağı açmayan istifadəçi
 * heç yerdə görünmür. Profil bunu sahibə AÇIQ deyir (`openToSupport: false` +
 * dolu `offers` → "seçimləriniz gizlidir" xəbərdarlığı).
 */
export interface ProfileSupport {
  openToSupport: boolean;
  /** Kənar baxış üçün: bayraq sönülüdürsə BOŞ. Sahib öz siyahısını görür. */
  offers: ProfileSupportOffer[];
}

/**
 * `redactProfile`-a ötürülən TAM obyekt: `User` sütunları + DÜZLƏNDİRİLMİŞ
 * əlaqələr. Açar adları `CONTROLLED_PROFILE_FIELDS` ilə HƏRFBƏHƏRF eynidir —
 * fərq olsa məxfilik açarı işləməz.
 */
export interface FullProfileView extends ProfileView {
  id: string;
  firstName: string;
  lastName: string;
  cohortIds: string[];

  // --- İdarə olunan skalyar sahələr (User sütunları) ---
  avatarUrl: string | null;
  coverUrl: string | null;
  hometown: string | null;
  currentCity: string | null;
  currentCountry: string | null;
  phone: string | null;
  personalEmail: string | null;
  bio: string | null;
  learningGoals: string | null;
  askMeAbout: string | null;
  expectations: string | null;
  currentCompany: string | null;
  currentPosition: string | null;
  industry: string | null;
  futurePlans: string | null;

  // --- İdarə olunan ƏLAQƏ sahələri (düzləndirilib) ---
  interests: string[];
  hobbies: string[];
  skills: string[];
  languages: ProfileLanguage[];
  clubs: ProfileClub[];
  careerHistory: ProfileCareerEntry[];
  education: ProfileEducationEntry[];
}

/** `redactProfile`-dan çıxan forma: ad-soyad zəmanətli, qalanı şərti. */
export type RedactedProfile = Partial<FullProfileView> &
  Pick<FullProfileView, "id" | "firstName" | "lastName">;

/**
 * `getProfile` nəticəsi.
 *
 * `stage` və `cohorts` redaksiyaya TABE DEYİL: ad-soyad kimi struktur
 * məlumatdır (platformanın işləməsi üçün minimum — `redactProfile` şərhinə
 * bax). Sinif üzvlüyü onsuz da sinif kataloqunda göstərilir.
 */
export interface ProfileResult {
  profile: RedactedProfile;
  stage: UserStageType | null;
  cohorts: ProfileCohort[];
  isOwner: boolean;
  /**
   * Hekayə başlığındakı banner.
   *
   * ⚠️ Blok 12B-dən etibarən `CONTROLLED_PROFILE_FIELDS`-in ÜZVÜDÜR (22-ci
   * sahə) və öz `FieldVisibility` sətri var. Əvvəl `avatarUrl`-in
   * görünürlüyünə yamaqla bağlanmışdı — yəni banneri ayrıca gizlətmək mümkün
   * deyildi. Bu sahə artıq TÖRƏMƏDİR: `redactProfile`-dan çıxan `profile`
   * obyektində açar varsa dolur, yoxdursa `null`. İkinci qərar yolu YOXDUR.
   */
  coverUrl: string | null;
  support: ProfileSupport;
}

// ---------------------------------------------------------------------------
// buildProfileView — ƏLAQƏLƏRİN DÜZLƏNDİRİLMƏSİ
// ---------------------------------------------------------------------------

/**
 * `Viewer` birinci arqumentdir (CLAUDE.md §4) — PLAN-dakı `buildProfileView(userId)`
 * imzasından fərq QƏSDƏNDİR: `CareerEntry` / `EducationEntry` sətirləri öz
 * `visibility` sütunlarına malikdir və həmin süzgəc DB-də, iç-içə `where`
 * içində tətbiq olunur (JS-də filtrləmə qadağandır, CLAUDE.md §5).
 * Əlavə fayda: "Preview as" sintetik viewer ötürərək sətir səviyyəsini də
 * düzgün göstərir.
 *
 * TƏK sorğu dəsti: Prisma iç-içə `select`-ləri əlaqə başına BİR sorğuya
 * çevirir (sətir başına yox) — N+1 yoxdur.
 */
export async function buildProfileView(
  viewer: Viewer,
  userId: string,
): Promise<{
  view: FullProfileView;
  stage: UserStageType | null;
  cohorts: ProfileCohort[];
  fieldVisibility: Array<{ field: string; level: string }>;
  support: ProfileSupport;
} | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      coverUrl: true,
      openToSupport: true,
      hometown: true,
      currentCity: true,
      currentCountry: true,
      phone: true,
      personalEmail: true,
      bio: true,
      learningGoals: true,
      askMeAbout: true,
      expectations: true,
      currentCompany: true,
      currentPosition: true,
      industry: true,
      futurePlans: true,

      memberships: {
        select: {
          role: true,
          isPrimary: true,
          joinedAt: true,
          cohort: {
            select: {
              id: true,
              slug: true,
              displayName: true,
              academicStartsAt: true,
              graduatesAt: true,
            },
          },
        },
        orderBy: [{ isPrimary: "desc" }, { joinedAt: "desc" }],
      },

      // interests / hobbies / skills / languages — hamısı UserTag-dən, type-a görə
      tags: {
        select: {
          level: true,
          tag: { select: { type: true, name: true } },
        },
      },

      clubMemberships: {
        select: {
          role: true,
          club: { select: { id: true, name: true, slug: true } },
        },
      },

      // ⚠️ SƏTİR səviyyəsində məxfilik — DB-də, JS-də yox.
      careerEntries: {
        where: visibilityWhereForUserOwned<Prisma.CareerEntryWhereInput>(viewer),
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
        },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      },

      educationEntries: {
        where: visibilityWhereForUserOwned<Prisma.EducationEntryWhereInput>(viewer),
        select: {
          id: true,
          institution: true,
          degree: true,
          field: true,
          country: true,
          startYear: true,
          endYear: true,
          isCurrent: true,
        },
        orderBy: [{ startYear: "desc" }],
      },

      // ⚠️ Sətir səviyyəsində görünürlük sütunu YOXDUR — qapı `openToSupport`
      // bayrağıdır və aşağıda, düzləndirmədən SONRA tətbiq olunur.
      supportOffers: {
        select: { type: true, note: true },
        orderBy: { type: "asc" },
      },

      fieldVisibility: { select: { field: true, level: true } },
    },
  });

  if (!user) return null;

  const tagsOfType = (type: string): string[] =>
    user.tags.filter((t) => t.tag.type === type).map((t) => t.tag.name);

  const view: FullProfileView = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    cohortIds: user.memberships.map((m) => m.cohort.id),

    avatarUrl: user.avatarUrl,
    // ⚠️ T40: banner `view`-a YAZILMALIDIR, yoxsa `redactProfile`
    // `if (!(field in user)) continue` şərti ilə sahəni sadəcə ATLAYIR və
    // «coverUrl» məxfilik açarı SƏSSİZCƏ işləməz.
    coverUrl: user.coverUrl,
    hometown: user.hometown,
    currentCity: user.currentCity,
    currentCountry: user.currentCountry,
    phone: user.phone,
    personalEmail: user.personalEmail,
    bio: user.bio,
    learningGoals: user.learningGoals,
    askMeAbout: user.askMeAbout,
    expectations: user.expectations,
    currentCompany: user.currentCompany,
    currentPosition: user.currentPosition,
    industry: user.industry,
    futurePlans: user.futurePlans,

    // --- düzləndirilmiş əlaqələr ---
    interests: tagsOfType(TagType.INTEREST),
    hobbies: tagsOfType(TagType.HOBBY),
    skills: tagsOfType(TagType.SKILL),
    languages: user.tags
      .filter((t) => t.tag.type === TagType.LANGUAGE)
      .map((t) => ({ name: t.tag.name, level: t.level })),
    clubs: user.clubMemberships.map((m) => ({
      id: m.club.id,
      name: m.club.name,
      slug: m.club.slug,
      role: m.role,
    })),
    careerHistory: user.careerEntries,
    education: user.educationEntries,
  };

  const isOwner = viewer.kind === "USER" && viewer.userId === userId;

  return {
    view,
    // ⚠️ `coverUrl` BURADA AYRICA QAYTARILMIR — `view`-un içindədir və yalnız
    // `redactProfile`-dan keçərək çıxır. Xam nüsxə saxlasaq redaksiyanı yan
    // keçən ikinci yol yaranardı (T40 dərsi).
    support: {
      openToSupport: user.openToSupport,
      // Bayraq sönülüdürsə kənar baxış üçün siyahı BOŞDUR — `listSupportOffers`
      // ilə eyni qayda. Sahib öz seçimlərini həmişə görür ki, bayrağın niyə
      // heç nə göstərmədiyini başa düşsün.
      offers: user.openToSupport || isOwner ? user.supportOffers : [],
    },
    // `User.stage` yalnız keşdir — mərhələ cohort tarixlərindən hesablanır.
    stage: stageFromMemberships(
      user.memberships.map((m) => ({
        isPrimary: m.isPrimary,
        joinedAt: m.joinedAt,
        cohort: m.cohort,
      })),
    ),
    cohorts: user.memberships.map((m) => ({
      id: m.cohort.id,
      slug: m.cohort.slug,
      displayName: m.cohort.displayName,
      role: m.role,
      isPrimary: m.isPrimary,
    })),
    fieldVisibility: user.fieldVisibility,
  };
}

// ---------------------------------------------------------------------------
// getProfile
// ---------------------------------------------------------------------------

/**
 * Profili viewer-in görməli olduğu formada qaytarır.
 * Görünməyən sahələr obyektdən TAMAMİLƏ SİLİNİR (`null` qoyulmur) — sahənin
 * mövcudluğu belə sızmamalıdır.
 */
export async function getProfile(
  viewer: Viewer,
  userId: string,
): Promise<ProfileResult | null> {
  const built = await buildProfileView(viewer, userId);
  if (!built) return null;

  // `redactProfile` yalnız giriş obyektindəki açarları KOPYALAYIR (yeni dəyər
  // yaratmır), ona görə dəyər tipləri qorunur — çevirmə təhlükəsizdir.
  const profile = redactProfile(
    built.view,
    viewer,
    built.fieldVisibility,
  ) as RedactedProfile;

  return {
    profile,
    stage: built.stage,
    cohorts: built.cohorts,
    isOwner: viewer.kind === "USER" && viewer.userId === userId,
    // Banner ARTIQ öz məxfilik açarına malikdir: `redactProfile` onu
    // gizlədibsə açar obyektdə YOXDUR və burada `null` qalır.
    coverUrl: profile.coverUrl ?? null,
    support: built.support,
  };
}

// ---------------------------------------------------------------------------
// Class Directory [M6] — 13 filtr, hər biri MƏXFİLİK ŞƏRTİ ilə
// ---------------------------------------------------------------------------
//
// 🔴 BU BÖLMƏNİN ƏSAS QAYDASI: gizlədilmiş sahəyə görə filtr həmin sahəni
// SIZDIRIR. Hər filtr İKİ şərt qurur və ikisi də DB-dədir —
//   1. dəyər uyğunluğu     `{ currentCity: "Bakı" }`
//   2. sahə görünürlüyü    `fieldVisibleWhere(viewer, "currentCity")`
// Cütlük `filterClauses()`-də BİR YERDƏ qurulur ki, yeni filtr yazan adam
// ikincisini unutmasın. Filtr → sahə xəritəsi `src/lib/directory-filters.ts`
// başındakı cədvəldədir.
// ---------------------------------------------------------------------------

/**
 * Kataloq kartı üçün YÜNGÜL profil forması.
 *
 * ⚠️ `careerHistory` və `education` QƏSDƏN yoxdur — kart üçün lazım deyil və
 * hər üzv üçün iki əlavə əlaqə oxunuşu deməkdir. `redactProfile` obyektdə
 * OLMAYAN sahəni atladığı üçün bu, təhlükəsiz istiqamətdə səhvdir: sahə
 * çıxışda ümumiyyətlə görünmür. Tam profil üçün `/u/[userId]`.
 */
export interface DirectoryEntryView extends ProfileView {
  id: string;
  firstName: string;
  lastName: string;
  cohortIds: string[];
  avatarUrl: string | null;
  hometown: string | null;
  currentCity: string | null;
  currentCountry: string | null;
  bio: string | null;
  currentCompany: string | null;
  currentPosition: string | null;
  industry: string | null;
  interests: string[];
  hobbies: string[];
  skills: string[];
  languages: ProfileLanguage[];
  clubs: ProfileClub[];
}

/**
 * Kartda göstərilən sinif konteksti.
 *
 * Məxfilik REDAKSİYASINA TABE DEYİL: `CohortMembership` struktur məlumatdır
 * (`getProfile` şərhinə bax — `stage` və `cohorts` da belədir). Bunun əvəzinə
 * SORĞUDA daraldılır: yalnız viewer-in ÖZÜ üzv olduğu siniflər seçilir, yəni
 * kataloq başqa sinifdəki üzvlüyü açmır.
 */
export interface DirectoryCohort {
  id: string;
  slug: string;
  displayName: string;
  admissionYear: number;
  graduationYear: number;
  facultyName: string | null;
  programName: string | null;
  /** Cohort tarixlərindən hesablanır — `User.stage` keşinə güvənilmir. */
  stage: UserStageType;
  /** `CohortMembership.role` */
  role: string;
}

/**
 * `redactProfile`-dan çıxan forma + struktur sinif konteksti.
 *
 * ⚠️ `cohorts` redaksiyadan SONRA əlavə olunur: `redactProfile` yalnız
 * idarə olunan sahələri (+ id/ad/soyad) kopyalayır, ona görə əvvəlcədən
 * qoyulsa səssizcə itərdi (`cohort.service.ts` → `toMemberCard` eyni nümunə).
 */
export type DirectoryEntry = Partial<DirectoryEntryView> &
  Pick<DirectoryEntryView, "id" | "firstName" | "lastName"> & {
    cohorts: DirectoryCohort[];
  };

export interface DirectoryQuery {
  /** Hansı sinfin kataloqu — verilməzsə viewer-in bütün sinifləri. */
  cohortId?: string;
  /** 13 filtrin normallaşdırılmış vəziyyəti (`parseDirectoryParams`). */
  filters?: DirectoryFilterState;
  take?: number;
  skip?: number;
}

export interface DirectoryPage {
  items: DirectoryEntry[];
  total: number;
}

const DIRECTORY_COHORT_SELECT = {
  id: true,
  slug: true,
  displayName: true,
  admissionYear: true,
  graduationYear: true,
  academicStartsAt: true,
  graduatesAt: true,
  faculty: { select: { name: true } },
  program: { select: { name: true } },
} satisfies Prisma.CohortSelect;

const DIRECTORY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  hometown: true,
  currentCity: true,
  currentCountry: true,
  bio: true,
  currentCompany: true,
  currentPosition: true,
  industry: true,
  memberships: {
    select: { role: true, cohortId: true, cohort: { select: DIRECTORY_COHORT_SELECT } },
    orderBy: [{ isPrimary: "desc" }, { joinedAt: "desc" }],
  },
  tags: { select: { level: true, tag: { select: { type: true, name: true } } } },
  clubMemberships: {
    select: { role: true, club: { select: { id: true, name: true, slug: true } } },
  },
  fieldVisibility: { select: { field: true, level: true } },
} satisfies Prisma.UserSelect;

type DirectoryRow = Prisma.UserGetPayload<{ select: typeof DIRECTORY_SELECT }>;

/**
 * Üzvlük seçimi viewer-in siniflərinə daraldılır.
 *
 * İki səbəb var:
 *   1. Kart yalnız BAXILAN kontekstin sinif məlumatını göstərməlidir.
 *   2. `redactProfile`-ın `sharesClass` hesablaması `cohortIds`-ə baxır —
 *      kəsişmə boş olmayanda `true`. Süzülmüş dəst MƏHZ kəsişmədir, yəni
 *      nəticə dəyişmir, amma kənar sinif id-ləri heç vaxt yaddaşa gəlmir.
 */
function directorySelectFor(cohortIds: string[]) {
  return {
    ...DIRECTORY_SELECT,
    memberships: {
      ...DIRECTORY_SELECT.memberships,
      where: { cohortId: { in: cohortIds } },
    },
  } satisfies Prisma.UserSelect;
}

function toDirectoryEntry(row: DirectoryRow, viewer: Viewer): DirectoryEntry {
  const tagsOfType = (type: string): string[] =>
    row.tags.filter((t) => t.tag.type === type).map((t) => t.tag.name);

  const view: DirectoryEntryView = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    cohortIds: row.memberships.map((m) => m.cohortId),
    avatarUrl: row.avatarUrl,
    hometown: row.hometown,
    currentCity: row.currentCity,
    currentCountry: row.currentCountry,
    bio: row.bio,
    currentCompany: row.currentCompany,
    currentPosition: row.currentPosition,
    industry: row.industry,
    interests: tagsOfType(TagType.INTEREST),
    hobbies: tagsOfType(TagType.HOBBY),
    skills: tagsOfType(TagType.SKILL),
    languages: row.tags
      .filter((t) => t.tag.type === TagType.LANGUAGE)
      .map((t) => ({ name: t.tag.name, level: t.level })),
    clubs: row.clubMemberships.map((m) => ({
      id: m.club.id,
      name: m.club.name,
      slug: m.club.slug,
      role: m.role,
    })),
  };

  return {
    ...(redactProfile(view, viewer, row.fieldVisibility) as Partial<DirectoryEntryView> &
      Pick<DirectoryEntryView, "id" | "firstName" | "lastName">),
    cohorts: row.memberships.map((m) => ({
      id: m.cohort.id,
      slug: m.cohort.slug,
      displayName: m.cohort.displayName,
      admissionYear: m.cohort.admissionYear,
      graduationYear: m.cohort.graduationYear,
      facultyName: m.cohort.faculty?.name ?? null,
      programName: m.cohort.program?.name ?? null,
      stage: resolveStage(m.cohort),
      role: m.role,
    })),
  };
}

/**
 * Sorğulana bilən sinif id-ləri.
 *
 * `cohortId` arqumenti KƏNARDAN (URL-dən) gəlir, ona görə viewer-in öz
 * üzvlükləri ilə kəsişməyə salınır: anonim və kənar istifadəçi heç kimi
 * görmür — üzv siyahısı sinif daxili məlumatdır (`cohort.service.ts` başlığı).
 */
function allowedCohortIds(
  viewer: Extract<Viewer, { kind: "USER" }>,
  cohortId?: string,
): string[] {
  return cohortId
    ? viewer.cohortIds.filter((id) => id === cohortId)
    : viewer.cohortIds;
}

/**
 * `status` filtri (tələbə / məzun) — `resolveStage()`-in DB QARŞILIĞI.
 *
 * ⚠️ `User.stage` sütununa GÖRƏ filtrləmƏK olmaz: o, yalnız keşdir və girişdə
 * yenilənir (CLAUDE.md, `lib/stage.ts`). Həqiqət mənbəyi cohort tarixləridir,
 * ona görə şərt `academicStartsAt` / `graduatesAt` üzərində qurulur və
 * `resolveStage`-in sərhədləri ilə HƏRFBƏHƏRF eyni olur:
 *   now <  academicStartsAt                     → INCOMING
 *   academicStartsAt ≤ now < graduatesAt        → STUDENT
 *   graduatesAt ≤ now                           → ALUMNI
 */
function stageCohortWhere(stage: UserStageType, now: Date): Prisma.CohortWhereInput {
  switch (stage) {
    case UserStage.INCOMING:
      return { academicStartsAt: { gt: now } };
    case UserStage.STUDENT:
      return { academicStartsAt: { lte: now }, graduatesAt: { gt: now } };
    case UserStage.ALUMNI:
      return { graduatesAt: { lte: now } };
  }
}

/**
 * Filtrin DƏYƏR şərti — məxfilik şərti BURADA YOX (bax `filterClauses`).
 * Cohort səviyyəli filtrlər (`faculty`, `status`…) burada `null` qaytarır:
 * onlar `cohortWhereOf`-da tək `memberships.some`-un içinə yığılır.
 */
function valueWhereOf(
  filters: DirectoryFilterState,
  key: DirectoryFilterKey,
): Prisma.UserWhereInput | null {
  switch (key) {
    case "name": {
      if (filters.name === null) return null;
      // 🔴 TƏLƏ T14 — SQLite hərf həssaslığı, bax `lib/text-search.ts`.
      return tokenizedContains<Prisma.UserWhereInput>(
        ["firstName", "lastName"],
        filters.name,
      );
    }

    case "city":
      return filters.city === null ? null : { currentCity: filters.city };

    case "country":
      return filters.country === null ? null : { currentCountry: filters.country };

    case "industry":
      return filters.industry === null ? null : { industry: filters.industry };

    case "company":
      return filters.company === null ? null : { currentCompany: filters.company };

    // `multi` filtrlər «hər hansı biri» (OR) semantikası ilə işləyir —
    // iki maraq seçən istifadəçi kəsişmə deyil, birləşmə gözləyir.
    case "interest":
      return filters.interest.length === 0
        ? null
        : {
            tags: {
              some: { tag: { type: TagType.INTEREST, slug: { in: filters.interest } } },
            },
          };

    case "language":
      return filters.language.length === 0
        ? null
        : {
            tags: {
              some: { tag: { type: TagType.LANGUAGE, slug: { in: filters.language } } },
            },
          };

    case "club":
      return filters.club.length === 0
        ? null
        : { clubMemberships: { some: { club: { slug: { in: filters.club } } } } };

    // --- cohort səviyyəli filtrlər: `cohortWhereOf`-a bax ---
    case "faculty":
    case "program":
    case "admissionYear":
    case "graduationYear":
    case "status":
      return null;
  }
}

/**
 * 🔒 Filtrin TAM şərti: dəyər + sahə görünürlüyü.
 *
 * Görünürlük şərti `directoryFilterDef(key).profileField`-dən AVTOMATİK
 * gəlir — yəni filtr xəritəsində sahə göstərilib şərtin əlavə edilməməsi
 * mümkün deyil. Xəritədə `profileField: null` olan filtrlər (`name`, cohort
 * səviyyəli olanlar) struktur məlumat üzərindədir və şərt tələb etmir.
 */
function filterClauses(
  viewer: Viewer,
  filters: DirectoryFilterState,
  key: DirectoryFilterKey,
): Prisma.UserWhereInput[] {
  const value = valueWhereOf(filters, key);
  if (value === null) return [];

  const field = directoryFilterDef(key).profileField;
  if (field === null) return [value];

  return [value, fieldVisibleWhere<Prisma.UserWhereInput>(viewer, field)];
}

/**
 * Cohort səviyyəli filtrlər — HAMISI TƏK `memberships.some` şərtinə yığılır.
 *
 * ⚠️ Bu, təsadüfi deyil. Ayrı-ayrı `memberships: { some: … }` şərtləri
 * FƏRQLİ üzvlük sətirlərinə uyğun gələ bilər: iki sinifdə olan istifadəçi
 * "A sinfindədir" VƏ "fakültəsi X-dir" şərtlərini iki AYRI sinif vasitəsilə
 * ödəyib nəticəyə düşərdi. Tək `some` daxilində birləşdirmək eyni üzvlük
 * sətrini məcbur edir.
 */
function cohortWhereOf(
  filters: DirectoryFilterState,
  except: DirectoryFilterKey | null,
  now: Date,
): Prisma.CohortWhereInput | null {
  // ⚠️ Ad `use…` OLMAMALIDIR — eslint `react-hooks/rules-of-hooks` `use` adını
  // React hook-u sayır və servis faylında səhv verir.
  const applies = (key: DirectoryFilterKey): boolean => key !== except;

  const where: Prisma.CohortWhereInput = {};

  if (applies("faculty") && filters.faculty !== null) {
    where.faculty = { slug: filters.faculty };
  }
  if (applies("program") && filters.program !== null) {
    where.program = { slug: filters.program };
  }
  if (applies("admissionYear") && filters.admissionYear !== null) {
    where.admissionYear = filters.admissionYear;
  }
  if (applies("graduationYear") && filters.graduationYear !== null) {
    where.graduationYear = filters.graduationYear;
  }
  if (applies("status") && filters.status !== null) {
    Object.assign(where, stageCohortWhere(filters.status, now));
  }

  return Object.keys(where).length === 0 ? null : where;
}

/** `cohortWhereOf`-un idarə etdiyi açarlar — qalanları istifadəçi səviyyəlidir. */
const COHORT_LEVEL_KEYS: readonly DirectoryFilterKey[] = [
  "faculty",
  "program",
  "admissionYear",
  "graduationYear",
  "status",
];

/**
 * `User` sütunları / əlaqələri üzərində işləyən açarlar.
 * Tərif cədvəlindən ÇIXARILIR (əl ilə yazılmır): yeni filtr əlavə edilsə və
 * cohort səviyyəli olmasa avtomatik buraya düşür və şərti tətbiq olunur.
 */
const USER_LEVEL_KEYS: readonly DirectoryFilterKey[] = (
  Object.keys(DIRECTORY_FILTERS) as DirectoryFilterKey[]
).filter((key) => !COHORT_LEVEL_KEYS.includes(key));

/** İstifadəçi səviyyəli şərtlər (ad, şəhər, taq, klub…) — məxfiliklə birlikdə. */
function userClausesOf(
  viewer: Viewer,
  filters: DirectoryFilterState,
  except: DirectoryFilterKey | null,
): Prisma.UserWhereInput[] {
  return USER_LEVEL_KEYS.filter((key) => key !== except).flatMap((key) =>
    filterClauses(viewer, filters, key),
  );
}

/**
 * Kataloq sorğusunun tam `where` şərti.
 *
 * `except` — facet hesablaması üçün: bir filtrin öz şərti çıxarılır ki,
 * həmin filtrin digər variantlarının sayı da görünsün (əks halda şəhər
 * seçildikdən sonra qalan şəhərlər hamısı «0» olar və filtr dəyişdirilə
 * bilməzdi).
 */
function directoryWhere(
  viewer: Viewer,
  cohortIds: string[],
  filters: DirectoryFilterState,
  except: DirectoryFilterKey | null,
  now: Date,
): Prisma.UserWhereInput {
  const cohortWhere = cohortWhereOf(filters, except, now);

  return {
    AND: [
      {
        memberships: {
          some: {
            cohortId: { in: cohortIds },
            ...(cohortWhere ? { cohort: cohortWhere } : {}),
          },
        },
      },
      ...userClausesOf(viewer, filters, except),
    ],
  };
}

/**
 * Sinif kataloqu — 13 filtr, səhifələmə, hər sətir `redactProfile`-dan keçmiş.
 *
 * Kursor YOX, `skip`/`take`: kataloq nömrələnmiş səhifələrlə gəzilir
 * (KUDS §14), lent isə sonsuz scroll-dur — ikisi qəsdən fərqlidir.
 */
export async function listDirectory(
  viewer: Viewer,
  query: DirectoryQuery = {},
  now: Date = new Date(),
): Promise<DirectoryPage> {
  if (viewer.kind !== "USER") return { items: [], total: 0 };

  const cohortIds = allowedCohortIds(viewer, query.cohortId);
  if (cohortIds.length === 0) return { items: [], total: 0 };

  const filters = query.filters ?? emptyDirectoryFilters();
  const where = directoryWhere(viewer, cohortIds, filters, null, now);
  const take = query.take ?? DIRECTORY_PAGE_SIZE;

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
      take,
      skip: query.skip ?? 0,
      select: directorySelectFor(cohortIds),
    }),
  ]);

  return { items: rows.map((row) => toDirectoryEntry(row, viewer)), total };
}

// ---------------------------------------------------------------------------
// listDirectoryFacets — select-lərin DB-dən doldurulması
// ---------------------------------------------------------------------------

export interface DirectoryFacetOption {
  /** URL-ə düşən dəyər (slug, şəhər adı, il, enum). */
  value: string;
  /**
   * DB-dən gələn göstərilən ad (fakültə, ixtisas, taq, klub).
   * `null` — dəyərin özü etiketdir (şəhər, şirkət) və ya UI onu tərcümə edir
   * (`industry`, `status` → `features/directory/labels.ts`).
   */
  label: string | null;
  count: number;
}

export type DirectoryFacets = Record<FacetedFilterKey, DirectoryFacetOption[]>;

/**
 * 🔒 Facet sayları DA sızdırır. "Bakı (12)" göstərirsənsə həmin 12 sətir
 * filtrin qurduğu EYNİ iki şərtdən keçməlidir — yoxsa istifadəçi şəhəri
 * gizlədən adamı saya görə hesablayar.
 *
 * Ona görə hər facet sorğusu `directoryWhere(… except: key)` + həmin sahənin
 * `fieldVisibleWhere` şərti ilə qurulur. Nəticə: `?city=Bakı` filtrinin
 * `total`-ı ilə "Bakı" facet sayı ÜST-ÜSTƏ DÜŞÜR (inteqrasiya testi).
 *
 * ⚠️ Saylar k-anonimliyə SALINMIR (`suppressSmallBuckets` işlədilmir): bu,
 * aqreqasiya statistikası deyil, naviqasiyadır — istifadəçi onsuz da həmin
 * bir nəfəri kataloqda ada görə tapa bilir. Görünürlük şərti kifayətdir.
 */
function facetUserWhere(
  viewer: Viewer,
  cohortIds: string[],
  filters: DirectoryFilterState,
  key: FacetedFilterKey,
  now: Date,
): Prisma.UserWhereInput {
  const field = directoryFilterDef(key).profileField;

  return {
    AND: [
      directoryWhere(viewer, cohortIds, filters, key, now),
      ...(field ? [fieldVisibleWhere<Prisma.UserWhereInput>(viewer, field)] : []),
    ],
  };
}

/** Facet çıxarılan `User` skalyar sütunları. */
type ScalarFacetColumn = "currentCity" | "currentCountry" | "industry" | "currentCompany";

/** `null` olmayan skalyar sütun üzrə facet — `groupBy` ilə tək sorğu. */
async function scalarFacet(
  column: ScalarFacetColumn,
  where: Prisma.UserWhereInput,
): Promise<DirectoryFacetOption[]> {
  const rows = await prisma.user.groupBy({
    by: [column],
    where: { AND: [where, { [column]: { not: null } } as Prisma.UserWhereInput] },
    _count: { _all: true },
  });

  return rows
    .map((row) => ({
      value: (row as Record<ScalarFacetColumn, string | null>)[column] ?? "",
      label: null,
      count: row._count._all,
    }))
    .filter((option) => option.value !== "" && option.count > 0)
    .sort((a, b) => a.value.localeCompare(b.value, "az"));
}

/**
 * Taq facet-i — `Tag` cədvəlindən süzülmüş əlaqə sayı ilə.
 *
 * `groupBy` yerinə `findMany + _count.where` işlədilir, çünki taqın ADI
 * lazımdır və `groupBy` əlaqə sütunlarını `by`-a qəbul etmir (iki addım
 * əvəzinə bir sorğu).
 */
async function tagFacet(
  type: string,
  where: Prisma.UserWhereInput,
): Promise<DirectoryFacetOption[]> {
  const rows = await prisma.tag.findMany({
    where: { type },
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      _count: { select: { users: { where: { user: where } } } },
    },
  });

  return rows
    .filter((row) => row._count.users > 0)
    .map((row) => ({ value: row.slug, label: row.name, count: row._count.users }));
}

async function clubFacet(where: Prisma.UserWhereInput): Promise<DirectoryFacetOption[]> {
  const rows = await prisma.club.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      _count: { select: { members: { where: { user: where } } } },
    },
  });

  return rows
    .filter((row) => row._count.members > 0)
    .map((row) => ({ value: row.slug, label: row.name, count: row._count.members }));
}

/**
 * Cohort səviyyəli facet-lər (fakültə, ixtisas, illər, status).
 *
 * Sorğu `Cohort`-dan gedir: icazəli siniflər + digər cohort filtrləri, üzv
 * sayı isə istifadəçi səviyyəli şərtlərlə süzülür. Sinif sayı azdır (viewer-in
 * öz sinifləri), ona görə xanaları JS-də toplamaq təhlükəsizdir — bu,
 * DB-də hesablanmış sayların QRUPLAŞDIRILMASIDIR, sətir filtrləməsi deyil.
 *
 * ⚠️ Bir istifadəçi eyni fakültənin iki sinfindəsə iki dəfə sayılır. Bir sinfin
 * kataloqunda (əsas hal) belə vəziyyət yaranmır.
 */
async function cohortFacets(
  viewer: Viewer,
  cohortIds: string[],
  filters: DirectoryFilterState,
  key: Extract<
    FacetedFilterKey,
    "faculty" | "program" | "admissionYear" | "graduationYear" | "status"
  >,
  now: Date,
): Promise<DirectoryFacetOption[]> {
  const cohortWhere = cohortWhereOf(filters, key, now);
  const memberWhere: Prisma.UserWhereInput = {
    AND: userClausesOf(viewer, filters, null),
  };

  const rows = await prisma.cohort.findMany({
    where: { id: { in: cohortIds }, ...(cohortWhere ?? {}) },
    select: {
      admissionYear: true,
      graduationYear: true,
      academicStartsAt: true,
      graduatesAt: true,
      faculty: { select: { slug: true, name: true } },
      program: { select: { slug: true, name: true } },
      _count: { select: { members: { where: { user: memberWhere } } } },
    },
  });

  const buckets = new Map<string, DirectoryFacetOption>();

  for (const row of rows) {
    const count = row._count.members;
    if (count === 0) continue;

    let value: string | null = null;
    let label: string | null = null;

    switch (key) {
      case "faculty":
        value = row.faculty?.slug ?? null;
        label = row.faculty?.name ?? null;
        break;
      case "program":
        value = row.program?.slug ?? null;
        label = row.program?.name ?? null;
        break;
      case "admissionYear":
        value = String(row.admissionYear);
        break;
      case "graduationYear":
        value = String(row.graduationYear);
        break;
      case "status":
        value = resolveStage(row, now);
        break;
    }

    if (value === null) continue;

    const existing = buckets.get(value);
    if (existing) existing.count += count;
    else buckets.set(value, { value, label, count });
  }

  return [...buckets.values()].sort((a, b) => a.value.localeCompare(b.value, "az"));
}

/**
 * Facet-siz nəticə (anonim viewer, üzvlüyü olmayan sinif).
 * Açarlar AÇIQ yazılıb — yeni facet filtri əlavə olunsa `tsc` burada dayanır.
 */
const EMPTY_FACETS: DirectoryFacets = {
  faculty: [],
  program: [],
  admissionYear: [],
  graduationYear: [],
  city: [],
  country: [],
  industry: [],
  company: [],
  interest: [],
  language: [],
  club: [],
  status: [],
};

/**
 * Filtr panelinin seçim siyahıları — hardcode YOX, hamısı DB-dən.
 *
 * Hər qrup öz sorğusundadır və hamısı paralel gedir; hər biri eyni məxfilik
 * şərtindən keçir (`facetUserWhere`).
 */
export async function listDirectoryFacets(
  viewer: Viewer,
  query: Omit<DirectoryQuery, "take" | "skip"> = {},
  now: Date = new Date(),
): Promise<DirectoryFacets> {
  if (viewer.kind !== "USER") return EMPTY_FACETS;

  const cohortIds = allowedCohortIds(viewer, query.cohortId);
  if (cohortIds.length === 0) return EMPTY_FACETS;

  const filters = query.filters ?? emptyDirectoryFilters();
  const whereFor = (key: FacetedFilterKey): Prisma.UserWhereInput =>
    facetUserWhere(viewer, cohortIds, filters, key, now);

  const [
    faculty,
    program,
    admissionYear,
    graduationYear,
    city,
    country,
    industry,
    company,
    interest,
    language,
    club,
    status,
  ] = await Promise.all([
    cohortFacets(viewer, cohortIds, filters, "faculty", now),
    cohortFacets(viewer, cohortIds, filters, "program", now),
    cohortFacets(viewer, cohortIds, filters, "admissionYear", now),
    cohortFacets(viewer, cohortIds, filters, "graduationYear", now),
    scalarFacet("currentCity", whereFor("city")),
    scalarFacet("currentCountry", whereFor("country")),
    scalarFacet("industry", whereFor("industry")),
    scalarFacet("currentCompany", whereFor("company")),
    tagFacet(TagType.INTEREST, whereFor("interest")),
    tagFacet(TagType.LANGUAGE, whereFor("language")),
    clubFacet(whereFor("club")),
    cohortFacets(viewer, cohortIds, filters, "status", now),
  ]);

  return {
    faculty,
    program,
    admissionYear,
    graduationYear,
    city,
    country,
    industry,
    company,
    interest,
    language,
    club,
    status,
  };
}

// ---------------------------------------------------------------------------
// searchUsers — qlobal axtarışın istifadəçi bölməsi [M16]
// ---------------------------------------------------------------------------

/**
 * Ada görə istifadəçi axtarışı (⌘K palitrası və `/search`).
 *
 * ƏHATƏ: yalnız viewer-in ÖZ sinifləri — `listDirectory` ilə eyni qayda.
 * Universitet üzrə axtarış kimin hansı sinifdə olduğunu açardı; üzv siyahısı
 * isə sinif daxili məlumatdır (`cohort.service.ts` başlığı).
 *
 * Yalnız ad-soyad üzərində işləyir: `redactProfile` onları heç vaxt
 * gizlətmir, yəni axtarış sahəsi sızma yaratmır. Bio / şəhər üzərində
 * axtarış üçün həmin sahələrin `fieldVisibleWhere` şərti lazım olardı —
 * kataloq filtrləri bunu edir, palitra sadə qalır.
 */
export async function searchUsers(
  viewer: Viewer,
  term: string,
  take: number,
): Promise<DirectoryEntry[]> {
  if (viewer.kind !== "USER") return [];

  const nameWhere = tokenizedContains<Prisma.UserWhereInput>(
    ["firstName", "lastName"],
    term,
  );
  if (nameWhere === null) return [];

  const cohortIds = viewer.cohortIds;
  if (cohortIds.length === 0) return [];

  const rows = await prisma.user.findMany({
    where: {
      AND: [{ memberships: { some: { cohortId: { in: cohortIds } } } }, nameWhere],
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
    take,
    select: directorySelectFor(cohortIds),
  });

  return rows.map((row) => toDirectoryEntry(row, viewer));
}

// ---------------------------------------------------------------------------
// "Özünü təqdim et" sihirbazı — Incoming Class (spec §16)
// ---------------------------------------------------------------------------

/**
 * Viewer-in ÖZ profilinin tamamlanma vəziyyəti.
 *
 * ⚠️ Bu, yeganə profil sorğusudur ki, `redactProfile`-dan KEÇMİR — və keçməsi
 * də səhv olardı: sahib öz məlumatını həmişə görür (`redactProfile` sahib üçün
 * obyekti olduğu kimi qaytarır). Sorğu yalnız `viewer.userId` üçün qurulur,
 * kənar `userId` arqumenti yoxdur — başqasının profil tamamlanmasını oxumaq
 * mümkün deyil.
 *
 * Hesablama məntiqi `src/lib/onboarding.ts`-dədir (saf, testlə örtülü).
 */
export async function getOnboardingProgress(
  viewer: Viewer,
): Promise<OnboardingProgress | null> {
  if (viewer.kind !== "USER") return null;

  const user = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: {
      avatarUrl: true,
      hometown: true,
      bio: true,
      askMeAbout: true,
      learningGoals: true,
      expectations: true,
      _count: { select: { tags: true } },
    },
  });

  if (!user) return null;

  return computeOnboardingProgress({
    avatarUrl: user.avatarUrl,
    hometown: user.hometown,
    bio: user.bio,
    askMeAbout: user.askMeAbout,
    learningGoals: user.learningGoals,
    expectations: user.expectations,
    tagCount: user._count.tags,
  });
}

// ---------------------------------------------------------------------------
// Sahə-səviyyə məxfilik idarəetməsi (/me/privacy)
// ---------------------------------------------------------------------------

export type FieldVisibilityMap = Record<ControlledField, Visibility>;

/**
 * Viewer-in bütün idarə olunan sahələri üçün cari səviyyə.
 * DB-də sətri olmayan sahə `defaultLevelFor()`-a düşür (yeni sahə əlavə
 * olunanda köhnə hesablarda sətir olmur — `PRIVATE`/`CLASS` default-u qorunur).
 */
export async function getFieldVisibility(viewer: Viewer): Promise<FieldVisibilityMap> {
  const rows =
    viewer.kind === "USER"
      ? await prisma.fieldVisibility.findMany({
          where: { userId: viewer.userId },
          select: { field: true, level: true },
        })
      : [];

  const stored = new Map(rows.map((r) => [r.field, r.level]));

  return Object.fromEntries(
    CONTROLLED_PROFILE_FIELDS.map((field) => [
      field,
      // Naməlum/pozulmuş dəyər → default (fail closed, sətir literal yox).
      VisibilitySchema.catch(defaultLevelFor(field)).parse(stored.get(field)),
    ]),
  ) as FieldVisibilityMap;
}

export type VisibilityFailure = "UNAUTHENTICATED" | "UNKNOWN_FIELD" | "INVALID_LEVEL";

export type UpdateVisibilityResult = { ok: true } | { ok: false; reason: VisibilityFailure };

function isControlledField(field: string): field is ControlledField {
  return (CONTROLLED_PROFILE_FIELDS as readonly string[]).includes(field);
}

/**
 * Kənardan gələn (sahə, səviyyə) cütlərini doğrulayır.
 *
 * `/me/privacy` və `/me/edit` EYNİ qaydadan keçir — sahə adı idarə olunan
 * siyahıda olmalı, səviyyə isə `VisibilitySchema`-dan. Doğrulama tək yerdə
 * saxlanılır ki, ikinci giriş nöqtəsi (forma) zəif qalmasın.
 */
function validateVisibilityEntries(
  entries: ReadonlyArray<{ field: string; level: string }>,
):
  | { ok: true; value: Array<{ field: ControlledField; level: Visibility }> }
  | { ok: false; reason: VisibilityFailure } {
  const validated: Array<{ field: ControlledField; level: Visibility }> = [];

  for (const entry of entries) {
    if (!isControlledField(entry.field)) return { ok: false, reason: "UNKNOWN_FIELD" };

    const parsed = VisibilitySchema.safeParse(entry.level);
    if (!parsed.success) return { ok: false, reason: "INVALID_LEVEL" };

    validated.push({ field: entry.field, level: parsed.data });
  }

  return { ok: true, value: validated };
}

/** Tək sahənin səviyyəsini dəyişir. */
export async function updateFieldVisibility(
  viewer: Viewer,
  field: string,
  level: string,
): Promise<UpdateVisibilityResult> {
  return updateFieldVisibilityMany(viewer, [{ field, level }]);
}

/**
 * Bir neçə sahəni birlikdə dəyişir — `/me/privacy`-dəki "hamısını dəyiş"
 * düymələri bunu çağırır. Tək transaksiya: yarımçıq tətbiq olmasın.
 */
export async function updateFieldVisibilityMany(
  viewer: Viewer,
  entries: Array<{ field: string; level: string }>,
): Promise<UpdateVisibilityResult> {
  if (viewer.kind !== "USER") return { ok: false, reason: "UNAUTHENTICATED" };
  if (entries.length === 0) return { ok: true };

  const validated = validateVisibilityEntries(entries);
  if (!validated.ok) return validated;

  const userId = viewer.userId;

  await prisma.$transaction(
    validated.value.map((entry) =>
      prisma.fieldVisibility.upsert({
        where: { userId_field: { userId, field: entry.field } },
        create: { userId, field: entry.field, level: entry.level },
        update: { level: entry.level },
      }),
    ),
  );

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Profil redaktəsi (/me/edit) [M7]
// ---------------------------------------------------------------------------
//
// 🔴 BU BÖLMƏNİN ƏSAS PROBLEMİ: OXU İLƏ YAZI SİMMETRİK DEYİL.
//
// `buildProfileView()` 7 əlaqə sahəsini DÜZLƏNDİRİR: `interests` oxu tərəfində
// sadəcə `string[]`-dir. Yazı tərəfində isə həmin siyahı `UserTag` SƏTİRLƏRİDİR
// (`Tag` + `UserTag`), `clubs` isə `ClubMembership`. Yəni "maraq əlavə etmək"
// = sətir yaratmaq, "çıxarmaq" = sətir silmək. Fərq `lib/relation-diff.ts`-də
// SAF funksiya kimi hesablanır (testlə örtülü), burada yalnız tətbiq olunur.
//
// ⚠️ QƏRAR — İSTİFADƏÇİ YENİ `Tag` YARATMIR, yalnız mövcud kataloqdan seçir.
// Səbəb: `Tag.slug` `@@unique([type, slug])`-dur və sərbəst mətn qəbul etsək
// kataloq bir həftəyə "AI" / "ai" / "Süni intellekt" dublikatları ilə dolar.
// Bu, üç yeri eyni anda sındırır:
//   1. kataloq filtri (`?interest=ai` başqa, `?interest=suni-intellekt` başqa
//      nəticə verir — istifadəçi sinif yoldaşını tapa bilmir);
//   2. facet sayları (eyni maraq iki xanaya bölünür);
//   3. "Tanışlıq kartları" (ortaq maraq kəsişməsi boşalır).
// Taq kataloqunun idarəsi ADMİN işidir (Blok 11). Kataloqda olmayan taq
// göndərilsə `UNKNOWN_TAG` qaytarılır — səssizcə yaradılmır.

/** `/me/edit` formasının taq seçicisini dolduran kataloq sətri. */
export interface TagCatalogEntry {
  id: string;
  type: string;
  name: string;
  slug: string;
}

/** `/me/edit` formasının klub seçicisini dolduran kataloq sətri. */
export interface ClubCatalogEntry {
  id: string;
  name: string;
  slug: string;
  category: string | null;
}

/**
 * Taq kataloqu — 4 növ birlikdə, adına görə sıralanmış.
 *
 * Məxfilik şərti YOXDUR və olmamalıdır: bu, ORTAQ SÖZLÜKDÜR, kiminsə profil
 * məlumatı deyil. Kimin hansı taqı seçdiyi isə `interests` / `hobbies` /
 * `skills` / `languages` sahələrinin görünürlüyü ilə qorunur.
 */
export async function listTagCatalog(viewer: Viewer): Promise<TagCatalogEntry[]> {
  if (viewer.kind !== "USER") return [];

  return prisma.tag.findMany({
    select: { id: true, type: true, name: true, slug: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

/** Klub kataloqu — eyni məntiq: ortaq siyahı, şəxsi məlumat deyil. */
export async function listClubCatalog(viewer: Viewer): Promise<ClubCatalogEntry[]> {
  if (viewer.kind !== "USER") return [];

  return prisma.club.findMany({
    select: { id: true, name: true, slug: true, category: true },
    orderBy: { name: "asc" },
  });
}

/** `User` sütunu olan idarə olunan sahələr — formanın skalyar hissəsi. */
export type ScalarProfileField = (typeof SCALAR_PROFILE_FIELDS)[number];

export type ProfileScalars = Record<ScalarProfileField, string | null>;

/** Formanın klub sətri — rolu `MEMBER` olmayan üzvlük KİLİDLİDİR. */
export interface ProfileClubSelection {
  clubId: string;
  role: string;
}

/**
 * `/me/edit` formasının BAŞLANĞIC vəziyyəti.
 *
 * ⚠️ `redactProfile`-dan KEÇMİR və keçməməlidir: sahib öz məlumatını həmişə
 * tam görür. Sorğu yalnız `viewer.userId` üçün qurulur — kənar `userId`
 * arqumenti YOXDUR, yəni başqasının formasını açmaq mümkün deyil
 * (`getOnboardingProgress` ilə eyni nümunə).
 */
export interface ProfileDraft {
  scalars: ProfileScalars;
  /** Seçilmiş taqlar — `UserTag` sətirləri (dil taqlarında `level` dolu). */
  tags: UserTagState[];
  clubs: ProfileClubSelection[];
  visibility: FieldVisibilityMap;
}

export async function getProfileDraft(viewer: Viewer): Promise<ProfileDraft | null> {
  if (viewer.kind !== "USER") return null;

  const [user, visibility] = await Promise.all([
    prisma.user.findUnique({
      where: { id: viewer.userId },
      select: {
        avatarUrl: true,
        coverUrl: true,
        hometown: true,
        currentCity: true,
        currentCountry: true,
        phone: true,
        personalEmail: true,
        bio: true,
        learningGoals: true,
        askMeAbout: true,
        expectations: true,
        currentCompany: true,
        currentPosition: true,
        industry: true,
        futurePlans: true,
        tags: { select: { tagId: true, level: true } },
        clubMemberships: { select: { clubId: true, role: true } },
      },
    }),
    getFieldVisibility(viewer),
  ]);

  if (!user) return null;

  const { tags, clubMemberships, ...scalars } = user;

  return {
    scalars,
    tags,
    clubs: clubMemberships,
    visibility,
  };
}

export type UpdateProfileFailure =
  | VisibilityFailure
  | "NOT_FOUND"
  | "UNKNOWN_TAG"
  | "UNKNOWN_CLUB";

export type UpdateProfileResult = { ok: true } | { ok: false; reason: UpdateProfileFailure };

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  scalars: ProfileScalars;
  /** Formanın göndərdiyi SON taq dəsti (4 növ birlikdə). */
  tags: UserTagState[];
  /** Formanın göndərdiyi SON klub dəsti. */
  clubIds: string[];
  /** Hər idarə olunan sahə üçün seçilmiş səviyyə (dəyişməyənlər süzülür). */
  visibility: Array<{ field: string; level: string }>;
}

/**
 * Profilin TAM yenilənməsi — skalyar sahələr + əlaqələr + görünürlük,
 * **TƏK TRANSAKSİYADA**.
 *
 * Niyə tək transaksiya: istifadəçi bir "Yadda saxla" basır. Ayrı-ayrı yazsaq
 * yarımçıq nəticə mümkün olardı — məsələn maraqlar yazılır, görünürlük isə
 * yazılmır və sahə gözlənilməz səviyyədə qalır. Məxfilik sistemində yarımçıq
 * vəziyyət YOLVERİLMƏZDİR.
 *
 * ⚠️ `userId` MÜŞTƏRİDƏN GƏLMİR — `viewer`-dən götürülür.
 */
export async function updateProfile(
  viewer: Viewer,
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  if (viewer.kind !== "USER") return { ok: false, reason: "UNAUTHENTICATED" };
  const userId = viewer.userId;

  // --- 1. Görünürlük cütləri (sahə adı + səviyyə) ---
  const validated = validateVisibilityEntries(input.visibility);
  if (!validated.ok) return validated;

  // --- 2. Taqlar: kataloqda MÖVCUD olmalıdır (yeni `Tag` yaradılmır) ---
  const requestedTagIds = [...new Set(input.tags.map((tag) => tag.tagId))];
  const knownTags = await prisma.tag.findMany({
    where: { id: { in: requestedTagIds } },
    select: { id: true, type: true },
  });
  if (knownTags.length !== requestedTagIds.length) {
    return { ok: false, reason: "UNKNOWN_TAG" };
  }

  const tagTypeById = new Map(knownTags.map((tag) => [tag.id, tag.type]));

  // ⚠️ `UserTag.level` YALNIZ dil taqlarında məna daşıyır. Formadan səhvən
  // gəlsə belə burada kəsilir — əks halda "Futbol (B2)" kimi sətir yaranardı.
  const nextTags: UserTagState[] = input.tags.map((tag) => ({
    tagId: tag.tagId,
    level: tagTypeById.get(tag.tagId) === TagType.LANGUAGE ? tag.level : null,
  }));

  // --- 3. Klublar: mövcud olmalıdır ---
  const requestedClubIds = [...new Set(input.clubIds)];
  const knownClubCount = await prisma.club.count({
    where: { id: { in: requestedClubIds } },
  });
  if (knownClubCount !== requestedClubIds.length) {
    return { ok: false, reason: "UNKNOWN_CLUB" };
  }

  // --- 4. Cari vəziyyət → fərq ---
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tags: { select: { tagId: true, level: true } },
      clubMemberships: { select: { clubId: true, role: true } },
      fieldVisibility: { select: { field: true, level: true } },
    },
  });
  if (!current) return { ok: false, reason: "NOT_FOUND" };

  const tagDiff = diffUserTags(current.tags, nextTags);

  // Klub rəhbərliyi rolu (BOARD / PRESIDENT) profil formasından ATILA BİLMƏZ —
  // `diffIdSet`-in `keep` siyahısı bunu server tərəfdə təmin edir.
  const protectedClubIds = current.clubMemberships
    .filter((membership) => membership.role !== ClubRole.MEMBER)
    .map((membership) => membership.clubId);

  const clubDiff = diffIdSet(
    current.clubMemberships.map((membership) => membership.clubId),
    requestedClubIds,
    protectedClubIds,
  );

  // Effektiv cari səviyyələr: DB sətri yoxdursa `defaultLevelFor` (yəni
  // toxunulmamış `phone` üçün `PRIVATE`) — bax `changedVisibility` şərhi.
  const currentLevels: Record<string, string> = Object.fromEntries(
    CONTROLLED_PROFILE_FIELDS.map((field) => [field, defaultLevelFor(field)]),
  );
  for (const row of current.fieldVisibility) currentLevels[row.field] = row.level;

  const visibilityChanges = changedVisibility(currentLevels, validated.value);

  // --- 5. TƏK TRANSAKSİYA ---
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        ...input.scalars,
      },
    });

    if (tagDiff.removedTagIds.length > 0) {
      await tx.userTag.deleteMany({
        where: { userId, tagId: { in: tagDiff.removedTagIds } },
      });
    }

    if (tagDiff.created.length > 0) {
      await tx.userTag.createMany({
        data: tagDiff.created.map((tag) => ({ userId, ...tag })),
      });
    }

    for (const tag of tagDiff.updated) {
      await tx.userTag.update({
        where: { userId_tagId: { userId, tagId: tag.tagId } },
        data: { level: tag.level },
      });
    }

    if (clubDiff.removed.length > 0) {
      await tx.clubMembership.deleteMany({
        // ⚠️ İKİNCİ qat: `keep` siyahısından yayınan sətir olsa belə
        // `role: MEMBER` şərti rəhbərlik üzvlüyünü qoruyur.
        where: { userId, clubId: { in: clubDiff.removed }, role: ClubRole.MEMBER },
      });
    }

    if (clubDiff.added.length > 0) {
      await tx.clubMembership.createMany({
        data: clubDiff.added.map((clubId) => ({
          userId,
          clubId,
          role: ClubRole.MEMBER,
        })),
      });
    }

    for (const entry of visibilityChanges) {
      await tx.fieldVisibility.upsert({
        where: { userId_field: { userId, field: entry.field } },
        create: { userId, field: entry.field, level: entry.level },
        update: { level: entry.level },
      });
    }
  });

  return { ok: true };
}
