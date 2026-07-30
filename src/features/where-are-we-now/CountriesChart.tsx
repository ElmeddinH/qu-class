"use client";

// ============================================================================
// src/features/where-are-we-now/CountriesChart.tsx
// Spec §13 — "ölkələr üzrə paylanma".
//
// ⚠️ Ölkə adı XAM DEYİL, kanonik yazılışdadır: aqreqasiya "Azerbaycan" və
// "Azərbaycan" variantlarını BİR xanaya yığır və `lib/geo.ts` cədvəlindəki adı
// qaytarır. Burada əlavə çevirmə YOXDUR.
// ============================================================================

import { Globe2 } from "lucide-react";

import { cellTotal, undisclosedTotal, type StatsBucket, type StatsCell } from "@/lib/career-stats";

import { BucketBarChart } from "./BucketBarChart";
import { ChartFrame } from "./ChartFrame";
import { StatsTable } from "./StatsTable";
import { MAP_TAB_META } from "./catalog";

export function CountriesChart({ cell }: { cell: StatsCell<StatsBucket> }) {
  const meta = MAP_TAB_META.countries;
  const data = cell.visible.map((bucket) => ({
    key: bucket.key,
    label: bucket.key,
    count: bucket.count,
  }));

  return (
    <ChartFrame
      title={meta.title}
      description={meta.description}
      icon={Globe2}
      hasData={data.length > 0}
      suppressedCount={cell.undisclosedCount}
      unknownCount={cell.unknownCount}
      tableLabel="ölkələr üzrə paylanma"
      table={
        <StatsTable
          caption="Ölkələr üzrə məzun sayı"
          columnLabel="Ölkə"
          rows={data.map((item) => ({ label: item.label, count: item.count }))}
          undisclosedCount={undisclosedTotal(cell)}
          total={cellTotal(cell)}
        />
      }
    >
      <BucketBarChart data={data} dimensionLabel="Ölkə" />
    </ChartFrame>
  );
}
