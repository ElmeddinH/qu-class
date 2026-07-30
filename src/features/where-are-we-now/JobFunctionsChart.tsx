"use client";

// ============================================================================
// src/features/where-are-we-now/JobFunctionsChart.tsx
// Müəllimin BİRBAŞA tələbinin cavabı: «hansı konumda çalışdığını görmək».
//
// 🔴 NİYƏ `position` DEYİL, `jobFunction`: `CareerEntry.position` sərbəst
// mətndir ("Kredit mütəxəssisi", "Baş kredit mütəxəssisi", "Kredit üzrə
// mütəxəssis") və hər yazılış AYRI xana olardı — k-anonimlik onda demək olar
// hər xananı gizlədər və qrafik boş qalardı. `jobFunction` (14 dəyərlik sabit
// taksonomiya, Blok 7B) məhz bunun üçün var.
//
// ⚠️ Etiket `lib/labels.ts` → `jobFunctionLabel`-dandır (CLAUDE.md §6: enum
// etiketləri təkrar yazılmır).
// ============================================================================

import { Briefcase } from "lucide-react";

import { cellTotal, undisclosedTotal, type StatsBucket, type StatsCell } from "@/lib/career-stats";
import { jobFunctionLabel } from "@/lib/labels";

import { BucketBarChart } from "./BucketBarChart";
import { ChartFrame } from "./ChartFrame";
import { StatsTable } from "./StatsTable";
import { MAP_TAB_META } from "./catalog";

export function JobFunctionsChart({ cell }: { cell: StatsCell<StatsBucket> }) {
  const meta = MAP_TAB_META.functions;
  const data = cell.visible.map((bucket) => ({
    key: bucket.key,
    label: jobFunctionLabel(bucket.key),
    count: bucket.count,
  }));

  return (
    <ChartFrame
      title={meta.title}
      description={meta.description}
      icon={Briefcase}
      hasData={data.length > 0}
      suppressedCount={cell.undisclosedCount}
      unknownCount={cell.unknownCount}
      tableLabel="vəzifə istiqamətləri"
      table={
        <StatsTable
          caption="Vəzifə istiqamətləri üzrə məzun sayı"
          columnLabel="İstiqamət"
          rows={data.map((item) => ({ label: item.label, count: item.count }))}
          undisclosedCount={undisclosedTotal(cell)}
          total={cellTotal(cell)}
        />
      }
    >
      <BucketBarChart data={data} dimensionLabel="İstiqamət" />
    </ChartFrame>
  );
}
