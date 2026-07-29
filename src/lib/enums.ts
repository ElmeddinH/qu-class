// ============================================================================
// src/lib/enums.ts
// QU CLASS — bütün enum-ların VAHİD MƏNBƏYİ.
//
// SQLite native `enum` dəstəkləmir (bax: prisma/schema.prisma başlığı), buna
// görə sxemdə hər enum `String` sütunudur və doğrulama burada, Zod ilə olur.
//
// QAYDA (CLAUDE.md §6): kod içində sətir literal yazma —
//   ❌ if (post.status === "ACTIVE")
//   ✅ if (post.status === PostStatus.ACTIVE)   // və ya PostStatusSchema.parse(...)
//
// Hər enum üçün üç ixrac var:
//   POST_STATUS_VALUES  — `as const` massiv (UI-da dövr etmək, seed üçün)
//   PostStatusSchema    — Zod sxemi (form / API / DB girişini doğrulamaq üçün)
//   PostStatus          — çıxarılmış TypeScript tipi (+ eyni adlı sabit obyekt)
// ============================================================================

import { z } from "zod";
import {
  VISIBILITY_LEVELS,
  type SystemRole as SystemRoleType,
  type Visibility as VisibilityType,
} from "@/lib/visibility";

/**
 * `as const` massivdən açar=dəyər obyekti qurur ki, `PostStatus.ACTIVE` kimi
 * yazmaq mümkün olsun və sətir literalları koda yayılmasın.
 */
function asEnum<T extends readonly string[]>(values: T): { [K in T[number]]: K } {
  return Object.fromEntries(values.map((v) => [v, v])) as { [K in T[number]]: K };
}

// ============================================================================
// 1. Məxfilik və rollar
// ============================================================================

/**
 * Görünürlük səviyyələri. Mənbə `src/lib/visibility.ts`-dir — məxfilik
 * mühərriki ilə enum-ların bir-birindən ayrılmaması üçün burada yalnız
 * yenidən ixrac olunur, TƏKRAR TƏYİN OLUNMUR.
 */
export const VISIBILITY_VALUES = VISIBILITY_LEVELS;
export const VisibilitySchema = z.enum(VISIBILITY_VALUES);
export type Visibility = VisibilityType;
export const Visibility = asEnum(VISIBILITY_VALUES);

/** Sistem rolu — cohort daxilindəki roldan (CohortRole) FƏRQLİDİR. */
export const SYSTEM_ROLE_VALUES = [
  "USER",
  "UNIVERSITY_ADMIN",
] as const satisfies readonly SystemRoleType[];
export const SystemRoleSchema = z.enum(SYSTEM_ROLE_VALUES);
export type SystemRole = SystemRoleType;
export const SystemRole = asEnum(SYSTEM_ROLE_VALUES);

/**
 * İstifadəçinin həyat dövrü mərhələsi (User.stage).
 * ⚠️ `User.stage` yalnız keşdir. Həqiqət mənbəyi `resolveStage(cohort, now)`.
 */
export const USER_STAGE_VALUES = ["INCOMING", "STUDENT", "ALUMNI"] as const;
export const UserStageSchema = z.enum(USER_STAGE_VALUES);
export type UserStage = z.infer<typeof UserStageSchema>;
export const UserStage = asEnum(USER_STAGE_VALUES);

// ============================================================================
// 2. Akademik struktur & cohort
// ============================================================================

/** Cohort.scope — class page-in əhatə dairəsi. */
export const COHORT_SCOPE_VALUES = ["PROGRAM", "FACULTY", "UNIVERSITY"] as const;
export const CohortScopeSchema = z.enum(COHORT_SCOPE_VALUES);
export type CohortScope = z.infer<typeof CohortScopeSchema>;
export const CohortScope = asEnum(COHORT_SCOPE_VALUES);

/** CohortMembership.role — YALNIZ həmin cohort daxilində keçərlidir (spec §17). */
export const COHORT_ROLE_VALUES = [
  "MEMBER",
  "CLASS_REPRESENTATIVE",
  "EVENT_COORDINATOR",
  "CLASS_MODERATOR",
] as const;
export const CohortRoleSchema = z.enum(COHORT_ROLE_VALUES);
export type CohortRole = z.infer<typeof CohortRoleSchema>;
export const CohortRole = asEnum(COHORT_ROLE_VALUES);

/**
 * Təhsil dərəcəsi. `EducationEntry.degree` dördünü də qəbul edir;
 * `Program.degree` yalnız ilk üçünü (universitet proqramı sertifikat vermir).
 */
