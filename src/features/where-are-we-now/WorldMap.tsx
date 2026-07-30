"use client";

// ============================================================================
// src/features/where-are-we-now/WorldMap.tsx
// Spec §13 — dünya xəritəsi (7 vizualın birincisi).
//
// ⚠️ TOPOLOGİYA OFLAYN GƏLİR: `world-atlas/countries-110m.json` paket
// daxilindəndir və bundle-a girir. CDN-dən (`unpkg.com/world-atlas@…`) YÜKLƏMƏ
// İŞLƏDİLMİR — müdafiə otağında internet olmaya bilər (Swagger UI aktivləri ilə
// eyni qərar, bax Blok 9S).
//
// ⚠️ Poliqonun `id`-si ISO 3166-1 NUMERIC-dir ("031" = Azərbaycan), `properties
// .name` isə İNGİLİSCƏDİR ("Azerbaijan"). Ona görə uyğunlaşdırma `lib/geo.ts`
// → `CountryCoord.numeric` ilə aparılır, ADLA DEYİL: ad üzrə birləşdirmə
// azərbaycanca dəyərlərlə heç vaxt uyğun gəlməzdi.
//
// ⚠️ `geoNaturalEarth1` seçildi: `geoMercator` yüksək enliklərdə sahəni
// şişirdir (Kanada/Skandinaviya) və "doldurma intensivliyi = say" oxunuşunu
// pozar; Natural Earth kompromis proyeksiyadır.
//
// ⚠️ SSR: bu komponent `MapTabs` tərəfindən `dynamic(..., { ssr: false })` ilə
// yüklənir — `react-simple-maps` DOM ölçüsü və `window` ilə işləyir, yəni
// serverdə render olunanda `npm run build` prerender mərhələsində sınır.
// ============================================================================

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Sphere } from "react-simple-maps";
import worldTopology from "world-atlas/countries-110m.json";

import { fillStep, type CountryFill, type MapPin } from "@/lib/career-stats";

import { MapPinsLayer, PinDetails } from "./MapPins";
import { MAP_FILLS } from "./palette";

interface WorldMapProps {
  pins: MapPin[];
  fills: CountryFill[];
}

/** `Geographies` `Topology` obyekti gözləyir; JSON importunun tipi genişdir. */
const TOPOLOGY = worldTopology as unknown as Record<string, unknown>;

export function WorldMap({ pins, fills }: WorldMapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const byNumeric = useMemo(
    () => new Map(fills.map((fill) => [fill.numeric, fill])),
    [fills],
  );
  const maxCountryCount = useMemo(
    () => fills.reduce((max, fill) => Math.max(max, fill.count), 0),
    [fills],
  );
  const maxPinCount = useMemo(
    () => pins.reduce((max, pin) => Math.max(max, pin.count), 0),
    [pins],
  );

  const activePin = pins.find((pin) => pin.id === activeId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-hidden rounded-card border border-border bg-background"
        data-testid="world-map"
      >
        <ComposableMap
          projection="geoNaturalEarth1"
          projectionConfig={{ scale: 128, center: [15, 8] }}
          width={800}
          height={400}
          className="h-auto w-full"
          role="img"
          aria-label="Məzunların ölkələr üzrə paylanması. Eyni məlumat aşağıdaki cədvəldədir."
        >
          {/* Kürənin konturu — okean sahəsini kartın fonundan ayırır. */}
          <Sphere id="world-sphere" stroke="var(--map-stroke)" strokeWidth={0.5} fill="none" />

          <Geographies geography={TOPOLOGY}>
            {({ geographies }) =>
              geographies.map((geography) => {
                const fill = byNumeric.get(String(geography.id));
                const step =
                  fill === undefined
                    ? null
                    : fillStep(fill.count, maxCountryCount, MAP_FILLS.length);

                return (
                  <Geography
                    key={geography.rsmKey}
                    geography={geography}
                    fill={step === null ? "var(--map-empty)" : MAP_FILLS[step]}
                    stroke="var(--map-stroke)"
                    strokeWidth={0.5}
                    // Doldurma HOVER-də dəyişmir: rəng SAY deməkdir, interaktiv
                    // vəziyyət deyil (dəyişsə oxucu rəngi say kimi oxumağı dayandırar).
                    style={{ default: { outline: "none" }, hover: { outline: "none" } }}
                  />
                );
              })
            }
          </Geographies>

          <MapPinsLayer
            pins={pins}
            maxCount={maxPinCount}
            activeId={activeId}
            onActivate={setActiveId}
          />
        </ComposableMap>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-h-12 flex-1" aria-live="polite">
          <PinDetails pin={activePin} />
        </div>
        <FillLegend maxCount={maxCountryCount} />
      </div>
    </div>
  );
}

/**
 * Doldurma şkalasının izahı — rəngin NƏ demək olduğu yazılmasa şkala dekor kimi
 * oxunur. Ədədlər şkalanın pillələrindən TÖRƏYİR (əl ilə yazılmır).
 */
function FillLegend({ maxCount }: { maxCount: number }) {
  if (maxCount <= 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption text-text-secondary">Ölkə üzrə məzun sayı</span>
      <div className="flex items-center gap-2">
        <span className="text-caption text-text-secondary">az</span>
        <ul className="flex">
          {MAP_FILLS.map((fill, index) => (
            <li
              key={fill}
              className="h-4 w-8 border border-border"
              style={{ backgroundColor: fill }}
              aria-hidden
            >
              <span className="sr-only">{index + 1}</span>
            </li>
          ))}
        </ul>
        <span className="text-caption text-text-secondary">çox ({maxCount})</span>
      </div>
    </div>
  );
}
