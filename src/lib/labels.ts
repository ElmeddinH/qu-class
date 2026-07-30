// ============================================================================
// src/lib/labels.ts
// Enum dəyərlərinin azərbaycanca etiketləri — VAHİD MƏNBƏ (CLAUDE.md §9).
//
// 🔴 NİYƏ `lib/`-dədir (TƏLƏ T13 — etiket dublikatı):
// Blok 7-yə qədər EYNİ etiketlər İKİ yerdə saxlanılırdı —
// `features/profile/labels.ts` (INDUSTRY_LABELS, DEGREE_LABELS, …) və
// `features/class-home/catalog.ts` (INDUSTRY_META, DEGREE_META, …). İki cədvəl
// səssizcə ayrıldı: "Dövlət idarəçiliyi" ↔ "Dövlət sektoru". İstifadəçi eyni
// enum dəyərini iki səhifədə İKİ FƏRQLİ adla görürdü.
//
// `features/*` qovluqları BİR-BİRİNDƏN import etməməlidir (istiqamət həmişə
// features → lib / shared), ona görə vahid mənbə `lib/`-dədir. Bu fayl SAF-dır:
// Prisma, React və `features/*` importu YOXDUR — həm serverdə, həm client-də,
// həm də vahid testdə yüklənir.
//
// ⚠️ Hər cədvəl `Record<Enum, string>` tipindədir: `lib/enums.ts`-ə yeni dəyər
// əlavə olunsa `tsc` MƏHZ BURADA dayanır və etiket səssizcə çatmamış qalmır.
// Əhatə `src/lib/labels.test.ts`-də də yoxlanılır.
//
// ⚠️ DB sütunları `String`-dir (SQLite enum dəstəkləmir), yəni oxu tərəfində
// naməlum dəyər gələ bilər. Ona görə birbaşa indeksləmə əvəzinə `…Label()`
// köməkçiləri işlədilir — köhnə/naməlum dəyər UI-nı sındırmır.
// ============================================================================

import type {
  AchievementStatus,
  ClubRole,
  CohortRole,
  Degree,
  EventCategory,
  EventScope,
  EventStatus,
  FaqCategory,
  GuideCategory,
  Industry,
  JobFunction,
  LanguageLevel,
  RsvpStatus,
  SupportOfferType,
  TimelineSourceType,
  UserStage,
} from "@/lib/enums";

// ---------------------------------------------------------------------------
// Cədvəllər
// ---------------------------------------------------------------------------

/** Mərhələ adı. ⚠️ Mənbə `resolveStage(cohort)`-dur, `User.stage` keşi DEYİL. */
export const STAGE_LABELS: Record<UserStage, string> = {
  INCOMING: "Yeni qəbul",
  STUDENT: "Tələbə",
  ALUMNI: "Məzun",
};

/** `CohortMembership.role` — YALNIZ həmin sinif daxilində keçərlidir (spec §17). */
export const COHORT_ROLE_LABELS: Record<CohortRole, string> = {
  MEMBER: "Üzv",
  CLASS_REPRESENTATIVE: "Sinif nümayəndəsi",
  EVENT_COORDINATOR: "Tədbir koordinatoru",
  CLASS_MODERATOR: "Sinif moderatoru",
};

/** `ClubMembership.role` — cohort rolundan FƏRQLİDİR. */
export const CLUB_ROLE_LABELS: Record<ClubRole, string> = {
  MEMBER: "Üzv",
  BOARD: "İdarə heyəti",
  PRESIDENT: "Sədr",
};

/** `User.industry` / `CareerEntry.industry`. */
export const INDUSTRY_LABELS: Record<Industry, string> = {
  TECHNOLOGY: "Texnologiya",
  EDUCATION: "Təhsil",
  GOVERNMENT: "Dövlət sektoru",
  FINANCE: "Maliyyə",
  HEALTH: "Səhiyyə",
  ENERGY: "Enerji",
  CONSTRUCTION: "Tikinti",
  AGRICULTURE: "Kənd təsərrüfatı",
  MANUFACTURING: "İstehsalat",
  MEDIA: "Media",
  TOURISM: "Turizm",
  LOGISTICS: "Logistika",
  RETAIL: "Pərakəndə ticarət",
  LEGAL: "Hüquq",
  NGO: "QHT",
  OTHER: "Digər",
};

