// ============================================================================
// src/app/api/v1/events/[id]/route.ts
// GET    /api/v1/events/{id} — tədbir detalı.
// PATCH  /api/v1/events/{id} — QİSMƏN yeniləmə (Blok 14C).
// DELETE /api/v1/events/{id} — tədbiri ləğv edir (soft delete, Blok 14C).
//
// ⚠️ `withViewer` (anonim ola bilər), `withUser` YOX: `PUBLIC` tədbir giriş
// etməmiş ziyarətçiyə də açıqdır (açılış səhifəsinin "Qarşıdan gələn
// tədbirlər" bölməsi məhz onları göstərir). Görünürlük qərarı servisdədir:
// `getEvent` → `visibleWithStatus(viewer, PUBLIC_EVENT_STATUSES, "createdById")`.
//
// ⚠️ Görünməyən tədbir üçün 404 — 403 YOX. Anonim sorğu `CLASS` tədbirin
// MÖVCUDLUĞUNU da öyrənməməlidir.
//
// ⚠️ GET-də `getEvent` işlədilir, `getEventDetail` YOX: detal funksiyası
// iştirakçı avatarlarını və RSVP xülasəsini gətirir — onlar sinif daxili
// məlumatdır və ictimai endpoint-də lazım deyil.
//
// 🔴 PATCH VƏ DELETE ƏVVƏLCƏ GÖRÜNÜRLÜK QAPISINDAN KEÇİR (14B şablonu).
// `updateEvent` / `deleteEvent` tədbiri `loadManageableEvent` ilə oxuyur və
// orada GÖRÜNÜRLÜK ŞƏRTİ YOXDUR — qəsdən, çünki koordinator öz `DRAFT`
// tədbirini də idarə etməlidir (bax `event.service.ts` → «iki icazə modeli»).
// Route birbaşa servisi çağırsaydı, başqa sinfin `CLASS` tədbiri üçün
// `FORBIDDEN` → 403 gələrdi və 403/404 fərqi MÖVCUDLUQ ORAKULU olardı. Ona
// görə hər iki metod əvvəlcə görünürlük funksiyasını (EYNİ `visibleWithStatus`
// şərti) çağırır və görünməyən tədbir üçün 404 verir; bundan sonrakı
// `FORBIDDEN` yalnız "tədbiri görürsən, amma idarə etmirsən" mənasını daşıyır.
//
// ⚠️ `requireJson` PATCH-dədir, DELETE-də YOX: gövdəsiz sorğuda 415 süni maneə
// olardı (brauzer `<form>`-u `DELETE` göndərə bilmir).
// ============================================================================

import { parseJsonBody, requireJson, withUser, withViewer } from "@/lib/api/guard";
import { failMutation } from "@/lib/api/mutation-result";
import { enforceWriteRate } from "@/lib/api/rate-limit";
import { noContent, notFound, ok } from "@/lib/api/respond";
import { UpdateEventBodySchema } from "@/lib/api/schemas";
import { mergeEventUpdateData } from "@/features/events/event-input";
import {
  deleteEvent,
  getEvent,
  getEventDetail,
  updateEvent,
} from "@/services/event.service";

export const dynamic = "force-dynamic";

/** Yazma sayğacının əhatəsi — sinif siyahısındaki POST ilə EYNİ büdcə. */
const WRITE_SCOPE = "events";

const NOT_FOUND_MESSAGE = "Tədbir tapılmadı.";

export const GET = withViewer<{ id: string }>(async ({ viewer, params }) => {
  const event = await getEvent(viewer, params.id);
  if (!event) return notFound(NOT_FOUND_MESSAGE);

  return ok(event);
});

/**
 * Tədbirin QİSMƏN yenilənməsi.
 *
 * ⚠️ Göndərilməyən sahə DƏYİŞMİR. `updateEvent` sahələri TAM dəst kimi alır
 * (yaratma ilə eyni forma), ona görə cari dəyərlər `getEventDetail`-dən
 * oxunub gövdə ilə birləşdirilir (`mergeEventUpdateData`). Default qoysaydıq,
 * yalnız məkanı düzəldən müştəri proqramı və tutumu SƏSSİZCƏ silərdi.
 *
 * 🔴 `getEventDetail` HƏM GÖRÜNÜRLÜK QAPISIDIR, HƏM DƏ cari dəyərlərin
 * mənbəyi: `agenda` və əlaqələndirici yalnız orada var. Şərt `getEvent` ilə
 * EYNİ köməkçidəndir (`visibleWithStatus`) — ikinci məxfilik məntiqi yaranmır.
 *
 * ⚠️ İcazə qapısı SERVİSDƏDİR (`canManageEvent` + `EVENT_MANAGER_ROLES`).
 * Tədbiri görən, amma idarə etməyən üzv 403 alır — mövcudluq ona onsuz da
 * məlumdur.
 *
 * ⚠️ `scope = FACULTY` + fakültəsiz nəticə → `FACULTY_REQUIRED` → 422; bitmə
 * vaxtı başlamadan əvvəldirsə → `INVALID_DATES` → 422. Hər ikisi SERVİSİN
 * qərarıdır, route yalnız `reason`-u çevirir.
 */
export const PATCH = withUser<{ id: string }>(async ({ request, viewer, params }) => {
  const contentTypeError = requireJson(request);
  if (contentTypeError) return contentTypeError;

  const limited = enforceWriteRate(viewer.userId, WRITE_SCOPE);
  if (limited) return limited;

  // 🔴 GÖRÜNÜRLÜK QAPISI — fayl başlığındakı izaha bax.
  const current = await getEventDetail(viewer, params.id);
  if (!current) return notFound(NOT_FOUND_MESSAGE);

  const body = await parseJsonBody(UpdateEventBodySchema, request);
  if (!body.ok) return body.response;

  const result = await updateEvent(viewer, {
    eventId: params.id,
    ...mergeEventUpdateData(current, body.data),
  });

  if (!result.ok) return failMutation(result.reason);

  // Cavab YENİLƏNMİŞ resursdur — müştəri ikinci `GET` etməsin.
  const updated = await getEvent(viewer, params.id);
  if (!updated) return notFound(NOT_FOUND_MESSAGE);

  return ok(updated);
});

/**
 * Tədbiri silir.
 *
 * ⚠️ Servis `status = CANCELLED` yazır — `Event`-də `DELETED` statusu YOXDUR
 * (bax `event.service.ts` → `deleteEvent` izahı). Müştəri üçün nəticə eynidir:
 * tədbir ictimai siyahıdan və xronologiyadan çıxır, cavab 204-dür.
 *
 * ⚠️ İdempotent DEYİL: ikinci `DELETE` 404 verir.
 */
export const DELETE = withUser<{ id: string }>(async ({ viewer, params }) => {
  const limited = enforceWriteRate(viewer.userId, WRITE_SCOPE);
  if (limited) return limited;

  // 🔴 GÖRÜNÜRLÜK QAPISI — 403/404 orakulunu bağlayır (fayl başlığı).
  const current = await getEvent(viewer, params.id);
  if (!current) return notFound(NOT_FOUND_MESSAGE);

  const result = await deleteEvent(viewer, params.id);
  if (!result.ok) return failMutation(result.reason);

  return noContent();
});
