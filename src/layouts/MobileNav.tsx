"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Brand } from "./Brand";
import { SidebarNav } from "./SidebarNav";
import type { NavSection } from "./nav";

interface MobileNavProps {
  sections: NavSection[];
  /** Sidebar başlığı altında göstərilən etiket (məs. "Admin paneli") */
  label?: string;
}

/**
 * KUDS §9 — mobil ekranda (< 1024px) sidebar Sheet-ə çevrilir.
 * Masaüstündə tamamilə gizlidir (`md:hidden`), çünki orada sabit sidebar var.
 */
export function MobileNav({ sections, label }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {/* 🔴 `shrink-0` (Blok 12C · 375px ölçüsü). Düymə `size="icon"` ilə
            36×36-dır, amma header-in flex sətrində `flex-shrink: 1` defaultu
            ilə YANINDAKI elementlərə yer verib **16 px enə** sıxılırdı — yəni
            hamburger ikonu kəsilir və toxunma hədəfi WCAG 2.2 AA-nın 24px
            minimumunun altına düşürdü. Ölçü `docs/responsive/report.md`-dədir. */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          aria-label="Naviqasiyanı aç"
        >
          <Menu className="h-6 w-6" aria-hidden />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-sidebar max-w-full border-r-0 bg-ku-dark p-0 [&>button]:text-white"
      >
        <SheetTitle className="sr-only">Naviqasiya</SheetTitle>
        <SheetDescription className="sr-only">
          QU CLASS bölmələri arasında keçid
        </SheetDescription>

        <div className="flex h-full flex-col">
          <div className="flex h-header shrink-0 items-center px-6">
            <Brand tone="light" />
          </div>

          {label ? (
            <p className="px-6 pb-3 text-caption text-ku-soft">{label}</p>
          ) : null}

          <div className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6">
            <SidebarNav sections={sections} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
