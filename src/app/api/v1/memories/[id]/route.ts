// ============================================================================
// src/app/api/v1/memories/[id]/route.ts
// GET    /api/v1/memories/{id} — tək xatirə.
// PATCH  /api/v1/memories/{id} — QİSMƏN yeniləmə.
// DELETE /api/v1/memories/{id} — soft delete.
//
// 🔴 MƏXFİLİK: GÖRÜNMƏYƏN XATİRƏ ÜÇÜN HƏR ÜÇ METOD 404 VERİR.
// `getMemory` → `visibleMemoryWhere(viewer)` → `activeVisibleWhere(viewer,
// "authorId")` + `status ≠ DELETED`. Route ƏLAVƏ filtr YAZMIR; şərt DB
// sorğusundadır və `null` gəlirsə cavab 404-dür.
//
// 🔴 PATCH VƏ DELETE NİYƏ ƏVVƏLCƏ `getMemory` ÇAĞIRIR (14B-nin əsas dərsi).
// `updateMemory` və `deleteMemory` xatirəni `findUnique({ where: { id } })` ilə
// oxuyur — orada GÖRÜNÜRLÜK ŞƏRTİ YOXDUR, çünki onların işi SAHİBLİK
// yoxlamaqdır. Birbaşa çağırsaydıq:
//     · olmayan id             → NOT_FOUND → 404
//     · başqa sinfin xatirəsi  → FORBIDDEN → 403
// və fərq MÖVCUDLUQ ORAKULU olardı. `getMemory` qapısı hər iki halı 404-də
// birləşdirir; ondan SONRA gələn `FORBIDDEN` təhlükəsizdir — "xatirəni
// görürsən, amma müəllifi deyilsən" (bax `lib/api/mutation-result.ts`).
//
// ⚠️ Bu, məxfilik məntiqinin TƏKRARI DEYİL: route öz `where` şərtini qurmur,
// MÖVCUD servis funksiyasını çağırır.
//
// ⚠️ `requireJson` PATCH-dədir, DELETE-də YOX: gövdəsiz sorğuda məzmun tipi
// qorumaya heç nə əlavə etmir (brauzer `<form>`-u `DELETE` göndərə bilmir).
// ============================================================================

import { parseJsonBody, requireJson, withUser, withViewer } from "@/lib/api/guard";
import { failMutation } from "@/lib/api/mutation-result";
import { enforceWriteRate } from "@/lib/api/rate-limit";
import { noContent, notFound, ok } from "@/lib/api/respond";
import { UpdateMemoryBodySchema } from "@/lib/api/schemas";
import { mergeMemoryWriteData } from "@/features/memories/memory-input";
import { deleteMemory, getMemory, updateMemory } from "@/services/memory.service";

export const dynamic = "force-dynamic";

/** Yazma sayğacının əhatəsi — sinif siyahısındaki POST ilə EYNİ büdcə. */
const WRITE_SCOPE = "memories";

const NOT_FOUND_MESSAGE = "Xatirə tapılmadı.";

/**
 * Tək xatirə.
 *
 * ⚠️ `withViewer` (anonim ola bilər), `withUser` YOX: `PUBLIC` xatirə giriş
 * etməmiş ziyarətçiyə də açıqdır (Xankəndi bələdçisi səhifəsi ictimaidir və
 * eyni məzmunu göstərir). Filtr DB səviyyəsindədir.
 */
export const GET = withViewer<{ id: string }>(async ({ viewer, params }) => {
  const memory = await getMemory(viewer, params.id);
  if (!memory) return notFound(NOT_FOUND_MESSAGE);

  return ok(memory);
});

/**
 * Xatirənin QİSMƏN yenilənməsi.
 *
 * ⚠️ Göndərilməyən sahə DƏYİŞMİR. `updateMemory` bütün sahələri MƏCBURİ alır
 * (səthləri yenidən qurur), ona görə cari dəyərlər `getMemory`-dən oxunub gələn
 * gövdə ilə birləşdirilir (`mergeMemoryWriteData`). Default qoysaydıq, yalnız
 * bir bayraq göndərən müştəri xatirənin mətnini SƏSSİZCƏ əvəz edərdi.
 *
 * ⚠️ 🔴 İŞ QAYDASI (`showInTimeline && !showInFeed` → `TIMELINE_REQUIRES_FEED`)
 * BURADA TƏKRARLANMIR: birləşmiş nəticəni servis yoxlayır və route yalnız
 * `reason`-u 422-yə çevirir (`failMutation`).
 *
 * ⚠️ Redaktə YALNIZ MÜƏLLİFİNDİR — moderator məzmunu SİLƏ bilər, amma
 * başqasının xatirəsini yazmır (servisin qərarı, bax `memory.service.ts`).
 */
export const PATCH = withUser<{ id: string }>(async ({ request, viewer, params }) => {
  const contentTypeError = requireJson(request);
  if (contentTypeError) return contentTypeError;

  const limited = enforceWriteRate(viewer.userId, WRITE_SCOPE);
  if (limited) return limited;

  // 🔴 GÖRÜNÜRLÜK QAPISI — fayl başlığındakı izaha bax.
  const current = await getMemory(viewer, params.id);
  if (!current) return notFound(NOT_FOUND_MESSAGE);

  const body = await parseJsonBody(UpdateMemoryBodySchema, request);
  if (!body.ok) return body.response;

  const result = await updateMemory(viewer, {
    memoryId: params.id,
    ...mergeMemoryWriteData(current, body.data),
  });

  if (!result.ok) return failMutation(result.reason);

  // Cavab YENİLƏNMİŞ resursdur — müştəri ikinci `GET` etməsin.
  const updated = await getMemory(viewer, params.id);
  if (!updated) return notFound(NOT_FOUND_MESSAGE);

  return ok(updated);
});

/**
 * Xatirəni silir.
 *
 * ⚠️ Servis SOFT delete edir (`status = DELETED`) və eyni transaksiyada bağlı
 * Post-u da soft-delete edib xronologiya qeydini silir (TƏLƏ T4 — soft
 * delete-də cascade İŞLƏMİR). Cavab yenə 204-dür: müştəri üçün resurs GETDİ.
 *
 * ⚠️ Müəllif VƏ sinif moderatoru silə bilir (`canModerate`); moderasiya yolu
 * ilə silinirsə audit sətri servisdə MƏCBURİDİR (TƏLƏ T41).
 *
 * ⚠️ İdempotent DEYİL: ikinci `DELETE` 404 verir.
 */
export const DELETE = withUser<{ id: string }>(async ({ viewer, params }) => {
  const limited = enforceWriteRate(viewer.userId, WRITE_SCOPE);
  if (limited) return limited;

  // 🔴 GÖRÜNÜRLÜK QAPISI — 403/404 orakulunu bağlayır (fayl başlığı).
  const current = await getMemory(viewer, params.id);
  if (!current) return notFound(NOT_FOUND_MESSAGE);

  const result = await deleteMemory(viewer, params.id);
  if (!result.ok) return failMutation(result.reason);

  return noContent();
});
