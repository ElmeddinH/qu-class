// ============================================================================
// src/app/api/session/expired/route.ts
// 🔴 SESSİYA QAÇIŞ YOLU — auth yönləndirmə dövrəsini KƏSİR.
//
// Nə vaxt çağırılır: sessiya kukisi KEÇƏRLİDİR (imza düzgün, müddəti bitməyib),
// amma içindəki `userId` DB-də YOXDUR — hesab silinib və ya baza yenidən seed
// edilib. `(app)` / `(admin)` layout-u belə halda səhifəni qura bilmir.
//
// Niyə birbaşa `redirect("/login")` DEYİL:
//   /login --(middleware: kuka var → "giriş edib")--> /home
//   /home  --(layout: DB-də istifadəçi yoxdur)------> /login   ← sonsuz dövrə
// Dövrənin səbəbi kukanın YERİNDƏ QALMASIDIR, ona görə burada ƏVVƏLCƏ kuka
// silinir, sonra yönləndirilir: ikinci keçiddə middleware anonim görür və
// `/login` normal açılır.
//
// ⚠️ Route HANDLER olmalıdır, səhifə YOX: kukanı yalnız route handler və
// server action dəyişə bilər — server komponenti render zamanı `Set-Cookie`
// yaza bilmir (Next.js bunu qadağan edir).
//
// ⚠️ `signOut()` işlədilmir: o, Auth.js-in CSRF qorumalı POST axınıdır və
// brauzerin GET yönləndirməsi ilə çağırıla bilməz.
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/auth.config";
import { LOGIN_PATH, SESSION_EXPIRED_PARAM } from "@/lib/routes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // ⚠️ NİSBİ `Location` — `NextResponse.redirect()` MÜTLƏQ URL tələb edir və
  // `request.nextUrl`-dən qurulan ünvan hostu dəyişdirir (`127.0.0.1` →
  // `localhost`). Host dəyişəndə brauzer BAŞQA kuka anbarına keçir: təzəcə
  // silinmiş kuka köhnə hostda qalar və dövrə oradan qayıdardı.
  const location = `${LOGIN_PATH}?${SESSION_EXPIRED_PARAM}=1`;

  const response = new NextResponse(null, {
    status: 307,
    headers: { Location: location },
  });

  // Auth.js böyük JWT-ni `<ad>.0`, `<ad>.1` kimi hissələrə bölür — silinmə
  // yalnız əsas adı hədəfləsəydi bölünmüş kuka qalar və dövrə qayıdardı.
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name === SESSION_COOKIE_NAME ||
      cookie.name.startsWith(`${SESSION_COOKIE_NAME}.`)
    ) {
      // `path: "/"` — kuka məhz bu yolla yazılıb (bax `auth.config.ts`);
      // uyğun gəlməsə brauzer silinməni nəzərə almır.
      response.cookies.set({ name: cookie.name, value: "", path: "/", maxAge: 0 });
    }
  }

  return response;
}
