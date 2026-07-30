// ============================================================================
// src/features/admin/AdminStatsPanel.tsx
// `/admin/stats` — UNİVERSİTET MİQYASLI «İndi haradayıq?» analitikası.
//
// Blok 10B-nin qalan borcu: `getCareerOutcomeStats` cohort verilmədən onsuz da
// universitet miqyasında işləyirdi, amma UI-ı yox idi. Burada həmin funksiya
// çağırılır və Blok 10B-nin səkkiz görünüşü (`MapTabs`) TƏKRAR İŞLƏDİLİR —
// qrafiklər kopyalanmır.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ G — BURADA DA ŞƏXSƏ BAĞLI SIRALAMA YOXDUR
// ────────────────────────────────────────────────────────────────────────────
// Panel `aggregateCareerStats`-ın nəticəsidir: k-anonimlik (≥ 3 nəfər),
// «Açıqlanmayan» xanası və razılıq qapısı (`includeInStats`) universitet
// miqyasında da EYNİ qüvvədədir. Admin olmaq bu qapıların heç birini açmır —
// funksiya `viewer`-i alır və məxfilik şərtlərini onun üçün qurur.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 SİNİF FİLTRİ SERVİS QATINDADIR (Blok 12B)
// ────────────────────────────────────────────────────────────────────────────
// `cohortId` `getCareerOutcomeStats`-a ötürülür və orada Prisma `where`
// şərtinə girir (`currentCareerWhere` → `user.memberships.some`). JS-də
// süzülmür (CLAUDE.md §5): brauzerdə süzsək k-anonimlik FİLTRDƏN ƏVVƏLKİ
// çoxluğa tətbiq olunardı və 14 nəfərlik kohortda gizlədilməli xana açıq
// qalardı — birbaşa sızma.
//
// ⚠️ MÖVCUDLUQ SERVERDƏ YOXLANILIR: URL-dəki `?cohort=` kataloqda yoxdursa
// filtr NƏZƏRƏ ALINMIR (universitet miqyası). Yoxlamasaq naməlum id ilə sorğu
// boş nəticə verib «bu sinifdə heç kim statistikaya qoşulmayıb» yalanını
// yaradardı.
//
// ⚠️ `NuqsAdapter` YALNIZ BURADA mount olunur. `(admin)` qrupunda `Providers`
// YOXDUR (T18 — `QueryClientProvider` admin panelini 500 verərdi) və o,
// olduğu kimi qalır: bura yalnız URL vəziyyəti adapteri gətirilir, TanStack
// Query GƏTİRİLMİR. Həm `MapTabs`, həm sinif seçicisi adaptersiz işləməz.
// ============================================================================

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { MapPinned, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { MapTabs } from "@/features/where-are-we-now/MapTabs";
import { getViewer } from "@/lib/auth";
import type { MapTab } from "@/lib/map-filters";
import { listAdminCohortOptions } from "@/services/admin-users.service";
import { getCareerOutcomeStats } from "@/services/stats.service";

import { AdminPageHeader } from "./AdminPageHeader";
import { AdminStatsFilters } from "./AdminStatsFilters";

interface AdminStatsPanelProps {
  initialTab: MapTab;
  /** URL-dən gələn XAM dəyər — mövcudluğu burada yoxlanılır. */
  cohortId: string | null;
}

export async function AdminStatsPanel({ initialTab, cohortId }: AdminStatsPanelProps) {
  const viewer = await getViewer();

  const cohorts = await listAdminCohortOptions(viewer);

  // ⚠️ Naməlum id 404 VERMİR — filtr sadəcə düşür (bax fayl başlığı).
  const selected = cohorts.find((cohort) => cohort.id === cohortId) ?? null;

  // ⚠️ `viewerId` verilmir: admin panelində «sənin məlumatın iştirak edir»
  // sətri mənasızdır.
  const stats = await getCareerOutcomeStats(
    viewer,
    selected === null ? {} : { cohortId: selected.id },
  );

  const scopeLabel = selected === null ? "Bütün universitet" : selected.displayName;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Analitika"
        description="Universitet miqyaslı karyera nəticələri. Bütün xanalar k-anonimlik (ən azı 3 nəfər) və «statistikaya daxil et» razılığından keçir — admin olmaq bu qapıları açmır."
      />

      <NuqsAdapter>
        <AdminStatsFilters cohorts={cohorts} selectedCohortId={selected?.id ?? null} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={Users}
            value={stats.respondentCount}
            label="Statistikaya qoşulan məzun"
            hint={`${scopeLabel} · razılıq verən və görünən qeydlər`}
          />
        </div>

        {stats.respondentCount === 0 ? (
          <EmptyState
            icon={MapPinned}
            title={
              selected === null
                ? "Statistika hələ formalaşmayıb"
                : `«${selected.displayName}» üçün statistika yoxdur`
            }
            description={
              selected === null
                ? "Məzunlar karyera qeydini əlavə edib «statistikaya daxil et» seçimini işarələdikcə panel dolacaq."
                : "Bu sinifdə statistikaya razılıq verən görünən qeyd yoxdur. Filtri sıfırlayıb universitet miqyasına baxa bilərsiniz."
            }
            action={{ href: "/admin/stats", label: "Filtri sıfırla" }}
          />
        ) : (
          <MapTabs stats={stats} initialTab={initialTab} />
        )}
      </NuqsAdapter>
    </div>
  );
}
