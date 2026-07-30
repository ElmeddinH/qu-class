// ============================================================================
// src/features/admin/AdminStatsPanel.tsx
// `/admin/stats` — UNİVERSİTET MİQYASLI «İndi haradayıq?» analitikası.
//
// Blok 10B-nin qalan borcu: `getCareerOutcomeStats` cohort verilmədən onsuz da
// universitet miqyasında işləyirdi, amma UI-ı yox idi. Burada həmin funksiya
// `cohortId` OLMADAN çağırılır və Blok 10B-nin səkkiz görünüşü (`MapTabs`)
// TƏKRAR İŞLƏDİLİR — qrafiklər kopyalanmır.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ G — BURADA DA ŞƏXSƏ BAĞLI SIRALAMA YOXDUR
// ────────────────────────────────────────────────────────────────────────────
// Panel `aggregateCareerStats`-ın nəticəsidir: k-anonimlik (≥ 3 nəfər),
// «Açıqlanmayan» xanası və razılıq qapısı (`includeInStats`) universitet
// miqyasında da EYNİ qüvvədədir. Admin olmaq bu qapıların heç birini açmır —
// funksiya `viewer`-i alır və məxfilik şərtlərini onun üçün qurur.
//
// ⚠️ `NuqsAdapter` YALNIZ BURADA mount olunur. `(admin)` qrupunda `Providers`
// YOXDUR (T18 — `QueryClientProvider` admin panelini 500 verərdi) və o,
// olduğu kimi qalır: bura yalnız URL vəziyyəti adapteri gətirilir, TanStack
// Query GƏTİRİLMİR. `MapTabs` tab seçimini URL-də saxlayır və adaptersiz
// işləməz.
// ============================================================================

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { MapPinned, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { MapTabs } from "@/features/where-are-we-now/MapTabs";
import { getViewer } from "@/lib/auth";
import type { MapTab } from "@/lib/map-filters";
import { getCareerOutcomeStats } from "@/services/stats.service";

import { AdminPageHeader } from "./AdminPageHeader";

export async function AdminStatsPanel({ initialTab }: { initialTab: MapTab }) {
  const viewer = await getViewer();

  // ⚠️ `cohortId` VERİLMİR → universitet miqyası. `viewerId` də verilmir:
  // admin panelində «sənin məlumatın iştirak edir» sətri mənasızdır.
  const stats = await getCareerOutcomeStats(viewer, {});

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Analitika"
        description="Universitet miqyaslı karyera nəticələri. Bütün xanalar k-anonimlik (ən azı 3 nəfər) və «statistikaya daxil et» razılığından keçir — admin olmaq bu qapıları açmır."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Users}
          value={stats.respondentCount}
          label="Statistikaya qoşulan məzun"
          hint="Razılıq verən və görünən qeydlər"
        />
      </div>

      {stats.respondentCount === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="Statistika hələ formalaşmayıb"
          description="Məzunlar karyera qeydini əlavə edib «statistikaya daxil et» seçimini işarələdikcə panel dolacaq."
          action={{ href: "/admin/cohorts", label: "Siniflər" }}
        />
      ) : (
        <NuqsAdapter>
          <MapTabs stats={stats} initialTab={initialTab} />
        </NuqsAdapter>
      )}
    </div>
  );
}
