// ============================================================================
// src/app/api/v1/events/[id]/route.ts
// GET /api/v1/events/{id} — tədbir detalı.
//
// ⚠️ `withViewer` (anonim ola bilər), `withUser` YOX: `PUBLIC` tədbir giriş
// etməmiş ziyarətçiyə də açıqdır (açılış səhifəsinin "Qarşıdan gələn
// tədbirlər" bölməsi məhz onları göstərir). Görünürlük qərarı servisdədir:
// `getEvent` → `visibleWithStatus(viewer, PUBLIC_EVENT_STATUSES, "createdById")`.
//
// ⚠️ Görünməyən tədbir üçün 404 — 403 YOX. Anonim sorğu `CLASS` tədbirin
// MÖVCUDLUĞUNU da öyrənməməlidir.
//
// ⚠️ `getEvent` işlədilir, `getEventDetail` YOX: detal funksiyası iştirakçı
// avatarlarını və RSVP xülasəsini gətirir — onlar sinif daxili məlumatdır və
// ictimai endpoint-də lazım deyil.
// ============================================================================

import { withViewer } from "@/lib/api/guard";
import { notFound, ok } from "@/lib/api/respond";
import { getEvent } from "@/services/event.service";

export const dynamic = "force-dynamic";

export const GET = withViewer<{ id: string }>(async ({ viewer, params }) => {
  const event = await getEvent(viewer, params.id);
  if (!event) return notFound("Tədbir tapılmadı.");

  return ok(event);
});