export const DEGREE_VALUES = ["BACHELOR", "MASTER", "PHD", "CERTIFICATE"] as const;
export const DegreeSchema = z.enum(DEGREE_VALUES);
export type Degree = z.infer<typeof DegreeSchema>;
export const Degree = asEnum(DEGREE_VALUES);

/** Program.degree — Degree-nin alt çoxluğu. */
export const PROGRAM_DEGREE_VALUES = ["BACHELOR", "MASTER", "PHD"] as const;
export const ProgramDegreeSchema = z.enum(PROGRAM_DEGREE_VALUES);
export type ProgramDegree = z.infer<typeof ProgramDegreeSchema>;

// ============================================================================
// 3. Taqlar
// ============================================================================

/** Tag.type — maraq / hobbi / bacarıq / dil. */
export const TAG_TYPE_VALUES = ["INTEREST", "HOBBY", "SKILL", "LANGUAGE"] as const;
export const TagTypeSchema = z.enum(TAG_TYPE_VALUES);
export type TagType = z.infer<typeof TagTypeSchema>;
export const TagType = asEnum(TAG_TYPE_VALUES);

/** UserTag.level — yalnız `type = LANGUAGE` taqları üçün doldurulur. */
export const LANGUAGE_LEVEL_VALUES = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "NATIVE",
] as const;
export const LanguageLevelSchema = z.enum(LANGUAGE_LEVEL_VALUES);
export type LanguageLevel = z.infer<typeof LanguageLevelSchema>;
export const LanguageLevel = asEnum(LANGUAGE_LEVEL_VALUES);

// ============================================================================
// 4. Class Feed (spec §6)
// ============================================================================

/** Post.category — 12 məcburi kateqoriya. */
export const POST_CATEGORY_VALUES = [
  "FIRST_DAY",
  "ORIENTATION",
  "EVENT_PHOTOS",
  "ACADEMIC_ACHIEVEMENT",
  "SOCIAL_ACHIEVEMENT",
  "TRIPS",
  "EXAM_PERIOD",
  "INTERNSHIP",
  "CLUB_ACTIVITY",
  "COMPETITION",
  "CAPSTONE",
  "GENERAL",
] as const;
export const PostCategorySchema = z.enum(POST_CATEGORY_VALUES);
export type PostCategory = z.infer<typeof PostCategorySchema>;
export const PostCategory = asEnum(POST_CATEGORY_VALUES);

/** Post.kind — məzmunun forması (kateqoriyadan FƏRQLİDİR). */
export const POST_KIND_VALUES = [
  "TEXT",
  "PHOTO",
  "ALBUM",
  "VIDEO",
  "LINK",
  "EVENT",
  "ACHIEVEMENT",
  "MEMORY",
] as const;
export const PostKindSchema = z.enum(POST_KIND_VALUES);
export type PostKind = z.infer<typeof PostKindSchema>;
export const PostKind = asEnum(POST_KIND_VALUES);

/**
 * Post.status.
 * ⚠️ `deletePost` soft delete edir → status `DELETED` olur, sətir qalır.
 * Feed sorğularında `activeVisibleWhere` yalnız `ACTIVE` gətirir.
 */
export const POST_STATUS_VALUES = [
  "ACTIVE",
  "PENDING_REVIEW",
  "HIDDEN",
  "DELETED",
] as const;
export const PostStatusSchema = z.enum(POST_STATUS_VALUES);
export type PostStatus = z.infer<typeof PostStatusSchema>;
export const PostStatus = asEnum(POST_STATUS_VALUES);

/** Comment.status və Memory.status üçün ümumi status dəsti. */
export const CONTENT_STATUS_VALUES = ["ACTIVE", "HIDDEN", "DELETED"] as const;
export const ContentStatusSchema = z.enum(CONTENT_STATUS_VALUES);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;
export const ContentStatus = asEnum(CONTENT_STATUS_VALUES);

/** MediaAsset.type */
export const MEDIA_TYPE_VALUES = ["IMAGE", "VIDEO", "FILE"] as const;
export const MediaTypeSchema = z.enum(MEDIA_TYPE_VALUES);
export type MediaType = z.infer<typeof MediaTypeSchema>;
export const MediaType = asEnum(MEDIA_TYPE_VALUES);

