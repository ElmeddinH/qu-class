// ============================================================================
// src/services/cohort.service.ts
// Cohort (Class Page) sorğuları.
//
// CLAUDE.md §4: səhifə birbaşa `prisma.*` çağırmır — hər şey bu qatdan keçir
// və hər funksiya ilk arqument kimi `Viewer` alır.
//
// ⚠️ ÜZV SİYAHILARI ÜZVLƏRƏ AÇIQDIR, hamıya yox. `getCohortHeader` kataloq
// məlumatıdır (ad, il, üzv SAYI) və universitet daxilində açıqdır; `listNewMembers`
// / `listSimilarMembers` isə KİMLƏRİN üzv olduğunu göstərir və yalnız həmin
// sinfin üzvünə qaytarılır (`listDirectory` ilə eyni qayda). Hər sətir üstəlik
// `redactProfile`-dan keçir — ad-soyaddan başqa hər sahə sahə-səviyyə
// məxfilikdən asılıdır.
// ============================================================================

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { resolveStage } from "@/lib/stage";
import { TagType, Visibility, type UserStage } from "@/lib/enums";
import {
  redactProfile,
  type ProfileView,
  type Viewer,
} from "@/lib/visibility";
import type { ProfileLanguage } from "@/services/user.service";

// ---------------------------------------------------------------------------
// 1. Class Page başlığı
// ---------------------------------------------------------------------------

export interface CohortHeader {
  id: string;
  slug: string;
  displayName: string;
  admissionYear: number;
  graduationYear: number;
  welcomeMessage: string | null;
  coverUrl: string | null;
  facultyName: string | null;
  programName: string | null;
  /** Cohort tarixlərindən hesablanır — `User.stage` keşinə güvənilmir. */
  stage: UserStage;
  memberCount: number;
  /** Viewer bu cohort-un üzvüdürmü? */
  isMember: boolean;
  /**
   * Viewer-in bu cohort-dakı rolu (`CohortMembership.role`) — üzv deyilsə `null`.
   *
   * ⚠️ Bu, YALNIZ UI göstərmə qərarları üçündür ("Tədbir yarat" düyməsini
   * göstərək?). Əsl icazə yoxlaması hər zaman server tərəfdə
   * `requireCohortRole()` ilə aparılır — düyməni gizlətmək qoruma deyil.
   */
  viewerRole: string | null;
}

/**
 * Class Page başlığı üçün cohort məlumatı.
 *
 * Cohort kataloqu universitet daxilində açıqdır (ad, il, üzv sayı) —
 * məzmun səviyyəsində süzgəc (`visibilityWhere`) hər widget sorğusunda
 * ayrıca tətbiq olunur.
 */
export async function getCohortHeader(
  viewer: Viewer,
  slug: string,
): Promise<CohortHeader | null> {
  const cohort = await prisma.cohort.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      displayName: true,
      admissionYear: true,
      graduationYear: true,
      welcomeMessage: true,
      coverUrl: true,
      academicStartsAt: true,
      graduatesAt: true,
      faculty: { select: { name: true } },
      program: { select: { name: true } },
      _count: { select: { members: true } },
      // Viewer-in öz üzvlük sətri. ANONYMOUS üçün heç bir sətrə uyğun
      // gəlməyən şərt qurulur — ayrıca sorğu və `if` budağı lazım deyil.
      members: {
        where:
          viewer.kind === "USER" ? { userId: viewer.userId } : { userId: { in: [] } },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!cohort) return null;

  const membership = cohort.members[0] ?? null;

  return {
    id: cohort.id,
    slug: cohort.slug,
    displayName: cohort.displayName,
    admissionYear: cohort.admissionYear,
    graduationYear: cohort.graduationYear,
    welcomeMessage: cohort.welcomeMessage,
    coverUrl: cohort.coverUrl,
    facultyName: cohort.faculty?.name ?? null,
    programName: cohort.program?.name ?? null,
    stage: resolveStage(cohort),
    memberCount: cohort._count.members,
    isMember: membership !== null,
    viewerRole: membership?.role ?? null,
  };
}

// ---------------------------------------------------------------------------
// 1b. Viewer-in sinifləri — `/api/v1/cohorts` və naviqasiya
// ---------------------------------------------------------------------------

export interface ViewerCohort {
  id: string;
  slug: string;
  displayName: string;
  admissionYear: number;
  graduationYear: number;
  facultyName: string | null;
  programName: string | null;
  /** Cohort tarixlərindən hesablanır — `User.stage` keşinə güvənilmir. */
  stage: UserStage;
  /** Viewer-in bu sinifdəki rolu (`CohortMembership.role`). */
  role: string;
  isPrimary: boolean;
}

