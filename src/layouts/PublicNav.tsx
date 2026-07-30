"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Brand } from "./Brand";
import { PUBLIC_NAV } from "./nav";

function useLinkClass() {
  const pathname = usePathname();

  return (href: string) => {
    // ⚠️ Anchor linki (`/#events`) HEÇ VAXT aktiv işarələnmir. `usePathname()`
    // hash qaytarmır, yəni bərabərlik onsuz da tutmazdı — amma bu, təsadüf
    // olmamalıdır: altı linkin hamısı `/`-a baxır, biri "aktiv" seçilsəydi
    // qalan beşi də eyni haqqa malik olardı. Bölmə seçimi scroll ilə görünür.
    // Blok 11-də linklər real səhifələrə qayıdanda bu şaxə özü söhnür.
    const isAnchor = href.startsWith("/#");
    const active = !isAnchor && (pathname === href || pathname.startsWith(`${href}/`));

    return cn(
      "rounded-btn px-3 py-2 text-small transition-colors",
      active
        ? "bg-ku-soft font-medium text-ku-dark"
        : "text-text-secondary hover:bg-muted hover:text-ku-dark",
    );
  };
}

/** Masaüstü header naviqasiyası (< 1024px-də gizlidir). */
export function PublicNavLinks() {
  const linkClass = useLinkClass();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Əsas naviqasiya">
      {PUBLIC_NAV.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass(item.href)}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobil menyu — KUDS §9: kiçik ekranda naviqasiya Sheet-ə keçir. */
export function PublicMobileMenu() {
  const linkClass = useLinkClass();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Menyunu aç"
        >
          <Menu className="h-6 w-6" aria-hidden />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-sidebar max-w-full bg-surface p-0">
        <SheetTitle className="sr-only">Menyu</SheetTitle>
        <SheetDescription className="sr-only">
          QU CLASS ictimai bölmələri
        </SheetDescription>

        <div className="flex h-full flex-col">
          <div className="flex h-header shrink-0 items-center border-b border-border px-6">
            <Brand />
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={linkClass(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2 border-t border-border p-4">
            {/* KUDS §11: Secondary = outline */}
            <Button variant="outline" asChild>
              <Link href="/login" onClick={() => setOpen(false)}>
                Daxil ol
              </Link>
            </Button>
            <Button asChild>
              <Link href="/register" onClick={() => setOpen(false)}>
                Qeydiyyat
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