/** Reaction.type */
export const REACTION_TYPE_VALUES = [
  "LIKE",
  "CELEBRATE",
  "SUPPORT",
  "LOVE",
] as const;
export const ReactionTypeSchema = z.enum(REACTION_TYPE_VALUES);
export type ReactionType = z.infer<typeof ReactionTypeSchema>;
export const ReactionType = asEnum(REACTION_TYPE_VALUES);

// ============================================================================
// 5. Class Timeline (spec §10)
// ============================================================================

/** TimelineEntry.sourceType — Timeline əl ilə doldurulmur, törəmədir. */
export const TIMELINE_SOURCE_TYPE_VALUES = [
  "POST",
  "ACHIEVEMENT",
  "EVENT",
  "SYSTEM",
] as const;
export const TimelineSourceTypeSchema = z.enum(TIMELINE_SOURCE_TYPE_VALUES);
export type TimelineSourceType = z.infer<typeof TimelineSourceTypeSchema>;
export const TimelineSourceType = asEnum(TIMELINE_SOURCE_TYPE_VALUES);

// ============================================================================
// 6. Share Memories (spec §11)
// ============================================================================

/** Memory.type — 8 xatirə növü. */
export const MEMORY_TYPE_VALUES = [
  "SHORT_MEMORY",
  "UNIVERSITY_STORY",
  "THANKS_TEACHER",
  "THANKS_CLASSMATE",
  "UNFORGETTABLE_LESSON",
  "MEMORABLE_EVENT",
  "WHAT_UNI_GAVE_ME",
  "MESSAGE_TO_QU",
] as const;
export const MemoryTypeSchema = z.enum(MEMORY_TYPE_VALUES);
export type MemoryType = z.infer<typeof MemoryTypeSchema>;
export const MemoryType = asEnum(MEMORY_TYPE_VALUES);

// ============================================================================
// 7. Class Achievements (spec §12)
// ============================================================================

/** Achievement.category — 12 kateqoriya. */
export const ACHIEVEMENT_CATEGORY_VALUES = [
  "AWARD",
  "STARTUP",
  "PUBLICATION",
  "GRANT",
  "INTERNATIONAL_PROGRAM",
  "SPORTS",
  "VOLUNTEERING",
  "CAREER",
  "SOCIAL_PROJECT",
  "COMPETITION",
  "PATENT",
  "REPRESENTATION",
] as const;
export const AchievementCategorySchema = z.enum(ACHIEVEMENT_CATEGORY_VALUES);
export type AchievementCategory = z.infer<typeof AchievementCategorySchema>;
export const AchievementCategory = asEnum(ACHIEVEMENT_CATEGORY_VALUES);

/**
 * Achievement.status.
 * ⚠️ İctimai siyahılarda yalnız `VERIFIED` və `FEATURED` görünür —
 * `activeVisibleWhere` DEYİL, `visibleWithStatus(viewer, [...])` işlət.
 */
export const ACHIEVEMENT_STATUS_VALUES = [
  "SUBMITTED",
  "VERIFIED",
  "FEATURED",
  "ARCHIVED",
] as const;
export const AchievementStatusSchema = z.enum(ACHIEVEMENT_STATUS_VALUES);
export type AchievementStatus = z.infer<typeof AchievementStatusSchema>;
export const AchievementStatus = asEnum(ACHIEVEMENT_STATUS_VALUES);

/** İctimai görünən achievement statusları — `visibleWithStatus` üçün hazır dəst. */
export const PUBLIC_ACHIEVEMENT_STATUSES = ["VERIFIED", "FEATURED"] as const;

// ============================================================================
// 8. Where Are We Now (spec §13)
// ============================================================================

/**
 * CareerEntry.industry / User.industry.
 * Sxemdəki şərh açıq siyahı verir ("... | ..."); burada onu qapayırıq ki,
 * aqreqasiya (Where Are We Now qrafikləri) sabit xanalarla işləsin.
 * Yeni sənaye lazımdırsa BURAYA əlavə et, sətir literal yazma.
 */
export const INDUSTRY_VALUES = [
  "TECHNOLOGY",
  "EDUCATION",
  "GOVERNMENT",
  "FINANCE",
  "HEALTH",
  "ENERGY",
  "CONSTRUCTION",
  "AGRICULTURE",
  "MANUFACTURING",
  "MEDIA",
  "TOURISM",
  "LOGISTICS",
  "RETAIL",
  "LEGAL",
  "NGO",
  "OTHER",
] as const;
export const IndustrySchema = z.enum(INDUSTRY_VALUES);
export type Industry = z.infer<typeof IndustrySchema>;
export const Industry = asEnum(INDUSTRY_VALUES);