/**
 * Viewer-in ÜZV OLDUĞU siniflər.
 *
 * 🔴 `viewer.cohortIds` filtri ilə deyil, ÜZVLÜK ƏLAQƏSİ ilə sorğulanır: rol və
 * `isPrimary` onsuz da `CohortMembership` sətrindən gəlir və iki mənbəni
 * (`Viewer` massivi + DB sətri) uyğunlaşdırmağa ehtiyac qalmır.
 *
 * Anonim viewer üçün BOŞ massiv — 401 deyil. Səbəb: `/api/v1/cohorts` "mənim
 * siniflərim" sorğusudur və anonim üçün cavab təbii olaraq boşdur; endpoint
 * özü `withUser` ilə qorunur, bu funksiya isə müdafiənin ikinci qatıdır.
 */
export async function listViewerCohorts(viewer: Viewer): Promise<ViewerCohort[]> {
  if (viewer.kind !== "USER") return [];

  const memberships = await prisma.cohortMembership.findMany({
    where: { userId: viewer.userId },
    orderBy: [{ isPrimary: "desc" }, { joinedAt: "desc" }],
    select: {
      role: true,
      isPrimary: true,
      cohort: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          admissionYear: true,
          graduationYear: true,
          academicStartsAt: true,
          graduatesAt: true,
          faculty: { select: { name: true } },
          program: { select: { name: true } },
        },
      },
    },
  });

  return memberships.map((membership) => ({
    id: membership.cohort.id,
    slug: membership.cohort.slug,
    displayName: membership.cohort.displayName,
    admissionYear: membership.cohort.admissionYear,
    graduationYear: membership.cohort.graduationYear,
    facultyName: membership.cohort.faculty?.name ?? null,
    programName: membership.cohort.program?.name ?? null,
    stage: resolveStage(membership.cohort),
    role: membership.role,
    isPrimary: membership.isPrimary,
  }));
}

// ---------------------------------------------------------------------------
// 2. Üzv kartları — "Yeni üzvlər" və "Tanışlıq kartları" widget-ləri
// ---------------------------------------------------------------------------

/**
 * Üzv kartı üçün YÜNGÜL profil forması.
 *
 * `services/user.service.ts` → `DirectoryEntryView` ilə eyni ruhda, amma daha
 * dardır: kartda yalnız ad, şəkil, doğma şəhər, qısa bio və taqlar göstərilir.
 * `redactProfile` obyektdə OLMAYAN sahəni atladığı üçün bu, təhlükəsiz
 * istiqamətdə səhvdir — sahə çıxışda ümumiyyətlə görünmür.
 */
export interface CohortMemberView extends ProfileView {
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
  interests: string[];
  hobbies: string[];
  skills: string[];
  languages: ProfileLanguage[];
}

/** `redactProfile`-dan çıxan forma + üzvlük meta məlumatı. */
export type CohortMemberCard = Partial<CohortMemberView> &
  Pick<CohortMemberView, "id" | "firstName" | "lastName"> & {
    /** `CohortMembership.role` — məxfilikdən asılı deyil, struktur məlumatdır. */
    role: string;
    joinedAt: Date;
  };

const MEMBER_SELECT = {
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
  memberships: { select: { cohortId: true } },
  tags: { select: { level: true, tag: { select: { type: true, name: true } } } },
  fieldVisibility: { select: { field: true, level: true } },
} satisfies Prisma.UserSelect;

type MemberRow = Prisma.UserGetPayload<{ select: typeof MEMBER_SELECT }>;

function toMemberCard(
  row: MemberRow,
  viewer: Viewer,
  membership: { role: string; joinedAt: Date },
): CohortMemberCard {
  const tagsOfType = (type: string): string[] =>
    row.tags.filter((t) => t.tag.type === type).map((t) => t.tag.name);

  const view: CohortMemberView = {
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
    interests: tagsOfType(TagType.INTEREST),
    hobbies: tagsOfType(TagType.HOBBY),
    skills: tagsOfType(TagType.SKILL),
    languages: row.tags
      .filter((t) => t.tag.type === TagType.LANGUAGE)
      .map((t) => ({ name: t.tag.name, level: t.level })),
  };

  return {
    ...(redactProfile(view, viewer, row.fieldVisibility) as Partial<CohortMemberView> &
      Pick<CohortMemberView, "id" | "firstName" | "lastName">),
    role: membership.role,
    joinedAt: membership.joinedAt,
  };
}

