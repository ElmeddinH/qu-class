"use client";

// ============================================================================
// src/features/content/FaqSearch.tsx
// FAQ axtarış sahəsi — URL vəziyyətini yeniləyən YEGANƏ client parçası.
//
// 🔴 NƏTİCƏLƏR BURADA SÜZÜLMÜR. Süzgəc SERVER komponentindədir
// (`FaqScreen` → `filterFaqs`), bu komponent yalnız `?q=` parametrini yazır.
// Səbəb: nəticələr client-də süzülsəydi (a) linki paylaşan adam başqa nəticə
// görərdi, (b) JS-siz brauzerdə axtarış işləməzdi — formanın `method="get"`
// davranışı isə hər iki halda işləyir.
//
// ⚠️ Ona görə `<form action="/faq" method="get">`: JS yüklənməsə də düymə
// işləyir (progressive enhancement). `useRouter` yalnız «təmizlə» düyməsi üçün
// lazımdır və o da linkdir.
//
// ⚠️ Kateqoriya seçimi FORMANIN İÇİNDƏ gizli sahədir — axtarış edərkən aktiv
// kateqoriya İTMƏMƏLİDİR (Blok 6-nın filtr dərsi: bir filtr digərini səssizcə
// sıfırlayırdı).
// ============================================================================

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FAQ_PARAMS, faqHref, type FaqFilterState } from "@/lib/faq-filters";

interface FaqSearchProps {
  filters: FaqFilterState;
}

export function FaqSearch({ filters }: FaqSearchProps) {
  return (
    <form action="/faq" method="get" className="flex flex-wrap items-end gap-3">
      {filters.category ? (
        <input type="hidden" name={FAQ_PARAMS.category} value={filters.category} />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label htmlFor="faq-search" className="text-small font-medium text-text-primary">
          Suallarda axtar
        </label>
        <Input
          id="faq-search"
          type="search"
          name={FAQ_PARAMS.q}
          defaultValue={filters.query ?? ""}
          placeholder="məsələn: yataqxana, məxfilik, təqaüd"
          className="w-full"
        />
      </div>

      <Button type="submit">
        <Search className="h-4 w-4" aria-hidden />
        Axtar
      </Button>

      {filters.query !== null ? (
        <Button variant="outline" asChild>
          {/* Kateqoriya SAXLANILIR — yalnız axtarış sözü atılır. */}
          <a href={faqHref({ ...filters, query: null })}>
            <X className="h-4 w-4" aria-hidden />
            Axtarışı təmizlə
          </a>
        </Button>
      ) : null}
    </form>
  );
}
