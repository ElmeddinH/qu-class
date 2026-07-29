// ============================================================================
// src/auth.ts
// Auth.js v5 — NODE runtime konfiqurasiyası.
//
// `auth.config.ts`-i (Edge-təhlükəsiz hissə) spread edir və üstünə Credentials
// provider-ini əlavə edir. Prisma və bcrypt YALNIZ burada import olunur.
//
// ⚠️ `src/middleware.ts` bu faylı İMPORT ETMƏMƏLİDİR — `auth.config.ts`-dən
// istifadə edir. Əks halda Prisma engine Edge bundle-a düşür və build sınır.
//
// Server komponentləri, server action-lar və route handler-lər buradan
// `auth()`, `signIn()`, `signOut()` import edir.
// ============================================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compareSync } from "bcryptjs";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/constants";
import { SystemRoleSchema } from "@/lib/enums";
import { syncUserStage } from "@/lib/stage";
import { credentialsSchema } from "@/features/auth/schemas";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      // UI öz formasını (RHF + Zod) işlədir; bu sahələr yalnız Auth.js-in
      // daxili `/api/auth/callback/credentials` endpoint-i üçündür.
      credentials: {
        email: { label: "E-poçt", type: "email" },
        password: { label: "Şifrə", type: "password" },
      },

      /**
       * `null` qaytarmaq = giriş uğursuz. Səbəbi (istifadəçi yoxdur / şifrə
       * səhvdir) QƏSDƏN ayırd edilmir — əks halda hansı e-poçtun sistemdə
       * qeydiyyatlı olduğu sızar (user enumeration).
       */
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = normalizeEmail(parsed.data.email);
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, passwordHash: true, systemRole: true },
        });
        if (!user) return null;

        if (!compareSync(parsed.data.password, user.passwordHash)) return null;

        return {
          id: user.id,
          email: user.email,
          // Naməlum dəyər DB-də qalıbsa ən aşağı səlahiyyətə düş (fail closed).
          systemRole: SystemRoleSchema.catch("USER").parse(user.systemRole),
        };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    /**
     * Hər uğurlu girişdə `User.stage` keşi cohort tarixlərinə görə yenilənir
     * (PLAN.md §4.6). Cron yoxdur — giriş anında sinxronlaşma v1 üçün
     * kifayətdir, çünki UI həmişə `resolveStage()`-in nəticəsini göstərir.
     *
     * Sinxronlaşma sınsa giriş DAYANMAMALIDIR — `stage` yalnız keşdir.
     */
    async signIn({ user }) {
      if (user.id) {
        try {
          await syncUserStage(user.id);
          await prisma.user.update({
            where: { id: user.id },
            data: { lastSeenAt: new Date() },
          });
        } catch (error) {
          console.error("[auth] syncUserStage uğursuz oldu:", error);
        }
      }
      return true;
    },
  },
});