/**
 * Viewer bu cohort-un üzvü deyilsə üzv siyahıları qaytarılmır.
 * Tip predikatıdır — `if (!canSeeRoster(...)) return []` -dən sonra `viewer`
 * `USER` variantına daralır və `viewer.userId` əlavə yoxlama tələb etmir.
 */
function canSeeRoster(
  viewer: Viewer,
  cohortId: string,
): viewer is Extract<Viewer, { kind: "USER" }> {
  return viewer.kind === "USER" && viewer.cohortIds.includes(cohortId);
}

const MEMBER_CARD_LIMIT = 8;

/**
 * Sinfə ən son qoşulanlar — "Yeni üzvlər" widget-i (spec §16 blok 9).
 * Viewer özü siyahıya düşmür: "yeni üzvlər" başqalarını tanıtmaq üçündür.
 */
export async function listNewMembers(
  viewer: Viewer,
  cohortId: string,
  take: number = MEMBER_CARD_LIMIT,
): Promise<CohortMemberCard[]> {
  if (!canSeeRoster(viewer, cohortId)) return [];

  const rows = await prisma.cohortMembership.findMany({
    where: { cohortId, userId: { not: viewer.userId } },
    orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
    take,
    select: {
      role: true,
      joinedAt: true,
      user: { select: MEMBER_SELECT },
    },
  });

  return rows.map((row) => toMemberCard(row.user, viewer, row));
}

// ---------------------------------------------------------------------------
// 3. Tanışlıq kartları — "sənin kimi maraqları olanlar" (Incoming)
// ---------------------------------------------------------------------------

/** Üzv kartı + viewer ilə ÜST-ÜSTƏ DÜŞƏN taqlar. */
export interface SimilarMemberCard extends CohortMemberCard {
  /**
   * Ortaq taqların adları.
   *
   * ⚠️ REDAKSİYADAN SONRA hesablanır: `redactProfile` gizlətdiyi sahəni
   * obyektdən silir, ona görə burada yalnız viewer-ə GÖRÜNƏN taqlar qala bilər.
   */
  sharedTags: string[];
}

/**
 * `Tag.type` → hansı profil sahəsi bu taqları göstərir.
 * Namizəd sorğusundakı məxfilik şərti bu xəritə ilə qurulur.
 */
const TAG_TYPE_FIELD = {
  INTEREST: "interests",
  HOBBY: "hobbies",
  SKILL: "skills",
  LANGUAGE: "languages",
} as const satisfies Record<string, string>;

/**
 * Namizəd hovuzunun həddi. Üst-üstə düşmə sayına görə sıralama SQLite-da tək
 * sorğu ilə mümkün deyil, ona görə məhdud hovuz çəkilir və çeşidləmə JS-də
 * aparılır (bax aşağıdakı qeyd).
 */
const SIMILAR_CANDIDATE_POOL = 60;

/**
 * "Sənin kimi maraqları olanlar" — Incoming tanışlıq kartları (spec §16).
 *
 * ÜÇ QAT süzgəc, üçü də DB-də:
 *   1. Sinif — yalnız həmin cohort-un üzvləri, viewer istisna olmaqla.
 *   2. Üst-üstə düşmə — ən azı bir ortaq `UserTag`.
 *   3. MƏXFİLİK — həmin taq növünü daşıyan profil sahəsi `PRIVATE` işarələnmiş
 *      istifadəçi namizəd OLMUR. Bu vacibdir: maraqlarını gizlədən adam
 *      "səninlə eyni maraqları var" siyahısında görünsəydi, gizlətdiyi
 *      məlumat dolayısı ilə sızardı.
 *      (`CLASS` və defolt səviyyə burada həmişə keçir — widget onsuz da yalnız
 *      sinif üzvünə göstərilir, yəni `sharesClass` doğrudur.)
 *
 * ⚠️ ÇEŞİDLƏMƏ JS-dədir, SÜZGƏC yox. CLAUDE.md §5 JS-də FİLTRLƏMƏNİ qadağan
 * edir (pagination sınır və sızma yaranır) — burada isə süzgəcin hamısı DB-də
 * qalır, JS yalnız artıq görünən hovuzu ortaq taq sayına görə sıralayır.
 * Widget səhifələnmir, ona görə sərhəd sürüşməsi problemi yoxdur.
 */
