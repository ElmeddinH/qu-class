import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/features/search/CommandPalette";
import { cn } from "@/lib/utils";
import { Brand } from "./Brand";
import { MobileNav } from "./MobileNav";
import { SidebarNav } from "./SidebarNav";
import { SkipLink } from "./SkipLink";
import { UserMenu, type HeaderUser } from "./UserMenu";
import type { NavSection } from "./nav";

export interface DashboardShellProps {
  sections: NavSection[];
  children: React.ReactNode;
  /** Header-dəki istifadəçi menyusu — giriş etmiş istifadəçinin real profili */
  user: HeaderUser;
  /** Sidebar loqosu altında görünən etiket — AdminShell-də "Admin paneli" */
  label?: string;
  /** Axtarış sahəsinin placeholder mətni */
  searchPlaceholder?: string;
  className?: string;
}

/**
 * KUDS §8/§16 sabit karkası: 280px sol sidebar + 72px üst header.
 * `AppShell` və `AdminShell` bunun üzərində qurulur — iyerarxiya bütün
 * sistemlərdə eynidir, yalnız naviqasiya elementləri dəyişir.
 *
 * Bu komponent birbaşa işlədilmir; `AppShell` / `AdminShell` işlət.
 */
export function DashboardShell({
  sections,
  children,
  user,
  label,
  searchPlaceholder = "Axtar...",
  className,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <SkipLink />

      {/* --- Sidebar (masaüstü) — KUDS §8: 280px, fon ku-dark --- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-sidebar flex-col border-r border-border bg-ku-dark md:flex">
        <div className="flex h-header shrink-0 items-center px-6">
          <Brand tone="light" />
        </div>

        {label ? (
          <p className="px-6 pb-3 text-caption text-ku-soft">{label}</p>
        ) : null}

        <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6">
          <SidebarNav sections={sections} />
        </div>
      </aside>

      {/* --- Header — KUDS §8: 72px --- */}
      <header className="fixed inset-x-0 top-0 z-30 h-header border-b border-border bg-surface md:left-sidebar">
        <div className="flex h-full items-center gap-3 px-4 md:px-8">
          <MobileNav sections={sections} label={label} />

          <div className="md:hidden">
            <Brand />
          </div>

          {/* Axtarış sahəsi INPUT DEYİL — ⌘K palitrasının tetiyidir [M16].
              Bax `features/search/CommandPalette`. */}
          <div className="ml-auto flex w-full max-w-sm items-center md:ml-0">
            <div className="hidden w-full sm:block">
              <CommandPalette placeholder={searchPlaceholder} />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Bildirişlər" asChild>
              <Link href="/notifications">
                <Bell className="h-6 w-6" aria-hidden />
              </Link>
            </Button>
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      {/* --- Məzmun — KUDS §8: content padding 32px --- */}
      <main id="main" className={cn("pt-header md:pl-sidebar", className)}>
        <div className="mx-auto w-full max-w-content p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