/**
 * `CareerEntry.jobFunction` — Blok 7B (GW analizi). `position`-un sərbəst
 * mətnindən FƏRQLİ, aqreqasiya üçün normallaşdırılmış rol.
 */
export const JOB_FUNCTION_LABELS: Record<JobFunction, string> = {
  ENGINEERING: "Mühəndislik",
  DATA: "Data",
  SECURITY: "Kibertəhlükəsizlik",
  PRODUCT: "Məhsul",
  FINANCE: "Maliyyə",
  MARKETING: "Marketinq",
  EDUCATION: "Təhsil",
  HEALTH: "Səhiyyə",
  RESEARCH: "Elmi tədqiqat",
  OPERATIONS: "Əməliyyatlar",
  LEGAL: "Hüquq",
  PUBLIC_SECTOR: "Dövlət sektoru",
  ENTREPRENEURSHIP: "Sahibkarlıq",
  OTHER: "Digər",
};

/** `EducationEntry.degree` (dördü də) və `Program.degree` (ilk üçü). */
export const DEGREE_LABELS: Record<Degree, string> = {
  BACHELOR: "Bakalavr",
  MASTER: "Magistr",
  PHD: "Doktorantura",
  CERTIFICATE: "Sertifikat",
};

/**
 * `UserTag.level` — yalnız `type = LANGUAGE` taqları üçün.
 * ⚠️ Etiketlər QISA saxlanılır: dil çipi profildə «İngilis dili (B2)» kimi
 * göstərilir, uzun izah çipi sıradan çıxarardı. İzahlı forma
 * `LANGUAGE_LEVEL_HINTS`-dədir və yalnız seçicidə işlədilir.
 */
export const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  A1: "A1",
  A2: "A2",
  B1: "B1",
  B2: "B2",
  C1: "C1",
  C2: "C2",
  NATIVE: "Ana dili",
};

/** Seçicidə göstərilən izahlı forma — «B2 — yuxarı orta». */
export const LANGUAGE_LEVEL_HINTS: Record<LanguageLevel, string> = {
  A1: "A1 — başlanğıc",
  A2: "A2 — ilkin",
  B1: "B1 — orta",
  B2: "B2 — yuxarı orta",
  C1: "C1 — irəli",
  C2: "C2 — mükəmməl",
  NATIVE: "Ana dili",
};

/**
 * `Achievement.status` — Blok 8 (moderasiya axını).
 *
 * ⚠️ `SUBMITTED` etiketi SAHİB üçün yazılıb: adi siyahıda başqasının
 * `SUBMITTED` nailiyyəti onsuz da görünmür (`visibleWithStatus` status filtrini
 * yalnız sahibə tətbiq etmir), yəni bu rozet praktikada "sənin nailiyyətin
 * növbədədir" deməkdir.
 */
export const ACHIEVEMENT_STATUS_LABELS: Record<AchievementStatus, string> = {
  SUBMITTED: "Təsdiq gözləyir",
  VERIFIED: "Təsdiqlənib",
  FEATURED: "Seçilmiş",
  ARCHIVED: "Arxivlənib",
};

/** `TimelineEntry.sourceType` — xronologiya filtrində mənbə növü. */
export const TIMELINE_SOURCE_LABELS: Record<TimelineSourceType, string> = {
  POST: "Paylaşım",
  ACHIEVEMENT: "Nailiyyət",
  EVENT: "Tədbir",
  SYSTEM: "Sistem hadisəsi",
};

