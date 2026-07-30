// ============================================================================
// src/app/api/v1/notifications/route.ts
// GET /api/v1/notifications — ÖZ bildirişləri, filtr + səhifələmə.
//
// 🔴 `withUser` — KUKA MƏCBURİDİR. Bildiriş anonim viewer üçün mövcud deyil
// (sahibi yoxdur), ona görə `withViewer` SƏHV olardı: cavab boş siyahı deyil,
// 401 JSON olmalıdır.
//
// 🔴 SAHİBLİK ŞƏRTİ SERVİSDƏDİR (`recipientId = viewer.userId`). Endpoint onu
// TƏKRAR YAZMIR və `recipientId` query parametri QƏBUL ETMİR — "başqasının
// bildirişlərini gör" sorğusu ifadə edilə bilməməlidir.
//
// ⚠️ Filtr parametrləri UI ilə EYNİ saf moduldan gəlir
// (`lib/notification-filters.ts`), yəni `/notifications?status=unread` veb
// səhifədə və API-də eyni nəticəni verir.
// ============================================================================

import { parseQuery, withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { NotificationsQuerySchema } from "@/lib/api/schemas";
import {
  NOTIFICATION_PAGE_SIZE,
  notificationSkipOf,
} from "@/lib/notification-filters";
import {
  countNotifications,
  listNotifications,
} from "@/services/notification.service";

export const dynamic = "force-dynamic";

export const GET = withUser(async ({ viewer, searchParams }) => {
  const query = parseQuery(NotificationsQuerySchema, searchParams);
  if (!query.ok) return query.response;

  const filters = {
    unread:
      query.data.status === undefined ? undefined : query.data.status === "unread",
    type: query.data.type,
  };

  const [items, total] = await Promise.all([
    listNotifications(viewer, {
      ...filters,
      take: NOTIFICATION_PAGE_SIZE,
      skip: notificationSkipOf({
        status: null,
        type: null,
        page: query.data.page,
      }),
    }),
    countNotifications(viewer, filters),
  ]);

  return ok(items, {
    meta: { total, page: query.data.page, pageSize: NOTIFICATION_PAGE_SIZE },
    // ⚠️ Bildiriş siyahısı ŞƏXSİDİR — ara keşlərə düşməməlidir (Blok 10B-dəki
    // "İndi haradayıq?" endpoint-i ilə eyni səbəb).
    headers: { "Cache-Control": "private, no-store" },
  });
});
