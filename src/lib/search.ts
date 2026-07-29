// ============================================================================
// src/lib/search.ts
// Qlobal axtarışın MÜQAVİLƏSİ [M16] — tiplər, limitlər, boş nəticə.
//
// 🔴 NİYƏ SERVİSDƏN AYRIDIR: bu modul HƏM serverdə (`search.service`,
// `/api/search`), HƏM də client-də (⌘K palitrası, `/search` ekranı) işlədilir.
// Sabitləri servisdən import etsək client paketi `services/*` → `lib/db` →
// Prisma zəncirini dartıb gətirər. Servis qatı yalnız serverdə qalmalıdır.
//
// Modul SAFDIR: Prisma, React, next/* — heç biri yoxdur. Forma JSON-təhlükə-
// sizdir (`Date` yoxdur): route handler cavabı olduğu kimi qaytarır.
// ============================================================================

/** Palitrada və `/search` səhifəsində göstərilən vahid nəticə forması. */
export interface SearchHit {
  id: string;
  title: string;
  subtitle: string | null;
  /** Nəticəyə klikləyəndə açılan ünvan. */
  href: string;
}

/** Dörd növ — hər biri öz servisindən və öz görünürlük köməkçisindən keçir. */
export interface SearchResults {
  users: SearchHit[];
  posts: SearchHit[];
  events: SearchHit[];
  achievements: SearchHit[];
}

/** ⌘K palitrasında növ başına maksimum nəticə. */
export const PALETTE_LIMIT = 5;

/** `/search` tam nəticə səhifəsində növ başına limit. */
export const SEARCH_PAGE_LIMIT = 20;

/** Axtarış üçün minimum sorğu uzunluğu — bir hərf bütün bazanı gətirər. */
export const MIN_SEARCH_LENGTH = 2;

export const EMPTY_SEARCH_RESULTS: SearchResults = {
  users: [],
  posts: [],
  events: [],
  achievements: [],
};

export function searchResultCount(results: SearchResults): number {
  return (
    results.users.length +
    results.posts.length +
    results.events.length +
    results.achievements.length
  );
}

/** Sorğu axtarışa başlamaq üçün kifayət edirmi? */
export function isSearchable(term: string): boolean {
  return term.trim().length >= MIN_SEARCH_LENGTH;
}
