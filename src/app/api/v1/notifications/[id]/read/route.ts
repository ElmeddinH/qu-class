// ============================================================================
// src/app/api/v1/notifications/{id}/read/route.ts
// POST /api/v1/notifications/{id}/read — bildirişi oxunmuş işarələ.
//
// 🔴 `requireJson` MƏCBURİDİR (9S-in TƏLƏ B qoruması): yazma əməliyyatı
// `Content-Type: application/json` tələb edir. Brauzerin `<form>` elementi JSON
// göndərə bilmir, yəni sadə cross-site form POST-u kəsilir.
//
// 🔴 SAHİBLİK: servis `updateMany` ilə `recipientId = viewer.userId` şərtini
// tətbiq edir. Başqasının `id`-si göndərilsə `changed: 0` qayıdır və cavab
// 404-dür — "yoxdur" ilə "sənin deyil" QƏSDƏN ayırd edilmir.
//
// ⚠️ Gövdə OXUNMUR (əməliyyatın parametri yoxdur), amma `Content-Type` yenə də
// yoxlanılır — qoruma gövdənin məzmununda deyil, sorğunun formasındadır.
// ============================================================================

import { requireJson, withUser } from "@/lib/api/guard";
import { notFound, ok } from "@/lib/api/respond";
import { markNotificationRead } from "@/services/notification.service";

export const dynamic = "force-dynamic";

export const POST = withUser<{ id: string }>(async ({ request, viewer, params }) => {
  const contentTypeError = requireJson(request);
  if (contentTypeError) return contentTypeError;

  const { changed } = await markNotificationRead(viewer, params.id);

  if (changed === 0) {
    return notFound("Bildiriş tapılmadı və ya artıq oxunub.");
  }

  return ok({ changed });
});
