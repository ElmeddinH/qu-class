// ============================================================================
// src/auth.config.ts
// Auth.js v5 — EDGE-TƏHLÜKƏSİZ konfiqurasiya ("split config" nümunəsi).
//
// 🔴 BU FAYLA PRISMA, BCRYPT və ya digər Node API-si İMPORT ETMƏ.
// Səbəb: `src/middleware.ts` DEFAULT OLARAQ Edge runtime-da işləyir və
// middleware-in import qrafındakı HƏR modul Edge üçün bundle olunur.
// Prisma engine və bcryptjs Edge-də işləmir → `npm run build` sınır.
//
// Buna görə konfiq ikiyə bölünür:
//   • auth.config.ts (bu fayl) — yalnız callback-lər, `providers: []`.
//     `src/middleware.ts` YALNIZ bunu işlədir.
//   • src/auth.ts — Node runtime. Bunu spread edir və üstünə Credentials
//     provider-ini (Prisma + bcrypt ilə) əlavə edir. Server kodu və
//     `/api/auth/[...nextauth]` route handler-i ORADAN import edir.
// ============================================================================

import type { NextAuthConfig } from "next-auth";

import { SystemRole } from "@/lib/enums";
import {
  AFTER_LOGIN_PATH,
  CALLBACK_URL_PARAM,
  LOGIN_PATH,
  isAdminRoute,
  isAuthRoute,
  isProtectedRoute,
} from "@/lib/routes";

export const authConfig = {
  // JWT sessiya — `Session` cədvəli yoxdur (PLAN.md §3.2). Edge-də DB sorğusu
  // etmədən sessiyanı oxumağın yeganə yolu budur.
  session: { strategy: "jwt" },

  pages: {
    signIn: LOGIN_PATH,
    error: LOGIN_PATH,
  },

  // Provider-lər QƏSDƏN boşdur — Credentials provider Prisma və bcrypt işlədir,
  // yəni Edge-də yüklənə bilməz. src/auth.ts onu əlavə edir.
  providers: [],

  callbacks: {
    /**
     * Middleware-in icazə qərarı. `auth` — cari sessiya (və ya null).
     *
     * ⚠️ Burada YALNIZ token-dəki məlumat mövcuddur: userId + systemRole.
     * `cohortIds` / `moderatedCohortIds` DB-dən gəlir və Edge-də əlçatan
     * deyil — cohort səviyyəli yoxlama server komponentində
     * `requireCohortRole()` ilə aparılır.
     */
    authorized({ auth, request }) {
      const { pathname, search } = request.nextUrl;
      const user = auth?.user;

      // Giriş etmiş istifadəçi /login və /register-də işi yoxdur.
      if (user && isAuthRoute(pathname)) {
        return Response.redirect(new URL(AFTER_LOGIN_PATH, request.nextUrl));
      }

      if (!isProtectedRoute(pathname)) return true;

      if (!user) {
        const url = new URL(LOGIN_PATH, request.nextUrl);
        url.searchParams.set(CALLBACK_URL_PARAM, `${pathname}${search}`);
        return Response.redirect(url);
      }

      // (admin)/* — sistem rolu tələb olunur. Girişi olan, amma admin olmayan
      // istifadəçini /login-ə atmaq mənasızdır (o, artıq giriş edib) → əsas
      // səhifəyə yönləndirilir. Server tərəfdə `requireAdmin()` eyni yoxlamanı
      // təkrarlayır və 403 verir (ikiqat qoruma).
      if (isAdminRoute(pathname) && user.systemRole !== SystemRole.UNIVERSITY_ADMIN) {
        return Response.redirect(new URL(AFTER_LOGIN_PATH, request.nextUrl));
      }

      return true;
    },

    /**
     * Token-in MİNİMAL saxlanması qəsdəndir: `userId` + `systemRole`.
     *
     * ⚠️ `cohortIds`, `stage`, `moderatedCohortIds` BURAYA YAZILMIR — onlar
     * dəyişkəndir (yeni üzvlük, rol dəyişikliyi, mərhələ keçidi) və uzunömürlü
     * JWT-də dərhal köhnəlir. Onlar hər sorğuda `getViewer()` ilə DB-dən
     * oxunur (React `cache()` sayəsində render başına bir sorğu).
     */
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.systemRole = user.systemRole ?? SystemRole.USER;
      }
      return token;
    },

    session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      session.user.systemRole = token.systemRole ?? SystemRole.USER;
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