/** SupportOffer.type — alumni dəstək seçimləri (spec §9). */
export const SUPPORT_OFFER_TYPE_VALUES = [
  "GUEST_LECTURE",
  "CAREER_TALK",
  "INTERNSHIP",
  "JOB_SHARING",
  "MENTORING",
  "STARTUP_COLLAB",
  "EVENT_PARTICIPATION",
] as const;
export const SupportOfferTypeSchema = z.enum(SUPPORT_OFFER_TYPE_VALUES);
export type SupportOfferType = z.infer<typeof SupportOfferTypeSchema>;
export const SupportOfferType = asEnum(SUPPORT_OFFER_TYPE_VALUES);

// ============================================================================
// 9. Klublar
// ============================================================================

/** Club.category */
export const CLUB_CATEGORY_VALUES = [
  "ACADEMIC",
  "SPORTS",
  "ARTS",
  "SOCIAL",
  "TECH",
] as const;
export const ClubCategorySchema = z.enum(CLUB_CATEGORY_VALUES);
export type ClubCategory = z.infer<typeof ClubCategorySchema>;
export const ClubCategory = asEnum(CLUB_CATEGORY_VALUES);

/** ClubMembership.role */
export const CLUB_ROLE_VALUES = ["MEMBER", "BOARD", "PRESIDENT"] as const;
export const ClubRoleSchema = z.enum(CLUB_ROLE_VALUES);
export type ClubRole = z.infer<typeof ClubRoleSchema>;
export const ClubRole = asEnum(CLUB_ROLE_VALUES);

// ============================================================================
// 10. Events & Reunion (spec §14, §15)
// ============================================================================

/**
 * Event.scope — TƏŞKİLATÇI SƏVİYYƏSİ.
 * ⚠️ Reunion burada işarələnir (`REUNION`), EventCategory-də YOX.
 */
export const EVENT_SCOPE_VALUES = [
  "UNIVERSITY",
  "FACULTY",
  "CLUB",
  "CLASS",
  "REUNION",
] as const;
export const EventScopeSchema = z.enum(EVENT_SCOPE_VALUES);
export type EventScope = z.infer<typeof EventScopeSchema>;
export const EventScope = asEnum(EVENT_SCOPE_VALUES);

/**
 * Event.category — TƏDBİRİN NÖVÜ. `scope` ilə ortoqonaldır,
 * dəyər siyahıları qəsdən kəsişmir (Upcoming Events filtri, spec §15).
 */
export const EVENT_CATEGORY_VALUES = [
  "MEETING",
  "TRIP",
  "SEMINAR",
  "WORKSHOP",
  "CEREMONY",
  "COMPETITION",
  "SOCIAL",
  "CAREER",
  "OTHER",
] as const;
export const EventCategorySchema = z.enum(EVENT_CATEGORY_VALUES);
export type EventCategory = z.infer<typeof EventCategorySchema>;
export const EventCategory = asEnum(EVENT_CATEGORY_VALUES);

/**
 * Event.status.
 * ⚠️ İctimai siyahılarda `PUBLISHED` və `COMPLETED` görünür —
 * `visibleWithStatus(viewer, [...])` işlət, `activeVisibleWhere` deyil.
 */
export const EVENT_STATUS_VALUES = [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "COMPLETED",
] as const;
export const EventStatusSchema = z.enum(EVENT_STATUS_VALUES);
export type EventStatus = z.infer<typeof EventStatusSchema>;
export const EventStatus = asEnum(EVENT_STATUS_VALUES);

/** İctimai görünən tədbir statusları — `visibleWithStatus` üçün hazır dəst. */
export const PUBLIC_EVENT_STATUSES = ["PUBLISHED", "COMPLETED"] as const;

/** EventRSVP.status */
export const RSVP_STATUS_VALUES = [
  "INVITED",
  "ACCEPTED",
  "DECLINED",
  "REGISTERED",
  "WAITLISTED",
  "ATTENDED",
  "NO_SHOW",
] as const;
export const RsvpStatusSchema = z.enum(RSVP_STATUS_VALUES);
export type RsvpStatus = z.infer<typeof RsvpStatusSchema>;
export const RsvpStatus = asEnum(RSVP_STATUS_VALUES);

// ============================================================================
// 11. Bildirişlər (spec §15)
// ============================================================================

