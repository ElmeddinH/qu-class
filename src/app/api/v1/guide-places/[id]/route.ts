// ============================================================================
// src/app/api/v1/guide-places/{id}/route.ts
// GET /api/v1/guide-places/{id} — tək bələdçi məkanı.
//
// ⚠️ `Viewer` ALMIR — bələdçi redaksiya məzmunudur (`content.service.ts`).
//
// ⚠️ TAPILMAYAN `id` BURADA 404 VERİR, `…/memories` endpoint-i isə BOŞ SİYAHI
// qaytarır və bu, uyğunsuzluq DEYİL: burada resursun ÖZÜ istənilir (yoxdursa
// 404 düzgün cavabdır), orada isə həmin məkana bağlı SİYAHI istənilir və boş
// siyahı tam mənalı cavabdır (tədbir filtrlərində eyni yanaşma).
//
// ⚠️ `address` / `latitude` / `longitude` cavabdadır və bu, məxfilik pozuntusu
// deyil: söhbət şəhərin İCTİMAİ obyektindən gedir, istifadəçi məkanından yox
// (`listGuidePlaces` şərhi).
// ============================================================================

import { withViewer } from "@/lib/api/guard";
import { notFound, ok } from "@/lib/api/respond";
import { getGuidePlace } from "@/services/content.service";

export const dynamic = "force-dynamic";

export const GET = withViewer<{ id: string }>(async ({ params }) => {
  const place = await getGuidePlace(params.id);
  if (!place) return notFound("Məkan tapılmadı.");

  return ok(place);
});
