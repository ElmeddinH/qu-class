"use client";

// ============================================================================
// src/features/events/manage/PrintButton.tsx
// «Çap et» — `window.print()` çağırışı.
//
// ⚠️ NİYƏ AYRICA FAYL: `EventReport` SERVER komponentidir və `onClick`
// funksiyası server → client sərhədindən keçə bilmir (CLAUDE.md §12 —
// "Functions cannot be passed directly to Client Components"). Tək düymə
// üçün bütün hesabatı client-ə çevirmək əvəzinə yalnız düymə ayrılır.
// ============================================================================

import { Button } from "@/components/ui/button";

export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <Button
      type="button"
      className="gap-2"
      onClick={() => window.print()}
    >
      {children}
    </Button>
  );
}