/** `SupportOffer.type` — məzunun 7 dəstək təklifi (spec §9). */
export const SUPPORT_OFFER_LABELS: Record<SupportOfferType, string> = {
  GUEST_LECTURE: "Qonaq mühazirəsi",
  CAREER_TALK: "Karyera söhbəti",
  INTERNSHIP: "Təcrübə imkanı",
  JOB_SHARING: "İş elanı paylaşımı",
  MENTORING: "Mentorluq",
  STARTUP_COLLAB: "Startap əməkdaşlığı",
  EVENT_PARTICIPATION: "Tədbirdə iştirak",
};

// ---------------------------------------------------------------------------
// Events & Reunion (spec §14, §15)
//
// 🔴 `scope` və `category` ORTOQONALDIR — dəyər siyahıları qəsdən kəsişmir
// (bax `lib/enums.ts` §10). `scope` təşkilatçı SƏVİYYƏSİDİR (kim elan edir),
// `category` isə tədbirin NÖVÜDÜR (nə baş verir). Reunion YALNIZ
// `scope = REUNION` ilə işarələnir; `EventCategory`-də belə dəyər YOXDUR və
// əlavə EDİLMƏMƏLİDİR — filtr paneli iki ayrı süzgəc göstərir.
// ---------------------------------------------------------------------------

/** `Event.scope` — təşkilatçı səviyyəsi (spec §15 «təşkilatçı» filtri). */
export const EVENT_SCOPE_LABELS: Record<EventScope, string> = {
  UNIVERSITY: "Universitet",
  FACULTY: "Fakültə",
  CLUB: "Klub",
  CLASS: "Sinif",
  REUNION: "Məzunlar görüşü",
};

/** `Event.category` — tədbirin növü (spec §15 «kateqoriya» filtri). */
export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  MEETING: "Görüş",
  TRIP: "Səyahət",
  SEMINAR: "Seminar",
  WORKSHOP: "Praktikum",
  CEREMONY: "Mərasim",
  COMPETITION: "Yarış",
  SOCIAL: "Sosial tədbir",
  CAREER: "Karyera tədbiri",
  OTHER: "Digər",
};

/** `Event.status`. İctimai siyahılarda yalnız `PUBLISHED` / `COMPLETED` görünür. */
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Qaralama",
  PUBLISHED: "Elan olunub",
  CANCELLED: "Ləğv edilib",
  COMPLETED: "Tamamlanıb",
};

/** `EventRSVP.status` — dəvət → qəbul/rədd → qeydiyyat → iştirak axını. */
export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
  INVITED: "Dəvət olunub",
  ACCEPTED: "Qəbul edib",
  DECLINED: "Rədd edib",
  REGISTERED: "Qeydiyyatdan keçib",
  WAITLISTED: "Gözləmə siyahısında",
  ATTENDED: "İştirak edib",
  NO_SHOW: "Gəlməyib",
};

// ---------------------------------------------------------------------------
// Oxu köməkçiləri — naməlum dəyər UI-nı sındırmır
// ---------------------------------------------------------------------------

/**
 * Naməlum dəyəri etiketə çevirir: cədvəldə varsa tərcümə, yoxsa XAM dəyər.
 * `null` / boş sətir → `null` (çağıran tərəf sahəni ümumiyyətlə göstərmir).
 */
export function labelOf<T extends string>(
  labels: Record<T, string>,
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return (labels as Record<string, string>)[value] ?? value;
}

/**
 * ⚠️ Aşağıdaki dörd köməkçi `labelOf`-dan FƏRQLİ davranır: naməlum dəyəri xam
 * göstərmək əvəzinə TƏHLÜKƏSİZ DEFOLTA düşür. Səbəb sahənin mənasındadır —
 * "MEMBER" / "OTHER" mənalı ehtiyat dəyərdir, `"???"` isə kartda zibil kimi
 * görünərdi. `degreeLabel` bunun əksinədir: dərəcə üçün mənalı defolt yoxdur,
 * ona görə xam dəyər saxlanılır.
 */
