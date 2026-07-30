// ============================================================================
// src/lib/notification-filters.ts
// Bildiriş mərkəzinin [M15] filtrləri və URL vəziyyəti — SAF modul.
//
// 🔴 BU FAYLDA SAHİBLİK QAYDASI YOXDUR və olmamalıdır.
// `recipientId = viewer.userId` şərti SERVİSDƏDİR (`notification.service.ts`).
// Filtr modulu URL ↔ obyekt çevirməsindən başqa heç nə bilmir — icazə məntiqi
// bura düşsəydi, filtri atlayan hər sorğu (məs. v1 endpoint-i) onu itirərdi.
//
// Üç filtr + səhifə:
//   status — `unread` | `read` (verilməzsə hamısı)
//   type   — 9 `NotificationType` dəyərindən biri
//   page   — 1-dən
// ============================================================================

import { NotificationTypeSchema, type NotificationType } from "@/lib/enums";

export const NOTIFICATION_PARAMS = {
  status: "status",
  type: "type",
  page: "page",
} as const;

export const NOTIFICATION_STATUS_VALUES = ["unread", "read"] as const;
export type NotificationStatusFilter = (typeof NOTIFICATION_STATUS_VALUES)[number];

export interface NotificationFilterState {
  status: NotificationStatusFilter | null;
  type: NotificationType | null;
  /** 1-dən başlayır. */
  page: number;
}

export const FIRST_NOTIFICATION_PAGE = 1;

/** Bir səhifədə göstərilən bildiriş sayı. */
export const NOTIFICATION_PAGE_SIZE = 20;

export function emptyNotificationFilters(): NotificationFilterState {
  return { status: null, type: null, page: FIRST_NOTIFICATION_PAGE };
}

/** Səhifə nömrəsi filtr sayılmır — «sıfırla» düyməsi onu da atır. */
export function activeNotificationFilterCount(filters: NotificationFilterState): number {
  return (filters.status === null ? 0 : 1) + (filters.type === null ? 0 : 1);
}

export function hasActiveNotificationFilters(filters: NotificationFilterState): boolean {
  return activeNotificationFilterCount(filters) > 0;
}

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------

export type NotificationSearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function firstText(input: NotificationSearchParamsInput, param: string): string | null {
  const raw = input instanceof URLSearchParams ? input.get(param) : input[param];
  const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  return value === undefined || value === "" ? null : value;
}

/** ⚠️ Naməlum dəyər 404 VERMİR — filtr səssizcə nəzərə alınmır. */
export function parseNotificationParams(
  input: NotificationSearchParamsInput,
): NotificationFilterState {
  const status = firstText(input, NOTIFICATION_PARAMS.status);
  const type = firstText(input, NOTIFICATION_PARAMS.type);
  const rawPage = firstText(input, NOTIFICATION_PARAMS.page);

  const parsedType = type === null ? null : NotificationTypeSchema.safeParse(type);
  const page = rawPage === null ? Number.NaN : Number.parseInt(rawPage, 10);

  return {
    status: (NOTIFICATION_STATUS_VALUES as readonly string[]).includes(status ?? "")
      ? (status as NotificationStatusFilter)
      : null,
    type: parsedType?.success ? parsedType.data : null,
    page:
      Number.isInteger(page) && page >= FIRST_NOTIFICATION_PAGE
        ? page
        : FIRST_NOTIFICATION_PAGE,
  };
}

// ---------------------------------------------------------------------------
// serialize
// ---------------------------------------------------------------------------

/** `parse(serialize(f))` → `f` (testlə bərkidilib). `page = 1` yazılmır. */
export function serializeNotificationParams(
  filters: NotificationFilterState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.status !== null) params.set(NOTIFICATION_PARAMS.status, filters.status);
  if (filters.type !== null) params.set(NOTIFICATION_PARAMS.type, filters.type);
  if (filters.page > FIRST_NOTIFICATION_PAGE) {
    params.set(NOTIFICATION_PARAMS.page, String(filters.page));
  }

  return params;
}

export const NOTIFICATIONS_PATH = "/notifications";

export function notificationsHref(
  filters: NotificationFilterState = emptyNotificationFilters(),
): string {
  const query = serializeNotificationParams(filters).toString();
  return query === "" ? NOTIFICATIONS_PATH : `${NOTIFICATIONS_PATH}?${query}`;
}

// ---------------------------------------------------------------------------
// Səhifələmə
// ---------------------------------------------------------------------------

export function notificationPageCount(
  total: number,
  pageSize = NOTIFICATION_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function notificationSkipOf(
  filters: NotificationFilterState,
  pageSize = NOTIFICATION_PAGE_SIZE,
): number {
  return (Math.max(filters.page, FIRST_NOTIFICATION_PAGE) - 1) * pageSize;
}
