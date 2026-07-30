// ============================================================================
// src/lib/event-filters.ts
// Sinif tədbirləri [M12] filtrlərinin TƏRİFİ və URL vəziyyəti (spec §15).
//
// 🔴 BU FAYL SAFDIR (Prisma / React / servis importu yoxdur) —
// `lib/timeline-filters.ts` və `lib/achievement-filters.ts` ilə eyni səbəbdən:
// parse ↔ serialize dövrəsi bazasız testlə bərkidilir, server komponenti,
// client (nuqs) və səhifələmə linkləri EYNİ parametr adlarını işlədir.
//
// 🔴 PARAMETR ADLARI `features/events/filter-state.ts` İLƏ EYNİ OLMALIDIR.
// Ayrılsalar filtr "işləyir, amma nəticə dəyişmir" olur (Blok 6-nın dərsi).
//
// ALTI FİLTR (spec §15) + səhifə:
//   when     — tarix: qarşıdan gələn / keçmiş / hamısı
//   category — tədbirin NÖVÜ (9 `EventCategory`)
//   scope    — TƏŞKİLATÇI səviyyəsi (5 `EventScope`)
//   faculty  — `Event.facultyId` (scope = FACULTY tədbirləri)
//   club     — `Event.clubId`
//   format   — onlayn / üzbəüz
//
// ⚠️ `scope` və `category` ORTOQONALDIR və İKİ AYRI süzgəcdir. Onları bir
// açılan siyahıda birləşdirmək cazibədar görünür (hər ikisi "tədbirin nəyisə"),
// amma dəyər siyahıları qəsdən kəsişmir: `REUNION` scope-dur, `CEREMONY`
// category-dir. Birləşdirilsə "Məzunlar görüşü + Mərasim" seçimi mümkünsüz
// olardı (bax `lib/enums.ts` §10 xəbərdarlığı).
// ============================================================================

import {
  EventCategorySchema,
  EventScopeSchema,
  type EventCategory,
  type EventScope,
} from "@/lib/enums";

export const EVENT_PARAMS = {
  when: "when",
  category: "category",
  scope: "scope",
  faculty: "faculty",
  club: "club",
  format: "format",
  page: "page",
} as const;

/**
 * «Tarix» filtri.
 *
 * Konkret tarix aralığı ƏVƏZİNƏ üç vəziyyət seçilib: tədbir siyahısında
 * istifadəçinin real sualı "nə vaxt olacaq / nə olub" formasındadır, iki
 * tarix seçici isə mobil ekranda filtr panelinin yarısını yeyir. `ALL`
 * variantı arxiv baxışını (məzun səhifəsi) mümkün edir.
 */
export const EVENT_WHEN_VALUES = ["UPCOMING", "PAST", "ALL"] as const;
export type EventWhen = (typeof EVENT_WHEN_VALUES)[number];

/** Onlayn / üzbəüz filtri — `Event.isOnline` sütununun UI qarşılığı. */
export const EVENT_FORMAT_VALUES = ["ONLINE", "IN_PERSON"] as const;
export type EventFormat = (typeof EVENT_FORMAT_VALUES)[number];

/**
 * Defolt «tarix» dəyəri.
 *
 * ⚠️ `UPCOMING`-dir və bu, digər beş filtrdən FƏRQLİ davranır: URL-də
 * parametr olmasa da süzgəc TƏTBİQ OLUNUR. Səbəb — tədbir siyahısının əsas
 * işi qarşıdan gələnləri göstərməkdir; seed-də 15 keçmiş / 10 gələcək tədbir
 * var, defolt `ALL` olsaydı səhifə keçmiş tədbirlərlə açılardı.
 * `serializeEventParams` buna görə `UPCOMING`-i URL-ə YAZMIR.
 */
export const DEFAULT_EVENT_WHEN: EventWhen = "UPCOMING";

export const FIRST_EVENT_PAGE = 1;

