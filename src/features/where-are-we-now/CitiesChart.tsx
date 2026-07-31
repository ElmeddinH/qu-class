"use client";

// ============================================================================
// src/features/where-are-we-now/CitiesChart.tsx
// Spec §13 — "şəhərlər üzrə paylanma".
//
// ⚠️ ETİKET «şəhər (ölkə)» FORMASINDADIR: eyni adlı şəhərlər fərqli ölkələrdə
// ola bilər və aqreqasiya onları AYRI xana kimi saxlayır (açar `ölkə|şəhər`).
// Etiketdə ölkəni yazmasaq iki fərqli xana ekranda eyni görünərdi.
// ============================================================================

import { MapPin } from "lucide-react";

import { cellTotal, undisclosedTotal, type StatsCell, type CityBucket } from "@/lib/career-stats";

import { BucketBarChart } from "./BucketBarChart.lazy";
import { ChartFrame } from "./ChartFrame";
import { StatsTable } from "./StatsTable";
import { MAP_TAB_META } from "./catalog";

export function CitiesChart({ cell }: { cell: StatsCell<CityBucket> }) {
  const meta = MAP_TAB_META.cities;
  const data = cell.visible.map((bucket) => ({
    key: `${bucket.country}|${bucket.city}`,
    label: `${bucket.city} (${bucket.country})`,
    count: bucket.count,
  }));

  return (
    <ChartFrame
      title={meta.title}
      description={meta.description}
      icon={MapPin}
      hasData={data.length > 0}
      suppressedCount={cell.undisclosedCount}
      unknownCount={cell.unknownCount}
      tableLabel="şəhərlər üzrə paylanma"
      table={
        <StatsTable
          caption="Şəhərlər üzrə məzun sayı"
          columnLabel="Şəhər"
          rows={data.map((item) => ({ label: item.label, count: item.count }))}
          undisclosedCount={undisclosedTotal(cell)}
          total={cellTotal(cell)}
        />
      }
    >
      <BucketBarChart data={data} dimensionLabel="Şəhər" />
    </ChartFrame>
  );
}
