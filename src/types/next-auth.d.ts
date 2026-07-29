// ============================================================================
// src/types/next-auth.d.ts
// Auth.js v5 tip genişlənməsi (module augmentation).
//
// Sessiya və JWT-yə YALNIZ iki əlavə sahə qoyulur: `id` və `systemRole`.
// Dəyişkən məlumat (cohortIds, stage, moderatedCohortIds) token-də saxlanılmır
// — səbəbi `src/auth.config.ts`-də izah olunub.
// ============================================================================

import type { DefaultSession } from "next-auth";
import type { SystemRole } from "@/lib/enums";

declare module "next-auth" {
  /** `authorize()`-un qaytardığı obyekt və `signIn` callback-indəki `user`. */
  interface User {
    systemRole?: SystemRole;
  }

  interface Session {
    user: {
      id: string;
      systemRole: SystemRole;
    } & DefaultSession["user"];
  }
}

/**
 * ⚠️ `next-auth/jwt` YALNIZ `export * from "@auth/core/jwt"` edir — yəni orada
 * `declare module` yazsan YENİ interfeys yaranır, mövcud `JWT` ilə BİRLƏŞMİR
 * və `token.userId` `unknown` qalır. Genişlənmə interfeysin əsl mənbəyinə
 * tətbiq olunmalıdır.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    systemRole?: SystemRole;
  }
}
