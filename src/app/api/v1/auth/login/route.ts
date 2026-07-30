// ============================================================================
// src/app/api/v1/auth/login/route.ts
// POST /api/v1/auth/login — REST giriş, sessiya kukisi qoyur.
//
// 🔴 ÜÇ TƏLƏ BURADA KƏSİŞİR:
//
// (B) CSRF. Auth.js öz `/api/auth/*` endpoint-lərini CSRF token ilə qoruyur,
//     bu endpoint isə onu ATLAYIR. `requireJson()` `Content-Type:
//     application/json` tələb edir və sadə cross-site `<form>` POST-u MƏHZ bu
//     kəsir (brauzer forması JSON göndərə bilmir; `fetch` isə CORS preflight
//     tələb edir, CORS bizdə açıq deyil). Detallı izah: `lib/api/guard.ts`.
//
// (C) İSTİFADƏÇİ SAYĞACI. "Hesab yoxdur" ilə "şifrə səhvdir" arasında FƏRQ
//     QOYULMUR — hər ikisi EYNİ 401 + EYNİ mətn. Cavab MÜDDƏTİ də oxşardır,
//     çünki `authorize()` istifadəçi tapılmasa da... — ⚠️ bax aşağıdaki qeyd.
//
// (D) REDIRECT. Auth.js v5-də `signIn()` default olaraq yönləndirməyə çalışır
//     və route handler-də `NEXT_REDIRECT` atır. `redirect: false` bunu bağlayır;
//     `AuthError` tutulub 401-ə çevrilir, qalan xətalar `unstable_rethrow`-dan
//     keçir (mövcud `features/auth/actions.ts` ilə eyni nümunə).
//
// ⚠️ Cavabda YALNIZ kimlik və icazə səviyyəsi var: `passwordHash`, doğrulama
// detalı və digər həssas sahə YOXDUR (`SessionSchema`).
// ============================================================================

import { AuthError } from "next-auth";
import { unstable_rethrow } from "next/navigation";

import { signIn } from "@/auth";
import { parseJsonBody, requireJson } from "@/lib/api/guard";
import {
  checkLoginRate,
  clearLoginAttempts,
  loginAttemptKey,
  recordFailedLogin,
  requestIp,
} from "@/lib/api/rate-limit";
import { fail, ok } from "@/lib/api/respond";
import { LoginBodySchema } from "@/lib/api/schemas";
import { normalizeEmail } from "@/lib/constants";
import { getAuthenticatedSummary } from "@/services/auth.service";

export const dynamic = "force-dynamic";

/**
 * ⚠️ Səbəb QƏSDƏN ayırd edilmir (TƏLƏ C). Mətn `features/auth/actions.ts`-dəki
 * ilə EYNİDİR — istifadəçi UI və API arasında fərq görməməlidir.
 */
const INVALID_CREDENTIALS = "E-poçt və ya şifrə yanlışdır.";

export async function POST(request: Request) {
  const mediaTypeError = requireJson(request);
  if (mediaTypeError) return mediaTypeError;

  const body = await parseJsonBody(LoginBodySchema, request);
  if (!body.ok) return body.response;

  const email = normalizeEmail(body.data.email);
  const key = loginAttemptKey(email, requestIp(request));

  const verdict = checkLoginRate(key);
  if (!verdict.allowed) {
    return fail("TOO_MANY_REQUESTS", {
      headers: { "retry-after": String(verdict.retryAfterSeconds) },
    });
  }

  try {
    // 🔴 `redirect: false` — TƏLƏ D. Bunsuz `signIn` NEXT_REDIRECT atır və
    // route handler 500 qaytarır (istifadəçi "giriş sınıb" görür).
    await signIn("credentials", { email, password: body.data.password, redirect: false });
  } catch (error) {
    unstable_rethrow(error);

    if (error instanceof AuthError) {
      // ⚠️ Sayğac YALNIZ uğursuz cəhddə artır — düzgün şifrə ilə 5 dəfə daxil
      // olan istifadəçi bloklanmamalıdır.
      recordFailedLogin(key);
      return fail("UNAUTHENTICATED", { message: INVALID_CREDENTIALS });
    }

    console.error("[api/v1] login:", error);
    return fail("INTERNAL");
  }

  clearLoginAttempts(key);

  // 🔴 `getViewer()` BURADA İŞLƏMİR — bu, ölçülmüş davranışdır, təxmin deyil.
  // `signIn` sessiya kukisini CAVAB başlıqlarına (`Set-Cookie`) yazır, `auth()`
  // isə SORĞU kukilərini oxuyur → eyni sorğu daxilində viewer hələ ANONİMdir və
  // endpoint 500 verirdi. Xülasə servisdən oxunur (səbəb və məhdudiyyət:
  // `services/auth.service.ts` → `getAuthenticatedSummary`).
  const summary = await getAuthenticatedSummary(email);

  if (!summary) {
    // Bura normalda çatmır: `signIn` xəta atmadıqsa istifadəçi mövcuddur.
    console.error("[api/v1] login: istifadəçi xülasəsi oxunmadı");
    return fail("INTERNAL");
  }

  return ok(summary);
}
