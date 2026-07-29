// ============================================================================
// src/middleware.ts
// Route qorunması — EDGE runtime.
//
// 🔴 Bu fayl YALNIZ `auth.config.ts`-i işlədir, `src/auth.ts`-i YOX.
// `src/auth.ts` Prisma və bcrypt import edir; middleware-in import qrafındakı
// hər şey Edge üçün bundle olunduğuna görə o yol build-i sındırır.
//
// İcazə məntiqi `auth.config.ts` → `callbacks.authorized`-dədir:
//   (app)/*   → giriş tələb olunur, əks halda /login?callbackUrl=...
//   (admin)/* → əlavə olaraq systemRole === UNIVERSITY_ADMIN
//
// Middleware yalnız BİRİNCİ süzgəcdir. Səhifə səviyyəsində `requireUser()` /
// `requireAdmin()` eyni yoxlamanı təkrarlayır — middleware-in atlaya biləcəyi
// hallar (məs. server action çağırışı) üçün.
// ============================================================================

import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: [
    /*
     * Statik fayllar və Auth.js-in öz endpoint-ləri istisna edilir:
     *   api/auth  — giriş/çıxış axını özü qorunmamalıdır
     *   _next/static, _next/image — build çıxışı
     *   favicon.ico, robots.txt, sitemap.xml və uzantılı fayllar (public/)
     */
    "/((?!api/auth|_next/static|_next/image|.*\\.[\\w]+$).*)",
  ],
};
