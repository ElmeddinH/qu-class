// ============================================================================
// src/lib/api/guard.ts
// `/api/v1` üçün ortaq qapılar: viewer qurulması, JSON məcburiyyəti, query
// doğrulaması.
//
// 🔴 QAYDA (CLAUDE.md §4): hər v1 endpoint-i `getViewer()` ilə viewer qurub onu
// SERVİSƏ ötürür. Endpoint-in içində `prisma.*` çağırışı və ya təkrar
// görünürlük şərti YAZILMIR — yeni endpoint yeni sızma nöqtəsi deməkdir və
// yeganə müdafiə məxfiliyin TƏK yerdə qalmasıdır (`lib/visibility.ts`).
//
// 🔴 `withUser` HTML REDIRECT ATMIR. `lib/viewer.ts` → `requireUser()` sessiya
// yoxdursa `redirect(LOGIN_PATH)` edir və bu, SƏHİFƏ üçün doğrudur, API üçün
// yox: Swagger UI «Try it out» cavab kimi `/login`-in HTML-ini alar və
// istifadəçi "niyə HTML gəldi?" sualı ilə qalar. Ona görə burada `getViewer()`
// çağırılıb 401 JSON qaytarılır.
//
// ⚠️ `middleware.ts` `/api/v1/*`-ı QORUMUR və bu, yoxlanılmış vəziyyətdir:
// `lib/routes.ts` → `APP_ROUTE_PREFIXES` siyahısında `/api` yoxdur, yəni
// `isProtectedRoute("/api/v1/cohorts")` false-dur və middleware yönləndirmir.
// Siyahıya `/api` ƏLAVƏ ETMƏ — əks halda qorunan endpoint-lər JSON yerinə
// 307 + HTML qaytarar.
// ============================================================================

import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { isFreshAdmin } from "@/lib/admin-guard";
import { getViewer } from "@/lib/auth";
import type { AuthenticatedViewer } from "@/lib/viewer";
import type { Viewer } from "@/lib/visibility";
import { fail, forbidden, unauthenticated } from "./respond";

/**
 * Next 15 route handler-inin ikinci arqumenti. `params` PROMISE-dir
 * (Next 15 dəyişikliyi) və dinamik olmayan route-da boş obyektə həll olunur.
 */
export interface RouteContext<P extends Record<string, string> = Record<string, string>> {
  params: Promise<P>;
}

export interface ViewerHandlerArgs<P extends Record<string, string>> {
  request: Request;
  viewer: Viewer;
  params: P;
  /** Hazır `URLSearchParams` — hər handler-də `new URL(...)` təkrarlanmasın. */
  searchParams: URLSearchParams;
}

export interface UserHandlerArgs<P extends Record<string, string>>
  extends Omit<ViewerHandlerArgs<P>, "viewer"> {
  /** Giriş etmiş viewer — `kind: "USER"`-a daralmış. */
  viewer: AuthenticatedViewer;
}

type Handler<P extends Record<string, string>> = (
  request: Request,
  context: RouteContext<P>,
) => Promise<Response>;

async function resolveParams<P extends Record<string, string>>(
  context: RouteContext<P> | undefined,
): Promise<P> {
  const params = await context?.params;
  return params ?? ({} as P);
}

/**
 * Gözlənilməyən xətanı 500 JSON-a çevirir.
 *
 * ⚠️ `unstable_rethrow` MƏCBURİDİR: `notFound()` / `redirect()` Next-in daxili
 * idarəetmə xətalarıdır və udulsa route handler 500 qaytarar. Mövcud server
 * action-larda eyni nümunə var (`features/auth/actions.ts`).
 *
 * ⚠️ Xətanın MƏTNİ cavaba düşmür — stack trace və Prisma mesajı sxem adlarını
 * sızdırır. Detal yalnız server logundadır.
 */
async function guarded(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[api/v1] idarə olunmayan xəta:", error);
    return fail("INTERNAL");
  }
}

/**
 * Anonim ola bilən endpoint. `getViewer()` sessiya yoxdursa
 * `{ kind: "ANONYMOUS" }` qaytarır və `visibilityWhere` onun üçün yalnız
 * `PUBLIC` seçir — endpoint ƏLAVƏ filtr YAZMIR.
 */
