"use client";

// ============================================================================
// src/components/shared/PrintButton.tsx
// «Çap et / PDF kimi saxla» — `window.print()` çağırışı.
//
// ⚠️ NİYƏ AYRICA FAYL: çağıran ekranlar (`EventReport`, `ClassYearbook`) SERVER
// komponentidir və `onClick` funksiyası server → client sərhədindən keçə
// bilmir (CLAUDE.md §12 — "Functions cannot be passed directly to Client
// Components"). Tək düymə üçün bütün səhifəni client-ə çevirmək əvəzinə
// yalnız düymə ayrılır.
//
// NİYƏ `shared/`-dədir: Blok 9-da `features/events/manage/`-də yaranmışdı,
// Blok 10A-da Digital Yearbook ikinci istifadəçi oldu. `features/*`
// qovluqları bir-birindən import etmir (istiqamət features → shared), ona görə
// ortaq hissə bura çıxarıldı — `PagerNav` ilə eyni nümunə.
//
// ⚠️ Düymənin ÖZÜ çapda görünməməlidir → `print:hidden`.
// ============================================================================

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrintButtonProps {
  children: React.ReactNode;
  /** İkonsuz variant — hesabat düyməsi ikonsuz idi, davranış qorunur. */
  withIcon?: boolean;
  className?: string;
}

export function PrintButton({ children, withIcon = false, className }: PrintButtonProps) {
  return (
    <Button
      type="button"
      className={cn("gap-2 print:hidden", className)}
      onClick={() => window.print()}
    >
      {withIcon ? <Printer className="h-4 w-4" aria-hidden /> : null}
      {children}
    </Button>
  );
}
