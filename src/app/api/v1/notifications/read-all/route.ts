// ============================================================================
// src/app/api/v1/notifications/read-all/route.ts
// POST /api/v1/notifications/read-all — hamısını oxunmuş işarələ.
//
// 🔴 `requireJson` MƏCBURİDİR (9S-in TƏLƏ B qoruması) — yazma əməliyyatıdır.
//
// 🔴 ƏHATƏ DAİRƏSİ SAHİBİN OXUNMAMIŞLARIDIR: servis `where`-i
// `recipientId = viewer.userId` + `readAt: null`-dır. "Hamısı" heç bir halda
// başqasının sətrini əhatə etmir.
//
// ⚠️ `changed: 0` XƏTA DEYİL — oxunmamış bildiriş yox idi. 404 qaytarsaydıq
// müştəri boş növbəni səhv kimi göstərərdi.
//
// ⚠️ Yol `/{id}/read`-dən ƏVVƏL uyğun gəlmir: Next.js statik seqmenti
// (`read-all`) dinamikdən (`[id]`) üstün tutur, yəni `/notifications/read-all`
// heç vaxt `id = "read-all"` kimi oxunmur.
// ============================================================================

import { requireJson, withUser } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { markAllNotificationsRead } from "@/services/notification.service";

export const dynamic = "force-dynamic";

export const POST = withUser(async ({ request, viewer }) => {
  const contentTypeError = requireJson(request);
  if (contentTypeError) return contentTypeError;

  const { changed } = await markAllNotificationsRead(viewer);

  return ok({ changed });
});
