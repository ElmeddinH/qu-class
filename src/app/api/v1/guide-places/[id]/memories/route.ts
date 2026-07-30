// ============================================================================
// src/app/api/v1/guide-places/{id}/memories/route.ts
// GET /api/v1/guide-places/{id}/memories — məkanla bağlı xatirələr (M9 ↔ M3).
//
// 🔴 `withViewer` (ANONİM DƏ OLA BİLƏR), `withUser` YOX: Xankəndi bələdçisi
// ictimai səthdir (`GET /api/v1/guide-places` də anonimə açıqdır) və bu
// endpoint onun davamıdır.
//
// 🔴 MƏHZ BUNA GÖRƏ GÖRÜNÜRLÜK ŞƏRTİ MƏCBURİDİR. `listMemoriesForPlace`
// `activeVisibleWhere`-i məkan filtrinin ÜSTÜNƏ qoyur: anonim sorğu yalnız
// `PUBLIC` xatirələri alır, `CLASS` və `PRIVATE` məzmun məkan üzərindən
// SIZMIR (inteqrasiya testi: «anonim viewer üçün CLASS xatirə QAYTARILMIR»).
//
// ⚠️ Naməlum məkan `id`-si 404 VERMİR — boş siyahı qaytarır. Səbəb: mövcudluq
// faktının özü də məlumatdır və bələdçi kataloqu onsuz da açıqdır; boş cavab
// müştəri üçün sadədir (tədbir filtrlərində eyni yanaşma).
// ============================================================================

import { withViewer } from "@/lib/api/guard";
import { ok } from "@/lib/api/respond";
import { listMemoriesForPlace } from "@/services/memory.service";

export const dynamic = "force-dynamic";

/** Bələdçi kartı üçün nəzərdə tutulub — səhifələmə yoxdur, sabit limit. */
const PLACE_MEMORY_TAKE = 10;

export const GET = withViewer<{ id: string }>(async ({ viewer, params }) => {
  const items = await listMemoriesForPlace(viewer, params.id, PLACE_MEMORY_TAKE);

  return ok(items, {
    meta: { total: items.length, pageSize: PLACE_MEMORY_TAKE },
  });
});