export function withViewer<P extends Record<string, string> = Record<string, string>>(
  handler: (args: ViewerHandlerArgs<P>) => Promise<Response>,
): Handler<P> {
  return (request, context) =>
    guarded(async () => {
      const viewer = await getViewer();
      return handler({
        request,
        viewer,
        params: await resolveParams(context),
        searchParams: new URL(request.url).searchParams,
      });
    });
}

/** Giriş MƏCBURİ olan endpoint. Sessiya yoxdursa 401 JSON (HTML redirect YOX). */
export function withUser<P extends Record<string, string> = Record<string, string>>(
  handler: (args: UserHandlerArgs<P>) => Promise<Response>,
): Handler<P> {
  return (request, context) =>
    guarded(async () => {
      const viewer = await getViewer();
      if (viewer.kind !== "USER") return unauthenticated();

      return handler({
        request,
        viewer,
        params: await resolveParams(context),
        searchParams: new URL(request.url).searchParams,
      });
    });
}

/**
 * 🔴 ADMİN endpoint-i — `withUser`-in ÜZƏRİNDƏ, DB-dən rol yoxlaması ilə.
 *
 * TƏLƏ B (Blok 11B): sistem rolu JWT-nin İÇİNDƏDİR (`Session` cədvəli yoxdur).
 * Admin birini `USER`-ə endirsə, həmin adamın token-i hələ `UNIVERSITY_ADMIN`
 * deyir və token bitənə qədər admin endpoint-lərinə çıxa bilərdi. Ona görə
 * qapı `viewer.systemRole` sahəsinə GÜVƏNMİR — `isFreshAdmin` hər sorğuda
 * bazadan oxuyur (bir `findUnique`, ucuzdur).
 *
 * ⚠️ Cavab 403-dür, 404 DEYİL: admin səthində resursun MÖVCUDLUĞU sirr deyil
 * (`/admin/*` yollarının özü sənəddədir) və 404 qaytarmaq inteqrasiya yazan
 * adamı yanıldardı. 404 qaydası GÖRÜNÜRLÜK qapısına aiddir (bax `errors.ts`).
 */
export function withAdmin<P extends Record<string, string> = Record<string, string>>(
  handler: (args: UserHandlerArgs<P>) => Promise<Response>,
): Handler<P> {
  return (request, context) =>
    guarded(async () => {
      const viewer = await getViewer();
      if (viewer.kind !== "USER") return unauthenticated();
      if (!(await isFreshAdmin(viewer))) return forbidden();

      return handler({
        request,
        viewer,
        params: await resolveParams(context),
        searchParams: new URL(request.url).searchParams,
      });
    });
}

// ---------------------------------------------------------------------------
// JSON məcburiyyəti — REST login-in CSRF müdafiəsi
// ---------------------------------------------------------------------------

export const JSON_CONTENT_TYPE = "application/json";

/**
 * 🔴 TƏLƏ B — `POST /api/v1/auth/login` Auth.js-in CSRF QORUMASINDAN KƏNARDADIR.
 *
 * Auth.js öz `/api/auth/*` endpoint-lərini CSRF token ilə qoruyur. Bizim REST
 * login onu ATLAYIR, yəni başqa saytdaki gizli `<form action="…/api/v1/auth/
 * login" method="post">` istifadəçinin brauzerində SESSİYA YARADA bilər
 * (login CSRF: qurban hücumçunun hesabına "girmiş" olur).
 *
 * MİNİMAL, REAL MÜDAFİƏ: `Content-Type: application/json` MƏCBURİDİR.
 * Səbəb — brauzerin `<form>` elementi yalnız ÜÇ məzmun tipi göndərə bilir:
 *   · application/x-www-form-urlencoded
 *   · multipart/form-data
 *   · text/plain
 * `application/json` onların arasında YOXDUR. JSON göndərmək üçün `fetch`
 * lazımdır, `fetch` isə sadə olmayan (non-simple) `Content-Type` ilə CORS
 * preflight (`OPTIONS`) tələb edir; bizdə CORS başlıqları AÇILMAYIB, yəni
 * preflight uğursuz olur və sorğu heç göndərilmir.
 *
 * ⚠️ Bu, tam CSRF token deyil: eyni sayt daxilindəki XSS-ə qarşı qoruma
 * VERMİR. Tam həll üçün `SameSite=Lax` kukisi (Auth.js default) + double
 * submit token lazımdır. Sadə cross-site form POST-u isə MƏHZ bu kəsir və
 * `tests/integration/api.db.test.ts` onu bərkidir.
 */
