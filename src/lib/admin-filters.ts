// ============================================================================
// src/lib/admin-filters.ts
// Admin panelinin ÜÇ cədvəlinin URL vəziyyəti — SAF modul (Prisma / React yox).
//
// Üç filtr dəsti bir faylda saxlanılır, çünki üçü də EYNİ nümunəni izləyir
// (parse ↔ serialize ↔ href ↔ skip) və eyni səhifə parametrini paylaşır.
// Ayrı-ayrı fayllara bölmək üç dəfə eyni köməkçini yazmaq demək olardı.
//
//   · moderasiya növbəsi  → status · entityType · reason · page
//   · istifadəçi cədvəli  → q · role · stage · cohort · sort · page
//   · audit jurnalı       → actor · entityType · action · from · to · page
//
// ⚠️ Parametr adları QISADIR (`st`, `et`, `rs`): admin URL-ləri e-poçtla
// paylaşılır və uzun sorğu sətri kəsilə bilir. Adlar yalnız BURADA yazılır —
// server komponenti, client filtri və səhifələmə linki eyni sabitdən oxuyur.
// ============================================================================

import {
  AuditActionSchema,
  ReportEntityTypeSchema,
  ReportReasonSchema,
  ReportStatusSchema,
  SystemRoleSchema,
  UserStageSchema,
  type AuditAction,
  type ReportEntityType,
  type ReportReason,
  type ReportStatus,
  type SystemRole,
  type UserStage,
} from "@/lib/enums";

// ---------------------------------------------------------------------------
// Ortaq köməkçilər
// ---------------------------------------------------------------------------

export type AdminSearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export const FIRST_ADMIN_PAGE = 1;

