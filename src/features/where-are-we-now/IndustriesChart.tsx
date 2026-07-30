"use client";

// ============================================================================
// src/features/where-are-we-now/IndustriesChart.tsx
// Spec §13 — "sənaye sahələri üzrə diaqram" (donut).
//
// ⚠️ DONUT HİSSƏ-BÜTÖV münasibətini göstərir: "məzunların hansı payı hansı
// sektordadır". Ona görə mərkəzdə CƏM yazılır — bucaqları gözlə toplamaq
// lazım gəlməsin.
//
// ⚠️ RƏNG SIRASI SABİTDİR (`palette.ts` → `CATEGORY_FILLS`) və ölçülmüş
// ayırdedilmə məsafəsinə görə seçilib. Rəngi «gözəl gradient»ə çevirmək
// dilimləri ayırd edilməz edir (fayl başlığında rəqəmlər var).
//
// ⚠️ RƏNG YEGANƏ KANAL DEYİL: hər dilimin üzərində faiz, altında ad + say
// daşıyan leqenda, daha aşağıda `<table>`. KUDS palitrası solğun olduğu üçün bu
// kompensasiya MƏCBURİDİR (bax `palette.ts`).
//
// ⚠️ Etiket `lib/labels.ts` → `industryLabel`-dandır. `Industry.OTHER` = "Digər";
// k-anonimliklə gizlədilmiş qrup isə «Açıqlanmayan»dır (🔴 TƏLƏ C — ikisi
// FƏRQLİ şeydir və eyni siyahıda yan-yana düşür).
// ============================================================================

import { ChartPie } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { cellTotal, undisclosedTotal, type StatsBucket, type StatsCell } from "@/lib/career-stats";
import { industryLabel } from "@/lib/labels";

import { ChartFrame } from "./ChartFrame";
import { StatsTable } from "./StatsTable";
import { MAP_TAB_META } from "./catalog";
import { categoryFill } from "./palette";

export function IndustriesChart({ cell }: { cell: StatsCell<StatsBucket> }) {
  const meta = MAP_TAB_META.industries;
  const data = cell.visible.map((bucket) => ({
    key: bucket.key,
    label: industryLabel(bucket.key),
    count: bucket.count,
  }));

  const disclosedTotal = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <ChartFrame
      title={meta.title}
      description={meta.description}
      icon={ChartPie}
      hasData={data.length > 0}
      suppressedCount={cell.undisclosedCount}
      unknownCount={cell.unknownCount}
      tableLabel="fəaliyyət sahələri"
      table={
        <StatsTable
          caption="Fəaliyyət sahələri üzrə məzun sayı"
          columnLabel="Sahə"
          rows={data.map((item) => ({ label: item.label, count: item.count }))}
          undisclosedCount={undisclosedTotal(cell)}
          total={cellTotal(cell)}
        />
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-64 w-full sm:w-2/3">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                innerRadius="55%"
                outerRadius="85%"
                // 2px səth boşluğu: qonşu dilimlər bir-birinə "yapışmasın"
                // (solğun palitrada sərhəd olmadan iki dilim tək dilim görünür).
                paddingAngle={2}
                stroke="var(--map-stroke)"
                strokeWidth={2}
                isAnimationActive={false}
                label={(entry: { percent?: number }) =>
                  `${Math.round((entry.percent ?? 0) * 100)}%`
                }
                labelLine={false}
              >
                {data.map((item, index) => (
                  <Cell key={item.key} fill={categoryFill(index)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${Number(value ?? 0)} nəfər`, String(name)]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--chart-grid)",
                  fontSize: 14,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leqenda — ad və say rəngdən ASILI OLMAYAN kanaldır. Mətn `text-*`
            tokenlərindədir; seriya rəngi yalnız kiçik nöqtədə görünür. */}
        <ul className="flex w-full flex-col gap-2 sm:w-1/3">
          {data.map((item, index) => (
            <li key={item.key} className="flex items-center gap-2 text-small">
              <span
                className="h-3 w-3 shrink-0 rounded-badge border border-border"
                style={{ backgroundColor: categoryFill(index) }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-text-primary">{item.label}</span>
              <span className="tabular-nums text-text-secondary">{item.count}</span>
            </li>
          ))}
          <li className="border-t border-border pt-2 text-caption text-text-secondary">
            Açıqlanan cəmi: {disclosedTotal} nəfər
          </li>
        </ul>
      </div>
    </ChartFrame>
  );
}