export async function listSimilarMembers(
  viewer: Viewer,
  cohortId: string,
  take: number = 6,
): Promise<SimilarMemberCard[]> {
  if (!canSeeRoster(viewer, cohortId)) return [];

  // Viewer-in öz taqları — taq növünə görə qruplaşdırılır, çünki məxfilik
  // şərti növ başına fərqli profil sahəsinə baxır.
  const ownTags = await prisma.userTag.findMany({
    where: { userId: viewer.userId },
    select: { tagId: true, tag: { select: { type: true, name: true } } },
  });

  if (ownTags.length === 0) return [];

  const ownTagNames = new Set(ownTags.map((t) => t.tag.name));

  const overlapConditions: Prisma.UserWhereInput[] = [];

  for (const [type, field] of Object.entries(TAG_TYPE_FIELD)) {
    const tagIds = ownTags.filter((t) => t.tag.type === type).map((t) => t.tagId);
    if (tagIds.length === 0) continue;

    overlapConditions.push({
      AND: [
        { tags: { some: { tagId: { in: tagIds } } } },
        // Sahəsini PRIVATE edən istifadəçi namizəd deyil (fail closed).
        { fieldVisibility: { none: { field, level: Visibility.PRIVATE } } },
      ],
    });
  }

  if (overlapConditions.length === 0) return [];

  const candidates = await prisma.cohortMembership.findMany({
    where: {
      cohortId,
      userId: { not: viewer.userId },
      user: { OR: overlapConditions },
    },
    orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
    take: SIMILAR_CANDIDATE_POOL,
    select: {
      role: true,
      joinedAt: true,
      user: { select: MEMBER_SELECT },
    },
  });

  return candidates
    .map((row) => {
      const card = toMemberCard(row.user, viewer, row);

      // Redaksiyadan SONRA qalan taqlar — gizlədilmiş sahə obyektdə yoxdur.
      const visibleTags = [
        ...(card.interests ?? []),
        ...(card.hobbies ?? []),
        ...(card.skills ?? []),
        ...(card.languages ?? []).map((language) => language.name),
      ];

      return {
        ...card,
        sharedTags: [...new Set(visibleTags.filter((name) => ownTagNames.has(name)))],
      };
    })
    .filter((card) => card.sharedTags.length > 0)
    .sort((a, b) => b.sharedTags.length - a.sharedTags.length)
    .slice(0, take);
}

// ---------------------------------------------------------------------------
// 4. Dəstək təklifləri — Alumni (spec §9)
// ---------------------------------------------------------------------------

export interface SupportOfferCard {
  user: Pick<CohortMemberCard, "id" | "firstName" | "lastName" | "avatarUrl">;
  /** `SupportOfferType` dəyərləri — UI-da rozet kimi göstərilir. */
  types: string[];
}

/**
 * Sinfin dəstək təklifləri.
 *
 * ⚠️ RAZILIQ QAPISI: `User.openToSupport`. `SupportOffer` sətrində `visibility`
 * sütunu YOXDUR, ona görə görünürlük mühərrikinin adi şərtləri buraya tətbiq
 * olunmur — razılıq açıq bayraqla verilir. Seed-də təkliflərin bir hissəsi
 * `openToSupport: false` olan istifadəçilərə aiddir və onlar QAYTARILMIR.
 *
 * Üstəlik siyahı yalnız sinif üzvünə açılır (`canSeeRoster`).
 */
export async function listSupportOffers(
  viewer: Viewer,
  cohortId: string,
  take: number = 6,
): Promise<SupportOfferCard[]> {
  if (!canSeeRoster(viewer, cohortId)) return [];

  const rows = await prisma.user.findMany({
    where: {
      openToSupport: true,
      memberships: { some: { cohortId } },
      supportOffers: { some: {} },
    },
    orderBy: [{ firstName: "asc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      supportOffers: { select: { type: true }, orderBy: { type: "asc" } },
      fieldVisibility: { select: { field: true, level: true } },
      memberships: { select: { cohortId: true } },
    },
  });

  return rows.map((row) => {
    // Avatar da idarə olunan sahədir — ad-soyaddan fərqli olaraq gizlədilə bilər.
    const redacted = redactProfile(
      {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        cohortIds: row.memberships.map((m) => m.cohortId),
        avatarUrl: row.avatarUrl,
      },
      viewer,
      row.fieldVisibility,
    );

    return {
      user: {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        avatarUrl: (redacted.avatarUrl as string | null | undefined) ?? null,
      },
      types: row.supportOffers.map((offer) => offer.type),
    };
  });
}