function firstText(input: AdminSearchParamsInput, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

/** Naməlum dəyər 404 VERMİR — filtr sadəcə nəzərə alınmır (mövcud nümunə). */
function enumValue<T extends string>(
  input: AdminSearchParamsInput,
  param: string,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
): T | null {
  const raw = firstText(input, param);
  if (raw === null) return null;
  const parsed = schema.safeParse(raw);
  return parsed.success ? (parsed.data as T) : null;
}

function pageValue(input: AdminSearchParamsInput, param: string): number {
  const raw = firstText(input, param);
  const page = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isInteger(page) && page >= FIRST_ADMIN_PAGE ? page : FIRST_ADMIN_PAGE;
}

/** `YYYY-MM-DD` — başqa forma qəbul edilmir (filtr sakitcə düşür). */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dateValue(input: AdminSearchParamsInput, param: string): string | null {
  const raw = firstText(input, param);
  if (raw === null || !ISO_DATE.test(raw)) return null;
  return Number.isNaN(new Date(`${raw}T00:00:00.000Z`).getTime()) ? null : raw;
}

function queryString(params: URLSearchParams): string {
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

export function adminSkipOf(page: number, pageSize: number): number {
  return (Math.max(page, FIRST_ADMIN_PAGE) - 1) * pageSize;
}

export function adminPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

// ---------------------------------------------------------------------------
// 1. Moderasiya növbəsi
// ---------------------------------------------------------------------------

export const MODERATION_PARAMS = {
  status: "st",
  entityType: "et",
  reason: "rs",
  page: "page",
} as const;

export const MODERATION_PAGE_SIZE = 20;

export interface ModerationFilterState {
  status: ReportStatus | null;
  entityType: ReportEntityType | null;
  reason: ReportReason | null;
  page: number;
}

export function emptyModerationFilters(): ModerationFilterState {
  return { status: null, entityType: null, reason: null, page: FIRST_ADMIN_PAGE };
}

export function parseModerationParams(
  input: AdminSearchParamsInput,
): ModerationFilterState {
  return {
    status: enumValue<ReportStatus>(input, MODERATION_PARAMS.status, ReportStatusSchema),
    entityType: enumValue<ReportEntityType>(
      input,
      MODERATION_PARAMS.entityType,
      ReportEntityTypeSchema,
    ),
    reason: enumValue<ReportReason>(input, MODERATION_PARAMS.reason, ReportReasonSchema),
    page: pageValue(input, MODERATION_PARAMS.page),
  };
}

export function serializeModerationParams(
  filters: ModerationFilterState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status !== null) params.set(MODERATION_PARAMS.status, filters.status);
  if (filters.entityType !== null) {
    params.set(MODERATION_PARAMS.entityType, filters.entityType);
  }
  if (filters.reason !== null) params.set(MODERATION_PARAMS.reason, filters.reason);
  if (filters.page > FIRST_ADMIN_PAGE) {
    params.set(MODERATION_PARAMS.page, String(filters.page));
  }
  return params;
}

export function moderationHref(filters: ModerationFilterState): string {
  return `/admin/moderation${queryString(serializeModerationParams(filters))}`;
}

// ---------------------------------------------------------------------------
// 2. İstifadəçi cədvəli (KUDS §14: sorting · filtering · pagination · search)
// ---------------------------------------------------------------------------

export const ADMIN_USER_PARAMS = {
  q: "q",
  role: "role",
  stage: "stage",
  cohort: "cohort",
  sort: "sort",
  page: "page",
} as const;

export const ADMIN_USER_PAGE_SIZE = 25;

/** Çeşidləmə açarları — DB sütunlarına servisdə xəritələnir. */
export const ADMIN_USER_SORTS = ["name", "email", "recent", "stage"] as const;
export type AdminUserSort = (typeof ADMIN_USER_SORTS)[number];
export const DEFAULT_ADMIN_USER_SORT: AdminUserSort = "name";

export interface AdminUserFilterState {
  q: string | null;
  role: SystemRole | null;
  stage: UserStage | null;
  /** Cohort `slug`-ı — id deyil, çünki URL paylaşıla bilən olmalıdır. */
  cohort: string | null;
  sort: AdminUserSort;
  page: number;
}

export function emptyAdminUserFilters(): AdminUserFilterState {
  return {
    q: null,
    role: null,
    stage: null,
    cohort: null,
    sort: DEFAULT_ADMIN_USER_SORT,
    page: FIRST_ADMIN_PAGE,
  };
}

export function parseAdminUserParams(
  input: AdminSearchParamsInput,
): AdminUserFilterState {
  const sort = firstText(input, ADMIN_USER_PARAMS.sort);

  return {
    q: firstText(input, ADMIN_USER_PARAMS.q),
    role: enumValue<SystemRole>(input, ADMIN_USER_PARAMS.role, SystemRoleSchema),
    stage: enumValue<UserStage>(input, ADMIN_USER_PARAMS.stage, UserStageSchema),
    cohort: firstText(input, ADMIN_USER_PARAMS.cohort),
    sort:
      sort !== null && (ADMIN_USER_SORTS as readonly string[]).includes(sort)
        ? (sort as AdminUserSort)
        : DEFAULT_ADMIN_USER_SORT,
    page: pageValue(input, ADMIN_USER_PARAMS.page),
  };
}

export function serializeAdminUserParams(
  filters: AdminUserFilterState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q !== null) params.set(ADMIN_USER_PARAMS.q, filters.q);
  if (filters.role !== null) params.set(ADMIN_USER_PARAMS.role, filters.role);
  if (filters.stage !== null) params.set(ADMIN_USER_PARAMS.stage, filters.stage);
  if (filters.cohort !== null) params.set(ADMIN_USER_PARAMS.cohort, filters.cohort);
  if (filters.sort !== DEFAULT_ADMIN_USER_SORT) {
    params.set(ADMIN_USER_PARAMS.sort, filters.sort);
  }
  if (filters.page > FIRST_ADMIN_PAGE) {
    params.set(ADMIN_USER_PARAMS.page, String(filters.page));
  }
  return params;
}

