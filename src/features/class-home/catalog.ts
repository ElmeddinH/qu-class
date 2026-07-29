// ============================================================================
// src/features/class-home/catalog.ts
// Class Page-ə MƏXSUS kataloq: mərhələ izahları və rol qaydaları.
//
// 🔴 TƏLƏ T13 (Blok 7-də ödənildi): enum ETİKETLƏRİ artıq burada YAŞAMIR.
// `INDUSTRY_META`, `DEGREE_META`, `COHORT_ROLE_META`, `SUPPORT_OFFER_META`
// `features/profile/labels.ts`-dəki eyni cədvəllərin DUBLİKATI idi və səssizcə
// ayrılmışdı ("Dövlət sektoru" ↔ "Dövlət idarəçiliyi"). Vahid mənbə indi
// `src/lib/labels.ts`-dir; bu fayl yalnız Class Page-ə aid olanı saxlayır:
//   · mərhələ İZAHI (etiket lib-dən gəlir)
//   · rol QAYDALARI (kim tədbir yarada bilər — etiket deyil, davranış)
// ============================================================================

import { CohortRole, UserStage, type CohortRole as CohortRoleType } from "@/lib/enums";
import { STAGE_LABELS } from "@/lib/labels";

export interface StageMeta {
  label: string;
  /** Başlıq altındakı bir sətirlik izah — səhifənin niyə belə göründüyünü deyir. */
  description: string;
}

/**
 * Mərhələ etiketi + izahı.
 * ⚠️ `label` `lib/labels.ts`-dən gəlir (T13) — burada TƏKRAR YAZILMIR.
 * ⚠️ Mənbə `resolveStage(cohort)`-dur, `User.stage` keşi DEYİL (PLAN.md §4.6).
 */
export const STAGE_META: Record<UserStage, StageMeta> = {
  INCOMING: {
    label: STAGE_LABELS.INCOMING,
    description: "Dərslər hələ başlamayıb — tanışlıq və kampusa hazırlıq vaxtıdır.",
  },
  STUDENT: {
    label: STAGE_LABELS.STUDENT,
    description: "Sinif aktiv tədris dövründədir.",
  },
  ALUMNI: {
    label: STAGE_LABELS.ALUMNI,
    description: "Sinif səhifəsi bağlanmır — əlaqə məzuniyyətdən sonra da davam edir.",
  },
};

// ---------------------------------------------------------------------------
// Cohort daxilindəki rollar (spec §17) — ETİKET yox, QAYDA
// ---------------------------------------------------------------------------

/** `MEMBER`-dən fərqli rol varsa kartda rozet göstərilir. */
export function isSpecialRole(value: string): boolean {
  return value !== CohortRole.MEMBER;
}

/**
 * Tədbir yarada bilən cohort rolları (spec §17).
 *
 * ⚠️ Bu, YALNIZ düymənin göstərilməsi üçündür. Əsl icazə server tərəfdə
 * `requireCohortRole()` ilə yoxlanılır — düyməni gizlətmək qoruma deyil.
 */
export const EVENT_CREATOR_ROLES: readonly CohortRoleType[] = [
  CohortRole.CLASS_REPRESENTATIVE,
  CohortRole.EVENT_COORDINATOR,
  CohortRole.CLASS_MODERATOR,
];

export function canCreateEvents(viewerRole: string | null): boolean {
  return viewerRole !== null && EVENT_CREATOR_ROLES.includes(viewerRole as CohortRoleType);
}
