import { PublicShell } from "@/layouts/PublicShell";

/**
 * `(public)` route qrupu — giriş etməmiş ziyarətçilər üçün.
 *
 * ⚠️ Route qrupu URL-də GÖRÜNMÜR: `(public)/page.tsx` → `/`,
 * `(public)/login/page.tsx` → `/login`. Ünvanlar dəyişmir.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
