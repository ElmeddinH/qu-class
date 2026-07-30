// ============================================================================
// src/features/where-are-we-now/WhereAreWeNowPanel.tsx
// "İndi haradayıq?" [M11] ekranı — spec §13.
//
// Səhifə (`app/(app)/class/[slug]/map/page.tsx`) NAZİKDİR (CLAUDE.md §8):
// cohort-u yoxlayır, URL-i `parseMapParams` ilə oxuyur və buranı render edir.
// `prisma.*` burada YOXDUR — data `services/stats.service`-dəndir.
//
// 🔴 AQREQASİYA TƏK DƏFƏ, TƏK KEÇİDDƏ ÇAĞIRILIR (TƏLƏ A). Səkkiz görünüş EYNİ
// nəticənin təsviridir; hər tab üçün ayrı sorğu getsəydi xanalar fərqli sətir
// çoxluqları üzərində hesablanar və bir-birinə uyğun gəlməzdi.
//
// ⚠️ Nəticə client komponentinə (`MapTabs`) PROP kimi ötürülür — sadə obyektdir
// (funksiya / Date yoxdur), server → client sərhədindən keçir.
// ============================================================================

import { MapPinned, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { getViewer } from "@/lib/auth";
import { UserStage } from "@/lib/enums";
import type { MapFilterState } from "@/lib/map-filters";
import type { CohortHeader } from "@/services/cohort.service";
import { getCareerOutcomeStats } from "@/services/stats.service";

import { ConsentNotice } from "./ConsentNotice";
import { MapTabs } from "./MapTabs";

interface WhereAreWeNowPanelProps {
  cohort: CohortHeader;
  /** Serverdə oxunmuş tab — ilk render doğru görünüşlə açılsın (URL paylaşıla bilər). */
  filters: MapFilterState;
}

export async function WhereAreWeNowPanel({ cohort, filters }: WhereAreWeNowPanelProps) {
  const viewer = await getViewer();

  const stats = await getCareerOutcomeStats(viewer, {
    cohortId: cohort.id,
    viewerId: viewer.kind === "USER" ? viewer.userId : undefined,
  });

  const hasAnything = stats.respondentCount > 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-h1 font-bold text-text-primary">İndi haradayıq?</h1>
        <p className="text-body text-text-secondary">
          {cohort.displayName} · məzunların hansı ölkədə, hansı şəhərdə və hansı konumda
          çalışdığının aqreqasiya olunmuş mənzərəsi.
        </p>
      </header>

      <ConsentNotice stats={stats} />

      {!hasAnything ? (
        <EmptyState
          icon={MapPinned}
          title="Statistika hələ formalaşmayıb"
          description={
            cohort.stage === UserStage.ALUMNI
              ? "Sinif yoldaşları karyera məlumatını əlavə edib «statistikaya daxil et» seçimini işarələdikcə xəritə və qrafiklər dolacaq."
              : "Bu panel əsasən məzuniyyətdən sonra doldurulur. Karyera qeydini indidən əlavə edə bilərsiniz — statistikaya qoşulmaq ayrıca seçimdir."
          }
          action={{ href: "/me/career", label: "Karyera məlumatım" }}
        />
      ) : (
        <>
          {/* Xülasə zolağı: N məzun · X ölkə · Y şirkət */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={Users}
              value={stats.respondentCount}
              label="məzun statistikada"
              hint="aqreqasiyaya razılıq verib"
            />
            <StatCard
              icon={MapPinned}
              value={stats.countries.visible.length}
              label="açıqlanan ölkə"
              hint="kiçik qruplar birləşdirilib"
            />
            <StatCard
              icon={Users}
              value={stats.companies.visible.length}
              label="açıqlanan işəgötürən"
              hint="ən azı 3 məzun çalışan"
            />
          </div>

          <MapTabs stats={stats} initialTab={filters.tab} />
        </>
      )}
    </div>
  );
}
