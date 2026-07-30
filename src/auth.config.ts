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
import { LOGIN_PATH, routeRedirectTarget, type ViewerKind } from "@/lib/routes";

/**
 * HTTPS altında işləyirikmi? Auth.js-in `useSecureCookies` qərarı ilə eyni
 * siqnala baxır: konfiqurasiya edilmiş kanonik ünvanın sxemi.
 */
const useSecureCookies = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "")
  .startsWith("https://");

/**
 * 🔴 SESSİYA KUKİSİNİN ADI — VAHİD MƏNBƏ.
 *
 * OpenAPI sənədindəki `cookieAuth` security scheme (`src/lib/api/openapi.ts`)
 * bu sabitdən oxuyur. Ad hardcode edilsəydi Swagger UI-daki "Authorize"
 * pəncərəsi mövcud olmayan kukini göstərərdi və heç kim səhvi görməzdi —
 * cavab yenə 401 olardı, sadəcə səbəbi yanlış yerdə axtarılardı.
 *
 * Aşağıdaki `cookies.sessionToken.name` MƏHZ bu dəyəri işlədir, yəni sabit
 * sənədin təxmini deyil, Auth.js-in FAKTİKİ konfiqurasiyasıdır. `__Secure-`
 * prefiksi HTTPS-də məcburidir (kuka yalnız `secure` bayrağı ilə qəbul olunur).
 */
export const SESSION_COOKIE_NAME = `${
  useSecureCookies ? "__Secure-" : ""
}authjs.session-token`;

export const authConfig = {
  // JWT sessiya — `Session` cədvəli yoxdur (PLAN.md §3.2). Edge-də DB sorğusu
  // etmədən sessiyanı oxumağın yeganə yolu budur.
  session: { strategy: "jwt" },

  // ⚠️ Dəyərlər Auth.js-in DEFAULT-larının eynisidir — məqsəd davranışı
  // dəyişmək deyil, adı OXUNA BİLƏN sabitə bağlamaqdır (yuxarıdaki qeyd).
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },

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
     * 🔴 BURADA MƏNTİQ YOXDUR — YALNIZ TƏRCÜMƏ. Qərarı `src/lib/routes.ts` →
     * `routeRedirectTarget()` verir. Səbəb: siyahı iki yerdə saxlanılanda
     * (middleware + səhifə/layout) onlar vaxtla ayrılır və yönləndirmə
     * dövrəsi yaranır. Yollarla bağlı hər dəyişiklik `routes.ts`-ə yazılır və
     * `routes.test.ts`-dəki DÖVRƏ testi onu avtomatik yoxlayır.
     *
     * ⚠️ Burada YALNIZ token-dəki məlumat mövcuddur: userId + systemRole.
     * `cohortIds` / `moderatedCohortIds` DB-dən gəlir və Edge-də əlçatan
     * deyil — cohort səviyyəli yoxlama server komponentində
     * `requireCohortRole()` ilə aparılır.
     *
     * ⚠️ TOKEN DB-Nİ ƏKS ETDİRMƏYƏ BİLƏR: imza keçərli olsa da `userId`
     * silinmiş ola bilər. Edge-də bunu bilmək mümkün deyil — həmin halı
     * `(app)` layout-u tutur və sessiya kukisini təmizləyən
     * `SESSION_EXPIRED_PATH`-ə göndərir (bax `src/lib/routes.ts`).
     */
    authorized({ auth, request }) {
      const { pathname, search } = request.nextUrl;
      const user = auth?.user;

      const viewerKind: ViewerKind = !user
        ? "ANONYMOUS"
        : user.systemRole === SystemRole.UNIVERSITY_ADMIN
          ? "ADMIN"
          : "USER";

      const target = routeRedirectTarget(pathname, search, viewerKind);
      if (!target) return true;

      return Response.redirect(new URL(target, request.nextUrl));
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