/** Notification.type */
export const NOTIFICATION_TYPE_VALUES = [
  "POST_LIKE",
  "POST_COMMENT",
  "NEW_MEMBER",
  "EVENT_INVITE",
  "EVENT_REMINDER",
  "ACHIEVEMENT_VERIFIED",
  "MODERATION_RESULT",
  "MENTION",
  "SYSTEM",
] as const;
export const NotificationTypeSchema = z.enum(NOTIFICATION_TYPE_VALUES);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export const NotificationType = asEnum(NOTIFICATION_TYPE_VALUES);

/** Notification.entityType — bildirişin işarə etdiyi obyekt növü. */
export const NOTIFICATION_ENTITY_TYPE_VALUES = [
  "POST",
  "EVENT",
  "ACHIEVEMENT",
  "USER",
] as const;
export const NotificationEntityTypeSchema = z.enum(NOTIFICATION_ENTITY_TYPE_VALUES);
export type NotificationEntityType = z.infer<typeof NotificationEntityTypeSchema>;
export const NotificationEntityType = asEnum(NOTIFICATION_ENTITY_TYPE_VALUES);

// ============================================================================
// 12. Moderasiya & administrasiya (spec §17)
// ============================================================================

/** Report.reason */
export const REPORT_REASON_VALUES = [
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE",
  "MISINFORMATION",
  "PRIVACY",
  "OTHER",
] as const;
export const ReportReasonSchema = z.enum(REPORT_REASON_VALUES);
export type ReportReason = z.infer<typeof ReportReasonSchema>;
export const ReportReason = asEnum(REPORT_REASON_VALUES);

/** Report.status */
export const REPORT_STATUS_VALUES = [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "REJECTED",
] as const;
export const ReportStatusSchema = z.enum(REPORT_STATUS_VALUES);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;
export const ReportStatus = asEnum(REPORT_STATUS_VALUES);

/** Report.entityType — şikayət edilə bilən obyekt növləri. */
export const REPORT_ENTITY_TYPE_VALUES = [
  "POST",
  "COMMENT",
  "MEMORY",
  "ACHIEVEMENT",
  "USER",
  "EVENT",
] as const;
export const ReportEntityTypeSchema = z.enum(REPORT_ENTITY_TYPE_VALUES);
export type ReportEntityType = z.infer<typeof ReportEntityTypeSchema>;
export const ReportEntityType = asEnum(REPORT_ENTITY_TYPE_VALUES);

/** AuditLog.action */
export const AUDIT_ACTION_VALUES = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "VERIFY",
  "MODERATE",
  "ROLE_CHANGE",
] as const;
export const AuditActionSchema = z.enum(AUDIT_ACTION_VALUES);
export type AuditAction = z.infer<typeof AuditActionSchema>;
export const AuditAction = asEnum(AUDIT_ACTION_VALUES);

// ============================================================================
// 13. İctimai məzmun — Welcome Page (spec §2) & Xankəndi Bələdçisi (spec §3)
// ============================================================================

/** ContentPage.section */
export const CONTENT_SECTION_VALUES = [
  "UNIVERSITY",
  "CAMPUS",
  "SERVICES",
  "NEWCOMERS",
] as const;
export const ContentSectionSchema = z.enum(CONTENT_SECTION_VALUES);
export type ContentSection = z.infer<typeof ContentSectionSchema>;
export const ContentSection = asEnum(CONTENT_SECTION_VALUES);

/** Faq.category */
export const FAQ_CATEGORY_VALUES = [
  "GENERAL",
  "ADMISSION",
  "CAMPUS",
  "PLATFORM",
] as const;
export const FaqCategorySchema = z.enum(FAQ_CATEGORY_VALUES);
export type FaqCategory = z.infer<typeof FaqCategorySchema>;
export const FaqCategory = asEnum(FAQ_CATEGORY_VALUES);

/** GuidePlace.category — Xankəndi bələdçisi, 11 kateqoriya. */
export const GUIDE_CATEGORY_VALUES = [
  "HISTORY",
  "LANDMARK",
  "TRANSPORT",
  "ROUTE_TO_UNI",
  "MARKET",
  "SERVICE",
  "HEALTH",
  "CULTURE",
  "LEISURE",
  "SAFETY",
  "TIP",
] as const;
export const GuideCategorySchema = z.enum(GUIDE_CATEGORY_VALUES);
export type GuideCategory = z.infer<typeof GuideCategorySchema>;
export const GuideCategory = asEnum(GUIDE_CATEGORY_VALUES);
