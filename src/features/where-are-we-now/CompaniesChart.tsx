"use client";

// ============================================================================
// src/features/where-are-we-now/CompaniesChart.tsx
// Spec §13 — "şirkətlər üzrə statistika".
//
// 🔴 BU GÖRÜNÜŞ ŞİRKƏT–ŞƏXS BAĞINI GÖSTƏRMİR. Yalnız "bu təşkilatda N məzun
// çalışır" cümləsi var; N həmişə ≥ 3-dür və adlar YOXDUR. "Kim?" sualının
// cavabı bu səthdə mövcud deyil — kim hansı şirkətdə işlədiyini yalnız həmin
// şəxsin ÖZ profilində (görünürlük səviyyəsindən keçirsə) görmək olar.
//
// ⚠️ Şirkət adı SƏRBƏST MƏTNDİR (istifadəçi yazır), ona görə burada enum
// etiketi YOXDUR — dəyər olduğu kimi göstərilir.
// ============================================================================

import { Building2 } from "lucide-react";

import { cellTotal, undisclosedTotal, type StatsBucket, type StatsCell } from "@/lib/career-stats";

import { BucketBarChart } from "./BucketBarChart.lazy";
import { ChartFrame } from "./ChartFrame";
import { StatsTable } from "./StatsTable";
import { MAP_TAB_META } from "./catalog";

export function CompaniesChart({ cell }: { cell: StatsCell<StatsBucket> }) {
  const meta = MAP_TAB_META.companies;
  const data = cell.visible.map((bucket) => ({
    key: bucket.key,
    label: bucket.key,
    count: bucket.count,
  }));

  return (
    <ChartFrame
      title={meta.title}
      description={meta.description}
      icon={Building2}
      hasData={data.length > 0}
      suppressedCount={cell.undisclosedCount}
      unknownCount={cell.unknownCount}
      tableLabel="işəgötürənlər üzrə statistika"
      table={
        <StatsTable
          caption="İşəgötürənlər üzrə məzun sayı"
          columnLabel="Təşkilat"
          rows={data.map((item) => ({ label: item.label, count: item.count }))}
          undisclosedCount={undisclosedTotal(cell)}
          total={cellTotal(cell)}
        />
      }
    >
      <BucketBarChart data={data} dimensionLabel="Təşkilat" />
    </ChartFrame>
  );
}
