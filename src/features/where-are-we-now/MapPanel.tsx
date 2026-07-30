"use client";

// ============================================================================
// src/features/where-are-we-now/MapPanel.tsx
// İki xəritə görünüşünün çərçivəsi — `ChartFrame`-in xəritə variantı.
//
// 🔴 XƏRİTƏNİN DƏ CƏDVƏL ALTERNATİVİ VAR (KUDS §21 / WCAG 2.2). Qrafiklərdə
// bu, `ChartFrame` vasitəsilə gəlir; xəritə isə İKİ ölçü göstərir (ölkə
// doldurması + şəhər markerləri), ona görə cədvəli də iki hissəlidir:
//   · dünya görünüşü → ölkələr cədvəli (doldurmanın mənbəyi)
//   · Azərbaycan görünüşü → AZ şəhərləri cədvəli (markerlərin mənbəyi)
//
// ⚠️ Cədvəl xəritədən TÖRƏMİR — ikisi də EYNİ `StatsCell`-dən gəlir.
//
// ⚠️ Azərbaycan görünüşünün cədvəli `cities` xanasının TAM SİYAHISI DEYİL,
// yalnız AZ sətirləridir. Cəm də ona uyğun hesablanır, yoxsa "Cəmi" sətri
// dünya respondentlərini göstərib istifadəçini çaşdırardı.
// ============================================================================

import { Flag, Globe2 } from "lucide-react";

import { cellTotal, undisclosedTotal, type WhereAreWeNow } from "@/lib/career-stats";
import { AZERBAIJAN } from "@/lib/geo";
import type { MapTab } from "@/lib/map-filters";

import { ChartFrame } from "./ChartFrame";
import { StatsTable } from "./StatsTable";
import { MAP_TAB_META } from "./catalog";

interface MapPanelProps {
  tab: Extract<MapTab, "world" | "azerbaijan">;
  stats: WhereAreWeNow;
  children: React.ReactNode;
}

export function MapPanel({ tab, stats, children }: MapPanelProps) {
  const meta = MAP_TAB_META[tab];

  if (tab === "world") {
    return (
      <ChartFrame
        title={meta.title}
        description={meta.description}
        icon={Globe2}
        // Xəritə ölkə doldurmasına ƏSASLANIR: açıqlanan ölkə yoxsa xəritə boş
        // rəngli qalır və məlumat daşımır → səbəb yazılır.
        hasData={stats.countryFills.length > 0 || stats.mapPins.length > 0}
        suppressedCount={stats.countries.undisclosedCount}
        unknownCount={stats.countries.unknownCount}
        tableLabel="ölkələr üzrə məzun sayı"
        table={
          <StatsTable
            caption="Xəritədəki ölkə doldurmasının rəqəm qarşılığı"
            columnLabel="Ölkə"
            rows={stats.countries.visible.map((bucket) => ({
              label: bucket.key,
              count: bucket.count,
            }))}
            undisclosedCount={undisclosedTotal(stats.countries)}
            total={cellTotal(stats.countries)}
          />
        }
      >
        {children}
      </ChartFrame>
    );
  }

  const azRows = stats.cities.visible.filter((bucket) => bucket.country === AZERBAIJAN);
  const azDisclosed = azRows.reduce((sum, bucket) => sum + bucket.count, 0);
  const azTotal =
    stats.countries.visible.find((bucket) => bucket.key === AZERBAIJAN)?.count ?? azDisclosed;

  return (
    <ChartFrame
      title={meta.title}
      description={meta.description}
      icon={Flag}
      hasData={stats.azPins.length > 0}
      // Azərbaycanda olan, amma şəhəri açıqlanmayan sətirlər.
      suppressedCount={Math.max(0, azTotal - azDisclosed)}
      unknownCount={0}
      tableLabel="Azərbaycan şəhərləri üzrə məzun sayı"
      table={
        <StatsTable
          caption="Azərbaycan şəhərləri üzrə məzun sayı"
          columnLabel="Şəhər"
          rows={azRows.map((bucket) => ({ label: bucket.city, count: bucket.count }))}
          undisclosedCount={Math.max(0, azTotal - azDisclosed)}
          total={azTotal}
        />
      }
    >
      {children}
    </ChartFrame>
  );
}
