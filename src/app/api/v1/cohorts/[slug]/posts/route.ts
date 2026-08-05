// ============================================================================
// src/app/api/v1/cohorts/[slug]/posts/route.ts
// GET  /api/v1/cohorts/{slug}/posts — sinif lenti, kursor səhifələməsi.
// POST /api/v1/cohorts/{slug}/posts — yeni paylaşım (Blok 14B).
//
// ⚠️ MÖVCUD `/api/feed` KÖÇÜRÜLMƏDİ, ADI DƏYİŞMƏDİ (TƏLƏ F): onu `FeedList` →
// `useInfiniteQuery` işlədir və imzası UI müqaviləsidir. Bu endpoint ONUN
// YANINDA yaranır və EYNİ servisi (`listFeed`) çağırır — məntiq dublikat
// deyil, yalnız zərf və sənəd fərqlidir.
//
// 🔴 `CLASS` paylaşımlar sızmır: `listFeed` → `activeVisibleWhere(viewer)`
// şərtini DB sorğusuna qoyur. Endpoint əlavə filtr YAZMIR — yazsaydı iki
// müstəqil məxfilik məntiqi yaranardı və biri köhnələrdi.
//
// 🔴 POST — SİNİF YOLDAN GƏLİR, GÖVDƏDƏN YOX. `resolveCohortScope` slug-ı
// həll edir və üzv olmayana 404 verir (403 YOX — sinfin mövcudluğu sızmasın).
// Gövdədə `cohortId` qəbul etsəydik "hansı sinif?" sualının iki cavabı olardı.
// Servis üzvlüyü ONSUZ DA DB-dən yenidən yoxlayır (`createPost` →
// `assertMembership`) — qapı ikiqatdır, məntiq isə tək yerdədir.
// ============================================================================

import { resolveCohortScope } from "@/lib/api/cohort-scope";
import { parseJsonBody, parseQuery, requireJson, withUser } from "@/lib/api/guard";
import { failMutation } from "@/lib/api/mutation-result";
import { enforceWriteRate } from "@/lib/api/rate-limit";
import { created, ok } from "@/lib/api/respond";
import { CreatePostBodySchema, PostsQuerySchema } from "@/lib/api/schemas";
import { toCreatePostData } from "@/features/feed/post-input";
import { createPost, listFeed } from "@/services/post.service";

export const dynamic = "force-dynamic";

/** Yazma sayğacının əhatəsi — 14C öz açarını verəcək (memories / events). */
const WRITE_SCOPE = "posts";

export const GET = withUser<{ slug: string }>(
  async ({ viewer, params, searchParams }) => {
    const scope = await resolveCohortScope(viewer, params.slug);
    if (!scope.ok) return scope.response;

    const query = parseQuery(PostsQuerySchema, searchParams);
    if (!query.ok) return query.response;

    const page = await listFeed(viewer, {
      cohortId: scope.cohort.id,
      cursor: query.data.cursor ?? null,
      take: query.data.take,
    });

    return ok(page.items, { meta: { nextCursor: page.nextCursor } });
  },
);

/**
 * Yeni paylaşım.
 *
 * Sıra QƏSDƏN belədir və hər addımın səbəbi var:
 *   1. `requireJson`  — CSRF (brauzer `<form>`-u JSON göndərə bilmir, TƏLƏ B).
 *   2. `enforceWriteRate` — DOĞRULAMADAN ƏVVƏL: hədd aşılıbsa gövdəni parse
 *      etmək və sxem işlətmək artıq xərcdir. Sayğac `viewer.userId`-yə
 *      bağlıdır, yəni qapıdan keçmiş kimlik lazımdır — ona görə `withUser`-in
 *      İÇİNDƏdir, ondan əvvəl yox.
 *   3. `resolveCohortScope` — sinif + üzvlük qapısı (üzv olmayana 404).
 *   4. `parseJsonBody` — gövdə.
 *
 * ⚠️ 201 cavabında `Location` başlığı var: müştəri yaradılan resursu dərhal
 * `GET /api/v1/posts/{id}` ilə oxuya bilir. Bu, `POST`-un REST müqaviləsidir
 * (RFC 9110 §10.2.2) və Swagger «Try it out»-da növbəti addımı göstərir.
 */
export const POST = withUser<{ slug: string }>(async ({ request, viewer, params }) => {
  const contentTypeError = requireJson(request);
  if (contentTypeError) return contentTypeError;

  const limited = enforceWriteRate(viewer.userId, WRITE_SCOPE);
  if (limited) return limited;

  const scope = await resolveCohortScope(viewer, params.slug);
  if (!scope.ok) return scope.response;

  const body = await parseJsonBody(CreatePostBodySchema, request);
  if (!body.ok) return body.response;

  // ⚠️ Çevirmə (sətir → `Date`, "" → `null`, `/uploads/` filtri) `features/
  // feed/post-input.ts`-dədir — Server Action ilə EYNİ funksiya. Route öz
  // nüsxəsini yazsaydı media ünvanı yoxlaması ikiyə bölünərdi.
  const result = await createPost(
    viewer,
    toCreatePostData(body.data, scope.cohort.id),
  );

  if (!result.ok) return failMutation(result.reason);

  return created(result.value, {
    headers: { location: `/api/v1/posts/${result.value.postId}` },
  });
});
