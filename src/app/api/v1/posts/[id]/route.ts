// ============================================================================
// src/app/api/v1/posts/[id]/route.ts
// GET    /api/v1/posts/{id} — tək paylaşım (sənəddəki oxu boşluğu bağlanır).
// PATCH  /api/v1/posts/{id} — səthlərin QİSMƏN yenilənməsi.
// DELETE /api/v1/posts/{id} — soft delete.
//
// 🔴 MƏXFİLİK: GÖRÜNMƏYƏN PAYLAŞIM ÜÇÜN HƏR ÜÇ METOD 404 VERİR.
// `getPost` → `visiblePostWhere(viewer)` → `activeVisibleWhere(viewer,
// "authorId")`. Route ƏLAVƏ filtr YAZMIR; şərt DB sorğusundadır və `null`
// gəlirsə cavab 404-dür. Başqa sinfin `CLASS` paylaşımı üçün 403 qaytarsaydıq,
// "bu id-də nəsə var" faktı sızardı və slug/id sıralayan hücumçu sinfin
// məzmun HƏCMİNİ ölçə bilərdi.
//
// 🔴 PATCH VƏ DELETE NİYƏ ƏVVƏLCƏ `getPost` ÇAĞIRIR (ən vacib qərar).
// `updatePostSurfaces` və `deletePost` post-u `findUnique({ where: { id } })`
// ilə oxuyur — orada GÖRÜNÜRLÜK ŞƏRTİ YOXDUR, çünki onların işi SAHİBLİK
// yoxlamaqdır. Yəni birbaşa çağırsaydıq:
//     · olmayan id            → NOT_FOUND  → 404
//     · başqa sinfin postu    → FORBIDDEN  → 403
// və 403/404 fərqi MÖVCUDLUQ ORAKULU olardı. `getPost` qapısı hər iki halı
// 404-də birləşdirir; ondan SONRA gələn `FORBIDDEN` isə artıq təhlükəsizdir —
// "postu görürsən, amma müəllifi deyilsən" (bax `lib/api/mutation-result.ts`).
//
// ⚠️ Bu, məxfilik məntiqinin TƏKRARI DEYİL: route öz `where` şərtini
// qurmur, MÖVCUD servis funksiyasını çağırır. Filtr yenə `lib/visibility.ts`-in
// yeganə nüsxəsindədir.
//
// ⚠️ `requireJson` PATCH-dədir, DELETE-də YOX. Qoruma cross-site `<form>`
// POST-una qarşıdır, brauzer forması isə YALNIZ `GET` və `POST` göndərə bilir —
// `DELETE` üçün onsuz da `fetch` + CORS preflight lazımdır. Gövdəsiz sorğuda
// `Content-Type` tələb etmək müştərini səbəbsiz 415-ə salardı.
// ============================================================================

import { parseJsonBody, requireJson, withUser, withViewer } from "@/lib/api/guard";
import { failMutation } from "@/lib/api/mutation-result";
import { enforceWriteRate } from "@/lib/api/rate-limit";
import { noContent, notFound, ok } from "@/lib/api/respond";
import { UpdatePostBodySchema } from "@/lib/api/schemas";
import { toAchievementInput } from "@/features/feed/post-input";
import { deletePost, getPost, updatePostSurfaces } from "@/services/post.service";

export const dynamic = "force-dynamic";

/** Yazma sayğacının əhatəsi — sinif lenti POST-u ilə EYNİ büdcə. */
const WRITE_SCOPE = "posts";

const NOT_FOUND_MESSAGE = "Paylaşım tapılmadı.";

/**
 * Tək paylaşım.
 *
 * ⚠️ `withViewer` (anonim ola bilər), `withUser` YOX: `PUBLIC` paylaşım giriş
 * etməmiş ziyarətçiyə də açıqdır və `activeVisibleWhere` anonim üçün məhz onu
 * seçir. `withUser` yazsaydıq ictimai məzmun səbəbsiz bağlanardı — sinif lenti
 * (`/cohorts/{slug}/posts`) isə qorunan qalır, çünki orada SİNİF adı da
 * məlumatdır.
 */
export const GET = withViewer<{ id: string }>(async ({ viewer, params }) => {
  const post = await getPost(viewer, params.id);
  if (!post) return notFound(NOT_FOUND_MESSAGE);

  return ok(post);
});

/**
 * Səthlərin qismən yenilənməsi (`showOnTimeline` / `showInAchievements`).
 *
 * ⚠️ QİSMƏN semantika: göndərilməyən bayraq DƏYİŞMİR. Servis hər iki bayrağı
 * MƏCBURİ alır (`UpdateSurfacesData`), ona görə cari dəyərlər `getPost`-dan
 * oxunub gələn gövdə ilə birləşdirilir. `?? false` yazsaydıq, yalnız
 * `showOnTimeline` göndərən müştəri nailiyyəti SƏSSİZCƏ arxivləyərdi.
 *
 * ⚠️ `achievement` göndərilməyibsə `null` ötürülür — servis bunu "detal
 * gəlməyib" kimi oxuyur və MÖVCUD nailiyyət sətrini saxlayır (TƏLƏ T11).
 */
export const PATCH = withUser<{ id: string }>(async ({ request, viewer, params }) => {
  const contentTypeError = requireJson(request);
  if (contentTypeError) return contentTypeError;

  const limited = enforceWriteRate(viewer.userId, WRITE_SCOPE);
  if (limited) return limited;

  // 🔴 GÖRÜNÜRLÜK QAPISI — fayl başlığındakı izaha bax.
  const current = await getPost(viewer, params.id);
  if (!current) return notFound(NOT_FOUND_MESSAGE);

  const body = await parseJsonBody(UpdatePostBodySchema, request);
  if (!body.ok) return body.response;

  const showInAchievements =
    body.data.showInAchievements ?? current.showInAchievements;

  const result = await updatePostSurfaces(viewer, {
    postId: params.id,
    showOnTimeline: body.data.showOnTimeline ?? current.showOnTimeline,
    showInAchievements,
    achievement: body.data.achievement
      ? toAchievementInput(body.data.achievement, showInAchievements)
      : null,
  });

  if (!result.ok) return failMutation(result.reason);

  // Cavab YENİLƏNMİŞ resursdur — müştəri ikinci `GET` etməsin.
  const updated = await getPost(viewer, params.id);
  if (!updated) return notFound(NOT_FOUND_MESSAGE);

  return ok(updated);
});

/**
 * Paylaşımı silir.
 *
 * ⚠️ Servis SOFT delete edir (`status = DELETED`) və eyni transaksiyada
 * xronologiya qeydini silib nailiyyəti arxivləyir (TƏLƏ T4). Cavab yenə də
 * 204-dür: müştəri üçün resurs GETDİ, saxlanc detalı müqavilənin hissəsi
 * deyil.
 *
 * ⚠️ Silinmiş postu ikinci dəfə silmək 404 verir — `getPost` onu artıq
 * görmür. Bu, idempotent DEYİL və qəsdən belədir: "sildim, amma yox idi"
 * cavabı skriptin səhvini gizlədərdi.
 */
export const DELETE = withUser<{ id: string }>(async ({ viewer, params }) => {
  const limited = enforceWriteRate(viewer.userId, WRITE_SCOPE);
  if (limited) return limited;

  // 🔴 GÖRÜNÜRLÜK QAPISI — 403/404 orakulunu bağlayır (fayl başlığı).
  const current = await getPost(viewer, params.id);
  if (!current) return notFound(NOT_FOUND_MESSAGE);

  const result = await deletePost(viewer, params.id);
  if (!result.ok) return failMutation(result.reason);

  return noContent();
});
