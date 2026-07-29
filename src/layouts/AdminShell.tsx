import { DashboardShell } from "./DashboardShell";
import type { HeaderUser } from "./UserMenu";
import { ADMIN_NAV } from "./nav";

interface AdminShellProps {
  children: React.ReactNode;
  user: HeaderUser;
}

/**
 * AppShell-in admin variantı — eyni KUDS karkası (280px sidebar + 72px header),
 * yalnız naviqasiya `ADMIN_NAV`-dan gəlir və sidebar-da "Admin paneli" etiketi olur.
 *
 * ⚠️ Bu komponent icazə YOXLAMIR — `src/app/(admin)/layout.tsx`-dəki
 * `requireAdmin()` qapısıdır (middleware isə birinci süzgəcdir).
 */
export function AdminShell({ children, user }: AdminShellProps) {
  return (
    <DashboardShell
      sections={ADMIN_NAV}
      user={user}
      label="Admin paneli"
      searchPlaceholder="İstifadəçi, cohort və ya şikayət axtar..."
    >
      {children}
    </DashboardShell>
  );
}