export function adminUsersHref(filters: AdminUserFilterState): string {
  return `/admin/users${queryString(serializeAdminUserParams(filters))}`;
}

// ---------------------------------------------------------------------------
// 3. Audit jurnalı
// ---------------------------------------------------------------------------

export const AUDIT_PARAMS = {
  actor: "actor",
  entityType: "et",
  action: "ac",
  from: "from",
  to: "to",
  page: "page",
} as const;

export const AUDIT_PAGE_SIZE = 40;

export interface AuditFilterState {
  /** Aktyorun `id`-si — siyahı facet-dən seçilir. */
  actor: string | null;
  /**
   * ⚠️ `entityType` ENUM DEYİL, SƏRBƏST SƏTİRDİR.
   * `AuditLog.entityType` tarixən model adlarını daşıyır (`Post`, `Cohort`,
   * `CohortMembership`, `Report`, `Achievement`) və bəzi sətirlərdə enum
   * dəyəri (`ACHIEVEMENT`) var. Enum kimi doğrulasaydıq mövcud sətirlərin bir
   * hissəsi filtrdə GÖRÜNMƏZ olardı. Siyahı DB-dən facet kimi gəlir.
   */
  entityType: string | null;
  action: AuditAction | null;
  /** `YYYY-MM-DD` (daxil). */
  from: string | null;
  /** `YYYY-MM-DD` (daxil — servis gün sonuna qədər genişləndirir). */
  to: string | null;
  page: number;
}

export function emptyAuditFilters(): AuditFilterState {
  return {
    actor: null,
    entityType: null,
    action: null,
    from: null,
    to: null,
    page: FIRST_ADMIN_PAGE,
  };
}

export function parseAuditParams(input: AdminSearchParamsInput): AuditFilterState {
  return {
    actor: firstText(input, AUDIT_PARAMS.actor),
    entityType: firstText(input, AUDIT_PARAMS.entityType),
    action: enumValue<AuditAction>(input, AUDIT_PARAMS.action, AuditActionSchema),
    from: dateValue(input, AUDIT_PARAMS.from),
    to: dateValue(input, AUDIT_PARAMS.to),
    page: pageValue(input, AUDIT_PARAMS.page),
  };
}

export function serializeAuditParams(filters: AuditFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.actor !== null) params.set(AUDIT_PARAMS.actor, filters.actor);
  if (filters.entityType !== null) params.set(AUDIT_PARAMS.entityType, filters.entityType);
  if (filters.action !== null) params.set(AUDIT_PARAMS.action, filters.action);
  if (filters.from !== null) params.set(AUDIT_PARAMS.from, filters.from);
  if (filters.to !== null) params.set(AUDIT_PARAMS.to, filters.to);
  if (filters.page > FIRST_ADMIN_PAGE) params.set(AUDIT_PARAMS.page, String(filters.page));
  return params;
}

export function auditHref(filters: AuditFilterState): string {
  return `/admin/audit${queryString(serializeAuditParams(filters))}`;
}

/**
 * Tarix filtri → `[gte, lt)` aralığı.
 *
 * ⚠️ `to` GÜNÜN SONUNA qədər daxildir: istifadəçi "1 yanvar - 5 yanvar" yazanda
 * 5 yanvar saat 14:00-dakı sətri görməlidir. `lte: 2026-01-05T00:00` yazsaydıq
 * həmin gün demək olar tamamilə düşərdi — bu, sakit və tapılması çətin səhvdir.
 */
export function auditDateRange(filters: AuditFilterState): {
  gte?: Date;
  lt?: Date;
} {
  const range: { gte?: Date; lt?: Date } = {};

  if (filters.from !== null) range.gte = new Date(`${filters.from}T00:00:00.000Z`);
  if (filters.to !== null) {
    const next = new Date(`${filters.to}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    range.lt = next;
  }

  return range;
}
