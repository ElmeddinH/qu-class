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
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
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
