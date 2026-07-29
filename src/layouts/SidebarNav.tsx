"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_ICONS, type NavSection } from "./nav";

interface SidebarNavProps {
  sections: NavSection[];
  /** Mobil Sheet-də linkə basanda paneli bağlamaq üçün */
  onNavigate?: () => void;
  className?: string;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar naviqasiyası — tünd fon (ku-dark) üzərində işləmək üçün nəzərdə
 * tutulub. Həm masaüstü sidebar-da, həm də mobil Sheet-də eyni komponent
 * işlədilir ki, iki naviqasiya bir-birindən ayrılmasın.
 */
export function SidebarNav({ sections, onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-6", className)} aria-label="Əsas naviqasiya">
      {sections.map((section, index) => (
        <div key={section.title ?? `section-${index}`} className="flex flex-col gap-1">
          {section.title ? (
            <h2 className="px-3 pb-1 text-caption font-medium uppercase tracking-wide text-ku-soft/70">
              {section.title}
            </h2>
          ) : null}

          {section.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = NAV_ICONS[item.icon];

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-btn px-3 py-2 text-small transition-colors",
                  active
                    ? "bg-ku-green font-medium text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                {/* KUDS §19: naviqasiya ikonu 24px */}
                <Icon className="h-6 w-6 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
