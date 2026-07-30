"use client";

// ============================================================================
// src/features/where-are-we-now/AzerbaijanMap.tsx
// Spec §13 — Azərbaycan xəritəsi (7 vizualın ikincisi).
//
// 🔴 AYRI GEOJSON AXTARILMADI. Eyni `world-atlas/countries-110m` topologiyası
// işlədilir: `geoMercator` Azərbaycana mərkəzlənir, AZ poliqonu (ISO numeric
// "031") vurğulanır, qonşu ərazilər sönük tonda kontekst kimi qalır və üstünə
// şəhər markerləri qoyulur.
//
// ⚠️ RAYON SƏRHƏDLƏRİ YOXDUR VƏ TƏLƏB DEYİL: bölgü ŞƏHƏR mərkəzlərinə görədir,
// inzibati vahidlərə görə deyil. Rayon sərhədləri üçün ayrı (və böyük) geojson
// lazım olardı; heç bir sual ona cavab tələb etmir.
//
// ⚠️ Qonşu ərazilər GÖSTƏRİLİR, çünki tək başına asılı qalan poliqon "hansı
// bölgədir?" sualı yaradır. Onlar `--map-outside` tonundadır — məlumat DAŞIMIR.
//
// ⚠️ `geoMercator` burada DÜZGÜNDÜR (dünya xəritəsində deyil): kiçik enlik
// aralığında (38…42° N) təhrif nəzərə çarpmır və şəhər mövqeləri tanış görünür.
// ============================================================================

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import worldTopology from "world-atlas/countries-110m.json";

import { type MapPin } from "@/lib/career-stats";
import { COUNTRY_COORDS, AZERBAIJAN } from "@/lib/geo";

import { MapPinsLayer, PinDetails } from "./MapPins";

/** AZ poliqonunun topologiya `id`-si — cədvəldən, sətir literalı YOX. */
const AZ_NUMERIC = COUNTRY_COORDS[AZERBAIJAN].numeric;

const TOPOLOGY = worldTopology as unknown as Record<string, unknown>;

export function AzerbaijanMap({ pins }: { pins: MapPin[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const maxPinCount = useMemo(
    () => pins.reduce((max, pin) => Math.max(max, pin.count), 0),
    [pins],
  );

  const activePin = pins.find((pin) => pin.id === activeId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-hidden rounded-card border border-border bg-background"
        data-testid="azerbaijan-map"
      >
        <ComposableMap
          projection="geoMercator"
          // Mərkəz Azərbaycanın təxmini coğrafi ortasıdır; miqyas ölkəni tam
          // əhatə edir (Naxçıvan daxil) və bir qədər qonşu kontekst buraxır.
          projectionConfig={{ center: [48.5, 40.2], scale: 4200 }}
          width={800}
          height={420}
          className="h-auto w-full"
          role="img"
          aria-label="Məzunların Azərbaycan şəhərləri üzrə paylanması. Eyni məlumat aşağıdaki cədvəldədir."
        >
          <Geographies geography={TOPOLOGY}>
            {({ geographies }) =>
              geographies.map((geography) => {
                const isAz = String(geography.id) === AZ_NUMERIC;

                return (
                  <Geography
                    key={geography.rsmKey}
                    geography={geography}
                    fill={isAz ? "var(--map-fill-2)" : "var(--map-outside)"}
                    stroke="var(--map-stroke)"
                    strokeWidth={isAz ? 1 : 0.5}
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

      <div className="min-h-12" aria-live="polite">
        <PinDetails pin={activePin} />
      </div>
    </div>
  );
}
