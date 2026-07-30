"use client";

// ============================================================================
// src/features/admin/AdminStatsFilters.tsx
// `/admin/stats` — sinif (cohort) seçicisi (Blok 12B).
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 `shallow: false` MƏCBURİDİR
// ────────────────────────────────────────────────────────────────────────────
// Tab seçimi (`?tab=`) eyni aqreqasiyanın fərqli təsviridir → `shallow: true`
// doğrudur. Sinif filtri isə SORĞUNUN ÖZÜNÜ dəyişir: `cohortId` Prisma `where`
// şərtinə girir (`stats.service.ts` → `currentCareerWhere`). `shallow: true`
// qoysaq URL dəyişər, panel isə köhnə (universitet miqyaslı) rəqəmləri
// göstərməyə davam edərdi — səssiz və çox aldadıcı nasazlıq.
//
// 🔴 SÜZGƏC BURADA TƏTBİQ OLUNMUR. Komponent yalnız URL yazır; süzgəc DB
// qatındadır (CLAUDE.md §5). Bütün sətirləri çəkib brauzerdə süzsək
// k-anonimlik FİLTRDƏN ƏVVƏLKİ çoxluğa tətbiq olunardı — 14 nəfərlik sinifdə
// gizlədilməli xana açıq qalardı.
//
// ⚠️ `useQueryState` `NuqsAdapter`-in İÇİNDƏ olmalıdır (`AdminStatsPanel`
// onu mount edir). `(admin)` qrupunda `Providers` YOXDUR — T18.
// ============================================================================

import { useTransition } from "react";
import { useQueryState } from "nuqs";
import { LoaderCircle } from "lucide-react";

import { Label } from "@/components/ui/label";
import { ADMIN_STATS_PARAMS } from "@/lib/admin-stats-filters";

interface AdminStatsFiltersProps {
  cohorts: ReadonlyArray<{ id: string; displayName: string; count: number }>;
  /** Serverdə DOĞRULANMIŞ seçim — kataloqda yoxdursa `null` gəlir. */
  selectedCohortId: string | null;
}

export function AdminStatsFilters({ cohorts, selectedCohortId }: AdminStatsFiltersProps) {
  const [isPending, startTransition] = useTransition();

  const [, setCohort] = useQueryState(ADMIN_STATS_PARAMS.cohort, {
    // 🔴 Server komponenti yenidən işləməlidir — bax fayl başlığı.
    shallow: false,
    // Default («bütün universitet») URL-ə yazılmır — link təmiz qalır.
    clearOnDefault: true,
    startTransition,
  });

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-64 flex-col gap-2">
          <Label htmlFor="admin-stats-cohort" className="text-caption text-text-secondary">
            Sinif
          </Label>
          <select
            id="admin-stats-cohort"
            value={selectedCohortId ?? ""}
            disabled={isPending}
            onChange={(event) => void setCohort(event.target.value || null)}
            className="h-10 rounded-input border border-border bg-surface px-3 text-small text-text-primary"
          >
            <option value="">Bütün universitet</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.displayName} ({cohort.count} üzv)
              </option>
            ))}
          </select>
        </div>

        {isPending ? (
          <p className="flex items-center gap-2 text-caption text-text-secondary">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            Yenilənir…
          </p>
        ) : null}
      </div>

      <p className="text-caption text-text-secondary">
        Filtr baza sorğusuna daxil edilir. K-anonimlik həddi (ən azı 3 nəfər)
        filtrdən SONRA da tətbiq olunur — kiçik sinifdə daha çox xana
        «Açıqlanmayan»a düşəcək və bu, qəsdəndir.
      </p>
    </div>
  );
}
