import { redirect } from "next/navigation";

import { AdminShell } from "@/layouts/AdminShell";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { SESSION_EXPIRED_PATH } from "@/lib/routes";

/**
 * `(admin)` route qrupu — `UNIVERSITY_ADMIN` TƏLƏB OLUNUR.
 *
 * İki qat qoruma:
 *   1. `src/middleware.ts` (Edge) — token-dəki `systemRole`-a baxır və admin
 *      olmayanı `/home`-a yönləndirir.
 *   2. `requireAdmin()` (bu fayl) — DB-dən oxunmuş `Viewer`-ə baxır və
 *      `forbidden()` ilə 403 verir. Middleware atlansa belə səhifə açılmır.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  // Eyni tələ `(app)` layout-undadır: `/login`-ə birbaşa yönləndirmə kukanı
  // yerində saxlayır və middleware ilə dövrə yaradır (bax `src/lib/routes.ts`).
  const user = await getSessionUser();
  if (!user) redirect(SESSION_EXPIRED_PATH);

  return (
    <AdminShell
      user={{
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isAdmin: true,
      }}
    >
      {children}
    </AdminShell>
  );
}
