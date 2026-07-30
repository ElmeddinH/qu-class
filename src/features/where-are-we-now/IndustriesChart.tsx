"use client";

// ============================================================================
// src/features/where-are-we-now/IndustriesChart.tsx
// Spec §13 — "sənaye sahələri üzrə diaqram" (donut).
//
// ⚠️ DONUT HİSSƏ-BÜTÖV münasibətini göstərir: "məzunların hansı payı hansı
// sektordadır". Ona görə mərkəzdə CƏM yazılır — bucaqları gözlə toplamaq
// lazım gəlməsin.
//
// ============================================================================
// 🔴 KONTRAST QAYDASI (Blok 12B) — bitişik dilimlər YALNIZ rənglə fərqlənmir
// ============================================================================
// Dörd kanal birlikdə işləyir və heç biri digərini əvəz etmir:
//
//   1. RƏNG — `palette.ts` → `sliceFill()`. Ardıcıl ku-green şkalası; pillələr
//      növbələşdirilir, yəni yan-yana duran hər iki dilim arasında ƏN AZI 2
//      pillə parlaqlıq fərqi var (`palette.test.ts` ölçür, dairə qapalı
//      sayılır: son dilim ilkin qonşusudur).
//   2. FAİZ ETİKETİ — hər dilimin üzərində. Rəngsiz oxunur.
//   3. LEQENDA — ad + say + faiz. Rəngdən TAM asılı olmayan kanal.
//   4. VURĞU — hover VƏ fokus. Leqenda sətirləri əsl `<button>`-dur: SVG
//      dilimləri klaviatura fokusuna etibarlı düşmür, ona görə interaktivlik
//      leqendaya verilir və dilim ONA cavab verir (çarpaz vurğu).
//
// ⚠️ Vurğu «seçim» deyil, YALNIZ diqqətdir: məlumat süzülmür, dilim itmir.
// Klik vurğunu SABİTLƏYİR (touch cihazda hover yoxdur), təkrar klik açır.
//
// ⚠️ Etiket `lib/labels.ts` → `industryLabel`-dandır. `Industry.OTHER` = "Digər";
// k-anonimliklə gizlədilmiş qrup isə «Açıqlanmayan»dır (🔴 TƏLƏ C — ikisi
// FƏRQLİ şeydir və eyni siyahıda yan-yana düşür).
// ============================================================================

import { useState } from "react";
import { ChartPie } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { cellTotal, undisclosedTotal, type StatsBucket, type StatsCell } from "@/lib/career-stats";
import { industryLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { ChartFrame } from "./ChartFrame";
import { StatsTable } from "./StatsTable";
import { MAP_TAB_META } from "./catalog";
import { sliceFill } from "./palette";

export function IndustriesChart({ cell }: { cell: StatsCell<StatsBucket> }) {
  const meta = MAP_TAB_META.industries;

  /** Klikllə SABİTLƏNMİŞ vurğu — toxunma cihazında hover yoxdur. */
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  /** Hover / fokus ilə ötəri vurğu. */
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const activeKey = hoverKey ?? pinnedKey;

  const data = cell.visible.map((bucket) => ({
    key: bucket.key,
    label: industryLabel(bucket.key),
    count: bucket.count,
  }));

  const disclosedTotal = data.reduce((sum, item) => sum + item.count, 0);

  /** Faiz AÇIQLANAN cəmə görədir — donut məhz onu 100% kimi göstərir. */
  const percentOf = (count: number) =>
    disclosedTotal === 0 ? 0 : Math.round((count / disclosedTotal) * 100);

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
                // 2px səth boşluğu: qonşu dilimlər bir-birinə "yapışmasın".
                paddingAngle={2}
                isAnimationActive={false}
                label={(entry: { percent?: number }) =>
                  `${Math.round((entry.percent ?? 0) * 100)}%`
                }
                labelLine={false}
              >
                {data.map((item, index) => {
                  const isActive = activeKey === item.key;
                  const isDimmed = activeKey !== null && !isActive;

                  return (
                    <Cell
                      key={item.key}
                      fill={sliceFill(index, data.length)}
                      // Vurğu ÜÇ əlamətlə verilir: qalın kontur, brend rəngli
                      // sərhəd və qalanların sönükləşməsi. Tək əlamət (məsələn
                      // yalnız opaklıq) monoxrom ekranda itə bilər.
                      stroke={isActive ? "var(--chart-primary-dark)" : "var(--map-stroke)"}
                      strokeWidth={isActive ? 4 : 2}
                      fillOpacity={isDimmed ? 0.45 : 1}
                      // Recharts `Cell`-i `<path>` kimi render edir; siçan
                      // hadisələri dilimin üstündə də işləməlidir.
                      onMouseEnter={() => setHoverKey(item.key)}
                      onMouseLeave={() => setHoverKey(null)}
                    />
                  );
                })}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${Number(value ?? 0)} nəfər · ${percentOf(Number(value ?? 0))}%`,
                  String(name),
                ]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--chart-grid)",
                  fontSize: 14,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Leqenda — ad, say və faiz rəngdən ASILI OLMAYAN kanaldır.
            Sətirlər `<button>`-dur: Tab ilə gəzilir, Enter/Space ilə vurğu
            sabitlənir (WCAG 2.1.1). */}
        <ul className="flex w-full flex-col gap-1 sm:w-1/3">
          {data.map((item, index) => {
            const isActive = activeKey === item.key;
            const isPinned = pinnedKey === item.key;

            return (
              <li key={item.key}>
                <button
                  type="button"
                  aria-pressed={isPinned}
                  onMouseEnter={() => setHoverKey(item.key)}
                  onMouseLeave={() => setHoverKey(null)}
                  onFocus={() => setHoverKey(item.key)}
                  onBlur={() => setHoverKey(null)}
                  onClick={() => setPinnedKey(isPinned ? null : item.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-btn px-2 py-1 text-left text-small transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ku-green",
                    isActive ? "bg-ku-soft" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "h-3 w-3 shrink-0 rounded-badge border",
                      isActive ? "border-ku-dark" : "border-border",
                    )}
                    style={{ backgroundColor: sliceFill(index, data.length) }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-text-primary">
                    {item.label}
                  </span>
                  <span className="tabular-nums text-text-secondary">
                    {item.count} · {percentOf(item.count)}%
                  </span>
                </button>
              </li>
            );
          })}
          <li className="border-t border-border pt-2 text-caption text-text-secondary">
            Açıqlanan cəmi: {disclosedTotal} nəfər
          </li>
        </ul>
      </div>
    </ChartFrame>
  );
}