/** Bir səhifədə göstərilən tədbir sayı. */
export const EVENT_PAGE_SIZE = 12;

export interface EventFilterState {
  when: EventWhen;
  category: EventCategory | null;
  scope: EventScope | null;
  facultyId: string | null;
  clubId: string | null;
  format: EventFormat | null;
  page: number;
}

export function emptyEventFilters(): EventFilterState {
  return {
    when: DEFAULT_EVENT_WHEN,
    category: null,
    scope: null,
    facultyId: null,
    clubId: null,
    format: null,
    page: FIRST_EVENT_PAGE,
  };
}

/**
 * Aktiv (defoltdan fərqli) filtrlərin sayı — «sıfırla (N)» düyməsi üçün.
 * Səhifə nömrəsi filtr sayılmır.
 */
export function activeEventFilterCount(filters: EventFilterState): number {
  return (
    (filters.when === DEFAULT_EVENT_WHEN ? 0 : 1) +
    (filters.category === null ? 0 : 1) +
    (filters.scope === null ? 0 : 1) +
    (filters.facultyId === null ? 0 : 1) +
    (filters.clubId === null ? 0 : 1) +
    (filters.format === null ? 0 : 1)
  );
}

export function hasActiveEventFilters(filters: EventFilterState): boolean {
  return activeEventFilterCount(filters) > 0;
}

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------

export type EventSearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstText(input: EventSearchParamsInput, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

function oneOf<T extends string>(values: readonly T[], raw: string | null): T | null {
  return raw !== null && (values as readonly string[]).includes(raw) ? (raw as T) : null;
}

/**
 * URL → doğrulanmış filtr obyekti.
 *
 * ⚠️ Naməlum dəyər 404 VERMİR — filtr sadəcə nəzərə alınmır (xronologiya və
 * nailiyyət filtrləri ilə eyni yanaşma; URL əl ilə dəyişdirilə bilər).
 *
 * ⚠️ `facultyId` / `clubId` BURADA yalnız forma baxımından yoxlanılır (boş
 * deyil). MÖVCUDLUĞU və görünürlüyü DB sorğusunda həll olunur — naməlum id
 * sadəcə boş nəticə verir, sızma yaratmır.
 */
export function parseEventParams(input: EventSearchParamsInput): EventFilterState {
  const category = firstText(input, EVENT_PARAMS.category);
  const scope = firstText(input, EVENT_PARAMS.scope);
  const parsedCategory = category === null ? null : EventCategorySchema.safeParse(category);
  const parsedScope = scope === null ? null : EventScopeSchema.safeParse(scope);

  const rawPage = firstText(input, EVENT_PARAMS.page);
  const page = rawPage === null ? Number.NaN : Number.parseInt(rawPage, 10);

  return {
    when: oneOf(EVENT_WHEN_VALUES, firstText(input, EVENT_PARAMS.when)) ?? DEFAULT_EVENT_WHEN,
    category: parsedCategory?.success ? parsedCategory.data : null,
    scope: parsedScope?.success ? parsedScope.data : null,
    facultyId: firstText(input, EVENT_PARAMS.faculty),
    clubId: firstText(input, EVENT_PARAMS.club),
    format: oneOf(EVENT_FORMAT_VALUES, firstText(input, EVENT_PARAMS.format)),
    page: Number.isInteger(page) && page >= FIRST_EVENT_PAGE ? page : FIRST_EVENT_PAGE,
  };
}

// ---------------------------------------------------------------------------
// serialize
// ---------------------------------------------------------------------------

/**
 * Paylaşıla bilən sorğu sətri. `parse(serialize(f))` → `f` (testlə bərkidilib).
 * Defolt dəyərlər (`when = UPCOMING`, `page = 1`) yazılmır — link təmiz qalır.
 */
export function serializeEventParams(filters: EventFilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.when !== DEFAULT_EVENT_WHEN) params.set(EVENT_PARAMS.when, filters.when);
  if (filters.category !== null) params.set(EVENT_PARAMS.category, filters.category);
  if (filters.scope !== null) params.set(EVENT_PARAMS.scope, filters.scope);
  if (filters.facultyId !== null) params.set(EVENT_PARAMS.faculty, filters.facultyId);
  if (filters.clubId !== null) params.set(EVENT_PARAMS.club, filters.clubId);
  if (filters.format !== null) params.set(EVENT_PARAMS.format, filters.format);
  if (filters.page > FIRST_EVENT_PAGE) params.set(EVENT_PARAMS.page, String(filters.page));

  return params;
}

