// ============================================================================
// src/lib/api/respond.ts
// `/api/v1` cavab zərfi — BÜTÜN v1 endpoint-ləri YALNIZ bunları işlədir.
//
// 🔴 NİYƏ ZƏRF: OpenAPI sənədi (`src/lib/api/openapi.ts`) hər cavabı
// `{ data: … }` / `{ error: { code, message } }` kimi elan edir. Bir endpoint
// `NextResponse.json(payload)` yazıb zərfi atlasa SƏNƏD YALAN OLUR və müştəri
// kodu (Swagger «Try it out», mobil tətbiq) səssizcə sınır. Ona görə v1
// altında `NextResponse.json` BİRBAŞA çağırılmır — yalnız bu fayl çağırır.
//
// ⚠️ Mövcud `/api/feed`, `/api/search`, `/api/upload` endpoint-ləri ZƏRFSİZDİR
// və bu, qəsdəndir: onları client komponentləri (FeedList → useInfiniteQuery,
// ⌘K palitrası) işlədir və imzalarını dəyişmək UI-ı sındırardı (TƏLƏ F).
// v1 qatı onların YANINDA yaranır, ÜZƏRİNDƏ deyil.
// ============================================================================

import { NextResponse } from "next/server";

import {
  DEFAULT_ERROR_MESSAGE,
  DEFAULT_ERROR_STATUS,
  type ApiErrorCode,
} from "./errors";

/** Uğurlu cavabın zərfi. Siyahılarda `meta` səhifələmə məlumatını daşıyır. */
export interface ApiEnvelope<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiMeta {
  /** Filtrdən keçmiş ÜMUMİ say (`take`/`skip`-dan asılı deyil). */
  total?: number;
  /** Kursor əsaslı səhifələmə — `null` olarsa daha məlumat yoxdur. */
  nextCursor?: string | null;
  /** Səhifə nömrəsi (1-dən) — `skip`/`take` işlədən endpoint-lər üçün. */
  page?: number;
  /** Səhifə ölçüsü. */
  pageSize?: number;
}

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Zod issue-ları və digər maşın oxuyan detallar (yalnız 422-də olur). */
    details?: unknown;
  };
}

/** 200 — tək obyekt və ya siyahı. */
export function ok<T>(data: T, init?: { meta?: ApiMeta; headers?: HeadersInit }) {
  const body: ApiEnvelope<T> = init?.meta ? { data, meta: init.meta } : { data };
  return NextResponse.json(body, { status: 200, headers: init?.headers });
}

/** 201 — yeni resurs yaradıldı (qeydiyyat). */
export function created<T>(data: T, init?: { headers?: HeadersInit }) {
  const body: ApiEnvelope<T> = { data };
  return NextResponse.json(body, { status: 201, headers: init?.headers });
}

/**
 * 204 — məzmun yoxdur (çıxış).
 *
 * ⚠️ `NextResponse.json(null, { status: 204 })` İŞLƏTMƏ: 204 cavabın gövdəsi
 * OLA BİLMƏZ və bəzi runtime-lar bunu xəta kimi atır. Gövdəsiz `Response`
 * qurulur, `Content-Type` da qoyulmur.
 */
export function noContent(headers?: HeadersInit) {
  return new NextResponse(null, { status: 204, headers });
}

/**
 * Xəta cavabı. `status` verilməsə koda uyğun default işlədilir
 * (`DEFAULT_ERROR_STATUS`) — yəni 404-ü səhvən 403 yazmaq mümkün deyil.
 */
export function fail(
  code: ApiErrorCode,
  init?: { status?: number; message?: string; details?: unknown; headers?: HeadersInit },
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message: init?.message ?? DEFAULT_ERROR_MESSAGE[code],
      ...(init?.details === undefined ? {} : { details: init.details }),
    },
  };

  return NextResponse.json(body, {
    status: init?.status ?? DEFAULT_ERROR_STATUS[code],
    headers: init?.headers,
  });
}

// ---------------------------------------------------------------------------
// Qısayollar — endpoint-lərdə ən çox təkrarlanan üç hal
// ---------------------------------------------------------------------------

export const unauthenticated = (message?: string) =>
  fail("UNAUTHENTICATED", { message });

/**
 * İcazəsiz VƏ ya mövcud olmayan resurs — İKİSİ DƏ 404.
 *
 * 🔴 Ad qəsdən `notFound`-dur: çağıran tərəf "403 versəm nə olar?" sualını
 * verməsin. Mövcudluq faktı özü də məlumatdır (bax `errors.ts`).
 */
export const notFound = (message?: string) => fail("NOT_FOUND", { message });

/** Rol tələb edən əməliyyat — mövcudluq onsuz da məlumdur. */
export const forbidden = (message?: string) => fail("FORBIDDEN", { message });