export function requireJson(request: Request): Response | null {
  const header = request.headers.get("content-type");
  if (!header) {
    return fail("UNSUPPORTED_MEDIA_TYPE", {
      message: `«Content-Type: ${JSON_CONTENT_TYPE}» başlığı tələb olunur.`,
    });
  }

  // `application/json; charset=utf-8` də keçərlidir → yalnız media tipi oxunur.
  const mediaType = header.split(";")[0]?.trim().toLowerCase();
  if (mediaType !== JSON_CONTENT_TYPE) {
    return fail("UNSUPPORTED_MEDIA_TYPE", {
      message: `«${mediaType}» qəbul olunmur — yalnız «${JSON_CONTENT_TYPE}».`,
    });
  }

  return null;
}

// ---------------------------------------------------------------------------
// Gövdə və query doğrulaması
// ---------------------------------------------------------------------------

export type ParseOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

/**
 * Zod-un DEFAULT mesajları ingiliscədir ("Invalid enum value. Expected …") və
 * onlar cavabın `details` sahəsinə düşüb istifadəçiyə çatırdı (CLAUDE.md §9:
 * UI mətnləri azərbaycanca).
 *
 * ⚠️ Yalnız MESAJI OLMAYAN issue-lar tərcümə olunur: `features/auth/schemas.ts`
 * və `lib/api/schemas.ts` öz azərbaycanca mesajlarını verir və `ctx.defaultError`
 * onları saxlayır. Yəni bu xəritə enum / tip səhvləri kimi "boşluqları" doldurur,
 * mövcud mesajları ƏVƏZ ETMİR.
 */
const azErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case "invalid_enum_value":
      return {
        message: `Dəyər qəbul olunmur. Mümkün dəyərlər: ${issue.options.join(", ")}`,
      };
    case "invalid_type":
      return issue.received === "undefined"
        ? { message: "Bu sahə tələb olunur" }
        : { message: `Tip uyğun gəlmir: «${issue.expected}» gözlənilir` };
    case "unrecognized_keys":
      return { message: `Naməlum açar: ${issue.keys.join(", ")}` };
    default:
      return { message: ctx.defaultError };
  }
};

/** Zod xətasını cavabın `details` sahəsinə yığır — sahə → mesaj. */
function issueDetails(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * JSON gövdəsini oxuyub sxemdən keçirir. Xarab JSON da 422 verir — 400 yox,
 * çünki müştəri üçün fərq yoxdur və sənəddəki cavab siyahısı qısa qalır.
 */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  schema: S,
  request: Request,
): Promise<ParseOutcome<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: fail("VALIDATION_FAILED", { message: "Gövdə düzgün JSON deyil." }),
    };
  }

  const parsed = schema.safeParse(raw, { errorMap: azErrorMap });
  if (!parsed.success) {
    return {
      ok: false,
      response: fail("VALIDATION_FAILED", { details: issueDetails(parsed.error) }),
    };
  }

  return { ok: true, data: parsed.data };
}

/**
 * Query parametrlərini sxemdən keçirir.
 *
 * ⚠️ YALNIZ sadə hallar üçündür (`?section=`, `?q=`, `?take=`). Kataloq,
 * xronologiya, nailiyyət və tədbir filtrləri ÜÇÜN MÖVCUD saf modullar
 * işlədilir (`parseDirectoryParams`, `parseTimelineParams`,
 * `parseAchievementParams`, `parseEventParams`) — yeni parse məntiqi yazsaq
 * UI və API eyni URL üçün fərqli nəticə verər.
 *
 * Təkrarlanan açar ilk dəyəri ilə götürülür; massiv qəbul edən filtrlər onsuz
 * da yuxarıdaki modullardan keçir.
 */
export function parseQuery<S extends z.ZodTypeAny>(
  schema: S,
  input: URLSearchParams | Request,
): ParseOutcome<z.infer<S>> {
  const searchParams =
    input instanceof URLSearchParams ? input : new URL(input.url).searchParams;

  const record: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (!(key in record)) record[key] = value;
  }

  const parsed = schema.safeParse(record, { errorMap: azErrorMap });
  if (!parsed.success) {
    return {
      ok: false,
      response: fail("VALIDATION_FAILED", { details: issueDetails(parsed.error) }),
    };
  }

  return { ok: true, data: parsed.data };
}
