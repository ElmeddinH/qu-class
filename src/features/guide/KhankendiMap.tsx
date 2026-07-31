"use client";

// ============================================================================
// src/features/guide/KhankendiMap.tsx
// Xankəndi mərkəzli xəritə görünüşü (spec §3, 10-cu bənd — "xəritə və vacib
// nöqtələr").
//
// 🔴 BU, BLOK 10B-NİN QADAĞASI İLƏ ZİDDİYYƏT DEYİL — FƏRQ ARDINDADIR:
//   · 10B (`lib/geo.ts`)  → İNSANLARIN koordinatı. Sxemdə `User.latitude`
//     sütunu YOXDUR və olmamalıdır; məzunun yeri yalnız ŞƏHƏR səviyyəsində
//     saxlanılır, pin isə şəhər MƏRKƏZİNƏ qoyulur ki, xəritə "insan izləyicisi"
//     olmasın (`coarsenLocation`, `suppressSmallBuckets`).
//   · BU FAYL           → MƏKANLARIN koordinatı. `GuidePlace.latitude` /
//     `longitude` sxem sütunudur, dəyər redaksiya tərəfindən daxil edilir və
//     şəhərin İCTİMAİ obyektinə (park, xəstəxana, dayanacaq) aiddir. Aptekin
//     ünvanı şəxsi məlumat deyil — bələdçinin bütün mənası odur.
// Qısası: qadağa ŞƏXSƏ aiddir, bura isə YERƏ.
//
// 🔴 `ssr: false` İLƏ YÜKLƏNİR (çağıran tərəf): `react-simple-maps` `window`
// tələb edir və serverdə render olunanda `npm run build` prerender mərhələsində
// sınır (Blok 10B-nin eyni qərarı).
//
// ⚠️ XƏRİTƏ TƏK MƏLUMAT KANALI DEYİL (KUDS §21 / WCAG 2.2): hər marker
// klaviatura ilə fokuslana bilir, `<title>` daşıyır və EYNİ məlumat xəritənin
// altındaki siyahıda mətn kimi verilir. Rəng və mövqe yeganə kanal deyil.
//
// ⚠️ Koordinatı OLMAYAN məkan xəritədə görünmür (siyahıda görünür) — səbəb
// istifadəçiyə açıq yazılır, "itmiş" kimi görünməsin.
// ============================================================================

import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import worldTopology from "world-atlas/countries-110m.json";

import { COUNTRY_COORDS, AZERBAIJAN } from "@/lib/geo";
import { guideCategoryLabel } from "@/lib/labels";

/** AZ poliqonunun topologiya `id`-si — cədvəldən, sətir literalı YOX. */
const AZ_NUMERIC = COUNTRY_COORDS[AZERBAIJAN].numeric;

const TOPOLOGY = worldTopology as unknown as Record<string, unknown>;

/**
 * Xankəndinin təxmini mərkəzi. Miqyas şəhəri və yaxın ətrafı əhatə edir —
 * bələdçidəki bütün nöqtələr 3 km radiusdadır.
 *
 * ⚠️ `geoMercator` (dünya xəritəsindəki `geoNaturalEarth1` deyil): bu enlikdə
 * (39.8° N) və bu miqyasda təhrif nəzərə çarpmır və mövqelər tanış görünür.
 */
const KHANKENDI_CENTER: [number, number] = [46.752, 39.816];
const MAP_SCALE = 190_000;

export interface GuideMapPlace {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  isEmergency: boolean;
}

interface KhankendiMapProps {
  places: GuideMapPlace[];
  /** Koordinatı olmayan məkan sayı — izah sətri üçün. */
  withoutCoordinates: number;
}

