import { redirect } from "next/navigation";

import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/app/providers";
import { AppShell } from "@/layouts/AppShell";
import { getPrimaryCohort, getSessionUser, requireUser } from "@/lib/auth";
import { SystemRole } from "@/lib/enums";
import { SESSION_EXPIRED_PATH } from "@/lib/routes";

/**
 * `(app)` route qrupu — giriş TƏLƏB OLUNUR.
 *
 * Middleware artıq eyni yoxlamanı Edge-də edir; bu, ikinci qatdır (middleware
 * matcher-inin kənarında qalan hallar üçün) və eyni zamanda header/naviqasiya
 * üçün istifadəçi məlumatını yükləyir.
 *
 * ⚠️ Route qrupu URL-ə TƏSİR ETMİR: `(app)/kuds` → `/kuds` olaraq qalır.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireUser();

  const [user, cohort] = await Promise.all([getSessionUser(), getPrimaryCohort()]);

  // 🔴 Sessiya token-i keçərlidir, amma istifadəçi DB-də yoxdur (hesab
  // silinib / baza yenidən seed edilib) → kuka təmizlənməlidir.
  //
  // ⚠️ BURADA `redirect(LOGIN_PATH)` YAZMA — kuka yerində qaldığı üçün
  // middleware onu dərhal `/home`-a qaytarır və brauzer iki ünvan arasında
  // sonsuz dövrəyə düşür (ağ ekran). `SESSION_EXPIRED_PATH` əvvəlcə kukanı
  // silir, sonra `/login`-ə göndərir — bax `src/lib/routes.ts`.
  if (!user) redirect(SESSION_EXPIRED_PATH);

  return (
    <Providers>
      <AppShell
        user={{
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          avatarUrl: user.avatarUrl,
          isAdmin: viewer.systemRole === SystemRole.UNIVERSITY_ADMIN,
        }}
        cohortSlug={cohort?.slug ?? null}
      >
        {children}
        {/* Server Action nəticələri üçün toast qabı (məs. /me/privacy). */}
        <Toaster position="bottom-right" />
      </AppShell>
    </Providers>
  );
}
