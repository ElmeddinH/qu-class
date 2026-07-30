"use client";

// ============================================================================
// src/features/where-are-we-now/MapTabs.tsx
// Səkkiz görünüşün tab qabığı — vəziyyət URL-dədir.
//
// ⚠️ `"use client"` MƏCBURİDİR: (a) Radix Tabs vəziyyət saxlayır, (b) `nuqs`
// URL-i client-dən yazır, (c) `dynamic(..., { ssr: false })` YALNIZ client
// komponentində işlədilə bilər (server komponentində Next istisna atır).
//
// 🔴 XƏRİTƏLƏR `ssr: false` İLƏ YÜKLƏNİR. `react-simple-maps` `window` və DOM
// ölçüsü ilə işləyir; serverdə render olunanda `npm run build` prerender
// mərhələsində sınır. Skeleton `MapSkeleton`-dandır (boş ekran yoxdur).
//
// ⚠️ MƏLUMAT PROP KİMİ GƏLİR, BURADA SORĞU YOXDUR. Aqreqasiya server
// komponentində TƏK keçiddə hesablanır (🔴 TƏLƏ A: xanalar bir-birindən
// asılıdır) və səkkiz görünüş EYNİ nəticənin təsviridir. Tab dəyişəndə yeni
// sorğu getmir — `filter-state.ts`-də `shallow: true` məhz buna görədir.
//
// ⚠️ İKON REYESTRİ BURADADIR (CLAUDE.md §12): `catalog.ts` ikonu AD kimi
// saxlayır ki, server komponenti onu təhlükəsiz oxuya bilsin.
// ============================================================================

import dynamic from "next/dynamic";
import {
  Briefcase,
  Building2,
  ChartColumn,
  Flag,
  GraduationCap,
  Globe2,
  MapPin,
  type LucideIcon,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MAP_TAB_VALUES, type MapTab } from "@/lib/map-filters";
import type { WhereAreWeNow } from "@/lib/career-stats";

import { CitiesChart } from "./CitiesChart";
import { CompaniesChart } from "./CompaniesChart";
import { CountriesChart } from "./CountriesChart";
import { EducationLevelsChart } from "./EducationLevelsChart";
import { IndustriesChart } from "./IndustriesChart";
import { JobFunctionsChart } from "./JobFunctionsChart";
import { MapSkeleton } from "./MapSkeleton";
import { MapPanel } from "./MapPanel";
import { MAP_TAB_META, type MapTabIconName } from "./catalog";
import { useMapFilters } from "./filter-state";

const TAB_ICONS: Record<MapTabIconName, LucideIcon> = {
  globe: Globe2,
  flag: Flag,
  building: Building2,
  pin: MapPin,
  briefcase: Briefcase,
  chart: ChartColumn,
  graduation: GraduationCap,
};

const WorldMap = dynamic(() => import("./WorldMap").then((mod) => mod.WorldMap), {
  ssr: false,
  loading: () => <MapSkeleton label="Dünya xəritəsi" />,
});

const AzerbaijanMap = dynamic(
  () => import("./AzerbaijanMap").then((mod) => mod.AzerbaijanMap),
  { ssr: false, loading: () => <MapSkeleton label="Azərbaycan xəritəsi" /> },
);

interface MapTabsProps {
  stats: WhereAreWeNow;
  /** Serverdə `parseMapParams` ilə oxunmuş görünüş — bax `useMapFilters`. */
  initialTab: MapTab;
}

export function MapTabs({ stats, initialTab }: MapTabsProps) {
  const { state, setTab } = useMapFilters(initialTab);

  return (
    <Tabs
      value={state.tab}
      onValueChange={(value) => setTab(value as MapTab)}
      className="flex flex-col gap-6"
    >
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        {MAP_TAB_VALUES.map((tab) => {
          const Icon = TAB_ICONS[MAP_TAB_META[tab].icon];
          return (
            <TabsTrigger key={tab} value={tab} className="gap-2">
              <Icon className="h-4 w-4" aria-hidden />
              {MAP_TAB_META[tab].label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="world">
        <MapPanel tab="world" stats={stats}>
          <WorldMap pins={stats.mapPins} fills={stats.countryFills} />
        </MapPanel>
      </TabsContent>

      <TabsContent value="azerbaijan">
        <MapPanel tab="azerbaijan" stats={stats}>
          <AzerbaijanMap pins={stats.azPins} />
        </MapPanel>
      </TabsContent>

      <TabsContent value="cities">
        <CitiesChart cell={stats.cities} />
      </TabsContent>

      <TabsContent value="countries">
        <CountriesChart cell={stats.countries} />
      </TabsContent>

      <TabsContent value="companies">
        <CompaniesChart cell={stats.companies} />
      </TabsContent>

      <TabsContent value="industries">
        <IndustriesChart cell={stats.industries} />
      </TabsContent>

      <TabsContent value="functions">
        <JobFunctionsChart cell={stats.jobFunctions} />
      </TabsContent>

      <TabsContent value="education">
        <EducationLevelsChart cell={stats.educationLevels} />
      </TabsContent>
    </Tabs>
  );
}