export function KhankendiMap({ places, withoutCoordinates }: KhankendiMapProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = places.find((place) => place.id === activeId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="overflow-hidden rounded-card border border-border bg-background"
        data-testid="khankendi-map"
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: KHANKENDI_CENTER, scale: MAP_SCALE }}
          width={800}
          height={420}
          className="h-auto w-full"
          // 🔴 `role="img"` DEYİL, `role="group"` (Blok 12C · axe
          // `nested-interactive`, serious). ARIA-da `img` rolu «uşaqları
          // təqdimatdır» qrupundadır: onun içindəki hər şey əlçatanlıq
          // ağacından SİLİNİR. Marker dairələri isə `role="button"` +
          // `tabIndex={0}` daşıyır — yəni klaviatura ilə fokuslanan, amma
          // ekran oxuyucuya GÖRÜNMƏYƏN nəzarət elementləri yaranırdı
          // (fokus «boşluğa» düşür). `group` interaktiv övladlara icazə verir
          // və etiket saxlanılır.
          //
          // ⚠️ Alternativ — markerlərdən `tabIndex`-i çıxarmaq — rədd edildi:
          // xəritəyə klaviatura ilə çatmaq faylın öz müqaviləsidir (yuxarıdakı
          // qeyd) və mətn siyahısı onu ƏVƏZ ETMİR, TAMAMLAYIR.
          role="group"
          aria-label="Xankəndi bələdçisindəki məkanların xəritəsi. Eyni məlumat aşağıdaki siyahıdadır."
        >
          <Geographies geography={TOPOLOGY}>
            {({ geographies }) =>
              geographies.map((geography) => (
                <Geography
                  key={geography.rsmKey}
                  geography={geography}
                  fill={
                    String(geography.id) === AZ_NUMERIC
                      ? "var(--map-fill-1)"
                      : "var(--map-outside)"
                  }
                  stroke="var(--map-stroke)"
                  strokeWidth={0.5}
                  style={{ default: { outline: "none" }, hover: { outline: "none" } }}
                />
              ))
            }
          </Geographies>

          {places.map((place) => (
            <Marker
              key={place.id}
              coordinates={[place.longitude, place.latitude]}
              // ⚠️ `focus` işlədilir, `hover` yox: üst-üstə düşən markerlərdə
              // Playwright `hover()` "başqa element pointer hadisəsini tutur"
              // deyib dayanır (Blok 10B, T32) — və klaviatura ilə açılma onsuz
              // da əsl əlçatanlıq tələbidir.
              onFocus={() => setActiveId(place.id)}
              onMouseEnter={() => setActiveId(place.id)}
              onBlur={() => setActiveId(null)}
              onMouseLeave={() => setActiveId(null)}
            >
              <circle
                r={place.isEmergency ? 7 : 5}
                fill={place.isEmergency ? "var(--marker-emergency)" : "var(--marker-place)"}
                stroke="var(--map-stroke)"
                strokeWidth={1.5}
                tabIndex={0}
                role="button"
                aria-label={`${place.title} — ${guideCategoryLabel(place.category)}`}
                className="cursor-pointer focus:outline-none focus-visible:stroke-ku-dark"
              />
              <title>
                {place.title} — {guideCategoryLabel(place.category)}
              </title>
            </Marker>
          ))}
        </ComposableMap>
      </div>

      <div className="min-h-12" aria-live="polite">
        {active ? (
          <p className="rounded-card bg-ku-soft px-4 py-2 text-small text-ku-dark">
            <strong className="font-semibold">{active.title}</strong> —{" "}
            {guideCategoryLabel(active.category)}
            {active.isEmergency ? " · təcili əlaqə" : ""}
          </p>
        ) : (
          <p className="text-caption text-text-secondary">
            Markerə klaviatura və ya kursorla toxunanda məkanın adı burada görünür.
          </p>
        )}
      </div>

      <p className="text-caption text-text-secondary">
        Xəritədə {places.length} məkan var
        {withoutCoordinates > 0
          ? `; ${withoutCoordinates} yazının koordinatı yoxdur (məsləhətlər və ümumi məlumat kimi qeydlər) və onlar yalnız siyahıda görünür.`
          : "."}
      </p>
    </div>
  );
}
