import { redirect } from "next/navigation";

import { AdminShell } from "@/layouts/AdminShell";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/routes";

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

  const user = await getSessionUser();
  if (!user) redirect(LOGIN_PATH);

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