/** `?a=b` — boşsa boş sətir (URL "?" ilə bitməsin). */
export function eventQueryString(filters: EventFilterState): string {
  const query = serializeEventParams(filters).toString();
  return query === "" ? "" : `?${query}`;
}

export function classEventsHref(cohortSlug: string, filters: EventFilterState): string {
  return `/class/${cohortSlug}/events${eventQueryString(filters)}`;
}

// ---------------------------------------------------------------------------
// Səhifələmə
// ---------------------------------------------------------------------------

export function eventPageCount(total: number, pageSize = EVENT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function eventSkipOf(filters: EventFilterState, pageSize = EVENT_PAGE_SIZE): number {
  return (Math.max(filters.page, FIRST_EVENT_PAGE) - 1) * pageSize;
}

// ---------------------------------------------------------------------------
// Servis girişinə çevirmə
// ---------------------------------------------------------------------------

/**
 * `when` → `EventFilters.upcoming` (`services/event.service.ts`).
 *
 * `ALL` üçün `undefined` qaytarılır: servis `upcoming === undefined` olduqda
 * tarix şərti QURMUR (həm keçmiş, həm gələcək gəlir).
 */
export function upcomingFlagOf(when: EventWhen): boolean | undefined {
  if (when === "UPCOMING") return true;
  if (when === "PAST") return false;
  return undefined;
}

/** `format` → `Event.isOnline`. `null` (hamısı) üçün `undefined`. */
export function isOnlineFlagOf(format: EventFormat | null): boolean | undefined {
  if (format === "ONLINE") return true;
  if (format === "IN_PERSON") return false;
  return undefined;
}

// ============================================================================
// Koordinator panelinin iştirakçı cədvəli (KUDS §14) — AYRI URL vəziyyəti
// ============================================================================

/**
 * ⚠️ Parametr adları tədbir siyahısınınkından FƏRQLİDİR (`q` / `st` / `ap`).
 * İki cədvəl heç vaxt eyni səhifədə olmasa da, adların ayrılması linkin
 * hansı ekrana aid olduğunu açıq saxlayır və gələcəkdə birləşdirilsələr
 * toqquşma olmur.
 */
export const ATTENDEE_PARAMS = {
  search: "q",
  status: "st",
  page: "ap",
} as const;

export interface AttendeeFilterState {
  /** Ad / soyad / e-poçt axtarışı — SERVERDƏ tətbiq olunur. */
  search: string;
  /** `RsvpStatus` dəyəri; `null` = bütün statuslar. */
  status: string | null;
  page: number;
}

export function parseAttendeeParams(input: EventSearchParamsInput): AttendeeFilterState {
  const rawPage = firstText(input, ATTENDEE_PARAMS.page);
  const page = rawPage === null ? Number.NaN : Number.parseInt(rawPage, 10);

  return {
    search: firstText(input, ATTENDEE_PARAMS.search) ?? "",
    // Naməlum status 404 vermir — filtr sadəcə boş nəticə verir; dəyər
    // doğrulaması servisin `RsvpStatusSchema`-sındadır.
    status: firstText(input, ATTENDEE_PARAMS.status),
    page: Number.isInteger(page) && page >= FIRST_EVENT_PAGE ? page : FIRST_EVENT_PAGE,
  };
}
