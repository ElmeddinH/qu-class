import { DashboardShell } from "./DashboardShell";
import type { HeaderUser } from "./UserMenu";
import { buildAppNav } from "./nav";

interface AppShellProps {
  children: React.ReactNode;
  user: HeaderUser;
  /**
   * İstifadəçinin əsas cohort slug-ı — sinif linkləri bundan qurulur.
   * `null` olarsa (hələ sinfə bağlanmamış istifadəçi) sinif bölməsi gizlənir.
   */
  cohortSlug: string | null;
}

/**
 * Giriş etmiş istifadəçilər üçün əsas karkas — KUDS §8:
 * 280px sol sidebar + 72px üst header. Mobil ekranda sidebar Sheet-ə keçir.
 *
 * ⚠️ Bu komponent icazə YOXLAMIR — `src/app/(app)/layout.tsx`-dəki
 * `requireUser()` qapısıdır.
 */
export function AppShell({ children, user, cohortSlug }: AppShellProps) {
  return (
    <DashboardShell
      sections={buildAppNav(cohortSlug)}
      user={user}
      searchPlaceholder="Sinif yoldaşı, post və ya tədbir axtar..."
    >
      {children}
    </DashboardShell>
  );
}
