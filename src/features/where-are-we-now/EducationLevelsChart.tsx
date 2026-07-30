"use client";

// ============================================================================
// src/features/where-are-we-now/EducationLevelsChart.tsx
// Spec §13 — "təhsil pillələri üzrə göstəricilər".
//
// ⚠️ SIRA SAYA GÖRƏ DEYİL, PİLLƏYƏ GÖRƏDİR (bakalavr → magistr → doktorantura
// → sertifikat = `DEGREE_VALUES` sırası). Sıralamanı saya görə qursaq oxucu
// pillə şkalasını reytinq kimi oxuyar. Sıralama `lib/career-stats.ts` →
// `orderDegrees` tərəfindən aqreqasiyada edilir; burada YENİDƏN sıralanmır.
//
// ⚠️ Bir nəfər BİR dəfə sayılır: `pickHighestDegree` nəfərin ən yüksək
// pilləsini seçir (magistr + doktorantura → doktorantura). Diplom saymaq
// cəm invariantını sındırardı.
// ============================================================================

import { GraduationCap } from "lucide-react";

import { cellTotal, undisclosedTotal, type StatsBucket, type StatsCell } from "@/lib/career-stats";
import { degreeLabel } from "@/lib/labels";

import { BucketBarChart } from "./BucketBarChart";
import { ChartFrame } from "./ChartFrame";
import { StatsTable } from "./StatsTable";
import { MAP_TAB_META } from "./catalog";

export function EducationLevelsChart({ cell }: { cell: StatsCell<StatsBucket> }) {
  const meta = MAP_TAB_META.education;
  const data = cell.visible.map((bucket) => ({
    key: bucket.key,
    label: degreeLabel(bucket.key),
    count: bucket.count,
  }));

  return (
    <ChartFrame
      title={meta.title}
      description={meta.description}
      icon={GraduationCap}
      hasData={data.length > 0}
      suppressedCount={cell.undisclosedCount}
      unknownCount={cell.unknownCount}
      tableLabel="təhsil pillələri"
      table={
        <StatsTable
          caption="Təhsil pillələri üzrə məzun sayı (pillə sırası ilə)"
          columnLabel="Pillə"
          rows={data.map((item) => ({ label: item.label, count: item.count }))}
          undisclosedCount={undisclosedTotal(cell)}
          total={cellTotal(cell)}
        />
      }
    >
      <BucketBarChart data={data} dimensionLabel="Pillə" />
    </ChartFrame>
  );
}
