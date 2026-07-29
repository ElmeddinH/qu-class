"use client";

// ============================================================================
// src/features/directory/filter-state.ts
// Kataloq filtrlərinin URL vəziyyəti — `nuqs` (adapter: `app/providers.tsx`).
//
// 🔴 PARAMETR ADLARI VƏ FORMATI `src/lib/directory-filters.ts` İLƏ EYNİ
// OLMALIDIR. Server tərəf URL-i `parseDirectoryParams` ilə oxuyur, səhifələmə
// linkləri `serializeDirectoryParams` ilə qurulur, bu fayl isə həmin URL-i
// client-dən yazır. Üçü ayrılsa filtr "işləyir, amma nəticə dəyişmir" olur —
// ən çətin tapılan səhv növü. Dövrə testlə bərkidilib
// (`directory-filters.test.ts`).
//
// ⚠️ `shallow: false` MƏCBURİDİR: filtr URL-də dəyişəndə SERVER komponenti
// yenidən işə düşməlidir, çünki süzgəc DB-dədir (JS-də filtrləmə qadağandır).
// `shallow: true` qoysan URL dəyişər, nəticə isə köhnə qalar.
//
// ⚠️ `parseAsArrayOf` vergüllə ayırır — `serializeDirectoryParams`-dakı
// `MULTI_SEPARATOR` ilə eynidir.
// ============================================================================

import { useCallback, useMemo } from "react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";

import {
  DIRECTORY_FILTERS,
  FIRST_PAGE,
  type DirectoryFilterState,
} from "@/lib/directory-filters";
import { USER_STAGE_VALUES, type UserStage } from "@/lib/enums";

/** Açar adları `DIRECTORY_FILTERS[key].param` ilə eynidir (hər ikisi `key`). */
export const DIRECTORY_PARSERS = {
  [DIRECTORY_FILTERS.name.param]: parseAsString,
  [DIRECTORY_FILTERS.faculty.param]: parseAsString,
  [DIRECTORY_FILTERS.program.param]: parseAsString,
  [DIRECTORY_FILTERS.admissionYear.param]: parseAsInteger,
  [DIRECTORY_FILTERS.graduationYear.param]: parseAsInteger,
  [DIRECTORY_FILTERS.city.param]: parseAsString,
  [DIRECTORY_FILTERS.country.param]: parseAsString,
  [DIRECTORY_FILTERS.industry.param]: parseAsString,
  [DIRECTORY_FILTERS.company.param]: parseAsString,
  [DIRECTORY_FILTERS.interest.param]: parseAsArrayOf(parseAsString),
  [DIRECTORY_FILTERS.language.param]: parseAsArrayOf(parseAsString),
  [DIRECTORY_FILTERS.club.param]: parseAsArrayOf(parseAsString),
  [DIRECTORY_FILTERS.status.param]: parseAsStringLiteral(USER_STAGE_VALUES),
  page: parseAsInteger,
};

/** Bir dəfəyə yazıla bilən dəyişikliklər. `null` → parametr URL-dən silinir. */
export interface DirectoryUrlPatch {
  name?: string | null;
  faculty?: string | null;
  program?: string | null;
  admissionYear?: number | null;
  graduationYear?: number | null;
  city?: string | null;
  country?: string | null;
  industry?: string | null;
  company?: string | null;
  interest?: string[] | null;
  language?: string[] | null;
  club?: string[] | null;
  status?: UserStage | null;
  page?: number | null;
}

/** "Hamısını təmizlə" — 13 filtr + səhifə. */
const RESET_PATCH: DirectoryUrlPatch = {
  name: null,
  faculty: null,
  program: null,
  admissionYear: null,
  graduationYear: null,
  city: null,
  country: null,
  industry: null,
  company: null,
  interest: null,
  language: null,
  club: null,
  status: null,
  page: null,
};

export interface DirectoryFilterController {
  /** Cari vəziyyət — serverdəki `parseDirectoryParams` nəticəsi ilə eyni forma. */
  state: DirectoryFilterState;
  /** Bir və ya bir neçə filtri dəyişir; səhifə həmişə 1-ə qayıdır. */
  patch: (values: DirectoryUrlPatch) => void;
  /** `multi` filtrdə dəyəri əlavə edir / çıxarır. */
  toggleMulti: (key: "interest" | "language" | "club", value: string) => void;
  clearAll: () => void;
}

export function useDirectoryFilters(): DirectoryFilterController {
  const [values, setValues] = useQueryStates(DIRECTORY_PARSERS, {
    // Süzgəc DB-dədir → server komponenti yenidən render olunmalıdır.
    shallow: false,
    // Default (`null`) dəyər URL-ə yazılmır — paylaşılan link təmiz qalır.
    clearOnDefault: true,
  });

  const state = useMemo<DirectoryFilterState>(
    () => ({
      name: (values.name as string | null) ?? null,
      faculty: (values.faculty as string | null) ?? null,
      program: (values.program as string | null) ?? null,
      admissionYear: (values.admissionYear as number | null) ?? null,
      graduationYear: (values.graduationYear as number | null) ?? null,
      city: (values.city as string | null) ?? null,
      country: (values.country as string | null) ?? null,
      industry: (values.industry as string | null) ?? null,
      company: (values.company as string | null) ?? null,
      interest: (values.interest as string[] | null) ?? [],
      language: (values.language as string[] | null) ?? [],
      club: (values.club as string[] | null) ?? [],
      status: (values.status as UserStage | null) ?? null,
      page: (values.page as number | null) ?? FIRST_PAGE,
    }),
    [values],
  );

  const patch = useCallback(
    (next: DirectoryUrlPatch) => {
      // Filtr dəyişəndə səhifə SIFIRLANIR: 5-ci səhifədə şəhəri dəyişən
      // istifadəçi çox vaxt boş səhifəyə düşərdi.
      void setValues({ page: null, ...next });
    },
    [setValues],
  );

  const toggleMulti = useCallback(
    (key: "interest" | "language" | "club", value: string) => {
      const current = state[key];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      // Hesablanmış açar TS-də `{ [x: string]: … }` kimi çıxarılır — açar tipi
      // union olduğu üçün çevirmə lazımdır. Üç açar da `string[] | null` qəbul
      // edir, yəni çevirmə dəyər tipini gizlətmir.
      patch({ [key]: next.length === 0 ? null : next } as DirectoryUrlPatch);
    },
    [patch, state],
  );

  const clearAll = useCallback(() => {
    void setValues(RESET_PATCH);
  }, [setValues]);

  return { state, patch, toggleMulti, clearAll };
}