export function stageLabel(value: string): string {
  return STAGE_LABELS[value as UserStage] ?? STAGE_LABELS.STUDENT;
}

export function cohortRoleLabel(value: string): string {
  return COHORT_ROLE_LABELS[value as CohortRole] ?? COHORT_ROLE_LABELS.MEMBER;
}

export function clubRoleLabel(value: string): string {
  return CLUB_ROLE_LABELS[value as ClubRole] ?? CLUB_ROLE_LABELS.MEMBER;
}

export function industryLabel(value: string): string {
  return INDUSTRY_LABELS[value as Industry] ?? INDUSTRY_LABELS.OTHER;
}

export function jobFunctionLabel(value: string): string {
  return JOB_FUNCTION_LABELS[value as JobFunction] ?? JOB_FUNCTION_LABELS.OTHER;
}

export function degreeLabel(value: string): string {
  return labelOf(DEGREE_LABELS, value) ?? value;
}

export function languageLevelLabel(value: string | null | undefined): string | null {
  return labelOf(LANGUAGE_LEVEL_LABELS, value);
}

export function supportOfferLabel(value: string): string {
  return SUPPORT_OFFER_LABELS[value as SupportOfferType] ?? "Dəstək";
}

export function achievementStatusLabel(value: string): string {
  return ACHIEVEMENT_STATUS_LABELS[value as AchievementStatus] ?? value;
}

export function timelineSourceLabel(value: string): string {
  return TIMELINE_SOURCE_LABELS[value as TimelineSourceType] ?? value;
}

export function eventScopeLabel(value: string): string {
  return EVENT_SCOPE_LABELS[value as EventScope] ?? value;
}

export function eventCategoryLabel(value: string): string {
  return EVENT_CATEGORY_LABELS[value as EventCategory] ?? EVENT_CATEGORY_LABELS.OTHER;
}

export function eventStatusLabel(value: string): string {
  return EVENT_STATUS_LABELS[value as EventStatus] ?? value;
}

export function rsvpStatusLabel(value: string): string {
  return RSVP_STATUS_LABELS[value as RsvpStatus] ?? value;
}

// ---------------------------------------------------------------------------
// İctimai məzmun — Welcome Page (spec §2) & Xankəndi bələdçisi (spec §3)
// ---------------------------------------------------------------------------

/** `Faq.category` — açılış səhifəsinin akkordeon rozetləri. */
export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  GENERAL: "Ümumi",
  ADMISSION: "Qəbul",
  CAMPUS: "Kampus",
  PLATFORM: "Platforma",
};

/**
 * `GuidePlace.category` — Xankəndi bələdçisinin 11 kateqoriyası (spec §3).
 *
 * ⚠️ Sxemdəki şərh spec-in 10 bəndini 11 dəyərə açır: "marketlər və gündəlik
 * xidmətlər" ikiyə (`MARKET` / `SERVICE`), "mədəniyyət və istirahət" ikiyə
 * (`CULTURE` / `LEISURE`) bölünüb; "xəritə" isə kateqoriya deyil, GÖRÜNÜŞDÜR.
 */
export const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = {
  HISTORY: "Tarix",
  LANDMARK: "Görməli yerlər",
  TRANSPORT: "İctimai nəqliyyat",
  ROUTE_TO_UNI: "Universitetə gediş",
  MARKET: "Marketlər",
  SERVICE: "Gündəlik xidmətlər",
  HEALTH: "Sağlamlıq",
  CULTURE: "Mədəniyyət",
  LEISURE: "İstirahət",
  SAFETY: "Təhlükəsizlik",
  TIP: "Məsləhətlər",
};

export function faqCategoryLabel(value: string): string {
  return FAQ_CATEGORY_LABELS[value as FaqCategory] ?? FAQ_CATEGORY_LABELS.GENERAL;
}

export function guideCategoryLabel(value: string): string {
  return GUIDE_CATEGORY_LABELS[value as GuideCategory] ?? value;
}
