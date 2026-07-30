// ============================================================================
// src/lib/api/cohort-scope.ts
// `/api/v1/cohorts/{slug}/…` endpoint-lərinin ortaq qapısı.
//
// 🔴 İCAZƏSİZ SİNİF → 404, 403 YOX.
// "Bu sinif var, amma sənə açıq deyil" cavabı MÖVCUDLUQ FAKTINI sızdırır:
// hücumçu slug-ları sıralayıb hansı siniflərin real olduğunu öyrənə bilər.
// 403 yalnız ROL tələb edən əməliyyatlarda işlədilir (koordinator paneli,
// moderasiya) — orada resursun mövcudluğu istifadəçiyə onsuz da məlumdur.
//
// 🔴 v1 QATI UI-DAN DAHA MƏHDUDDUR — QƏSDƏN.
// `(app)/class/[slug]/*` səhifələri yalnız cohort-un MÖVCUDLUĞUNU yoxlayır və
// üzv olmayana boş siyahı göstərir (servis onsuz da heç nə qaytarmır). Bu, UI
// üçün doğrudur: istifadəçi yanlış linkə düşəndə "boş sinif" görür, 404 ekranı
// yox. API isə XARİCİ inteqrasiya səthidir və ən az səlahiyyət prinsipi ilə
// işləyir: üzv olmadığın sinif üçün endpoint ÜMUMİYYƏTLƏ cavab vermir.
// Fərq sənəddə (`openapi.ts` → Cohorts taqı) və README-də açıq yazılıb.
//
// ⚠️ `UNIVERSITY_ADMIN` istisnadır — universitet miqyaslı roldur
// (`requireCohortRole` ilə eyni məntiq).
// ============================================================================

import { SystemRole } from "@/lib/enums";
import type { AuthenticatedViewer } from "@/lib/viewer";
import { getCohortHeader, type CohortHeader } from "@/services/cohort.service";
import { notFound } from "./respond";

export type CohortScopeOutcome =
  | { ok: true; cohort: CohortHeader }
  | { ok: false; response: Response };

/**
 * Slug-ı sinfə çevirir və viewer-in ona çıxışını yoxlayır.
 *
 * Sinif YOXDURSA və ya viewer üzv DEYİLSƏ — hər iki halda EYNİ 404 cavabı.
 * İki halın fərqi cavabdan oxunmamalıdır.
 */
export async function resolveCohortScope(
  viewer: AuthenticatedViewer,
  slug: string,
): Promise<CohortScopeOutcome> {
  const cohort = await getCohortHeader(viewer, slug);
  if (!cohort) return { ok: false, response: notFound("Sinif tapılmadı.") };

  const isAdmin = viewer.systemRole === SystemRole.UNIVERSITY_ADMIN;
  if (!cohort.isMember && !isAdmin) {
    return { ok: false, response: notFound("Sinif tapılmadı.") };
  }

  return { ok: true, cohort };
}
