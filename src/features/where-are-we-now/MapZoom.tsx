"use client";

// ============================================================================
// src/features/where-are-we-now/MapZoom.tsx
// Xəritələrin ORTAQ zoom / pan idarəsi — dünya və Azərbaycan görünüşü eyni
// davranışı paylaşır (iki ayrı nüsxə saxlansaydı biri dəyişəndə digəri
// səssizcə ayrılardı).
//
// 🔴 KLAVİATURA MƏCBURİDİR. `react-simple-maps` → `ZoomableGroup` d3-zoom
// işlədir: siçan təkəri, sürükləmə və toxunma (pinch) HAZIRDIR, amma
// KLAVİATURA YOXDUR — d3-zoom heç bir düymə hadisəsinə qulaq asmır. Ona görə
// «+ / − / sıfırla» ƏSL `<button>`-lardır: Tab ilə fokusa düşür, Enter/Space
// ilə işləyir və ekran oxuyucusuna adı ilə oxunur (WCAG 2.1.1).
//
// ⚠️ Hüdudlar `[1, 8]`. `minZoom = 1` — xəritədən uzağa çıxmaq mənasızdır
// (SVG onsuz da tam sığır); `maxZoom = 8` — şəhər markerlərini ayırd etmək
// üçün kifayətdir, daha artığı topologiyanın 110m dəqiqliyində piksellə çıxır.
//
// ⚠️ VƏZİYYƏT URL-Ə YAZILMIR (nuqs YOXDUR) — bu, QƏRARDIR. `?tab=` görünüşü
// paylaşıla bilən məlumatdır, zoom isə ötəri baxış vəziyyətidir; URL-ə yazsaq
// hər təkər hərəkəti tarixçəyə düşərdi və «geri» düyməsi sınardı.
//
// ⚠️ `translateExtent` xəritə çərçivəsi ilə məhdudlaşır: zoom = 1-də pan
// ümumiyyətlə mümkün deyil, yaxınlaşdıqca sərbəstlik artır. Bunsuz istifadəçi
// xəritəni ekrandan tamam çıxarıb boş fon qarşısında qala bilər.
// ============================================================================

import { useCallback, useMemo, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 8;

/** Hər klik miqyası bu qədər dəfə dəyişir (təkərlə oxşar sürət). */
const ZOOM_STEP = 1.6;

export interface MapView {
  center: [number, number];
  zoom: number;
}

function clampZoom(zoom: number): number {
  return Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, zoom));
}

/** Sürüşmə/təkər hərəkətindən sonra düymələrin CARİ vəziyyətdən davam etməsi üçün. */
export function useMapZoom(initial: MapView) {
  const [view, setView] = useState<MapView>(initial);

  const zoomIn = useCallback(
    () => setView((current) => ({ ...current, zoom: clampZoom(current.zoom * ZOOM_STEP) })),
    [],
  );

  const zoomOut = useCallback(
    () => setView((current) => ({ ...current, zoom: clampZoom(current.zoom / ZOOM_STEP) })),
    [],
  );

  const reset = useCallback(() => setView(initial), [initial]);

  /**
   * ⚠️ `onMoveEnd` d3-dən gələn YENİ mərkəz və miqyası geri yazır. Bunsuz
   * istifadəçi xəritəni sürükləyəndən sonra «+» düyməsi onu BAŞLANĞIC mərkəzə
   * qaytarardı (idarə olunan `center` prop-u köhnə qalardı).
   */
  const handleMoveEnd = useCallback(
    (position: { coordinates: [number, number]; zoom: number }) => {
      setView({ center: position.coordinates, zoom: position.zoom });
    },
    [],
  );

  const isDefault = useMemo(
    () =>
      view.zoom === initial.zoom &&
      view.center[0] === initial.center[0] &&
      view.center[1] === initial.center[1],
    [initial, view],
  );

  return { view, zoomIn, zoomOut, reset, handleMoveEnd, isDefault };
}

interface MapZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  /** «Sıfırla» yalnız vəziyyət dəyişəndə mənalıdır. */
  isDefault: boolean;
  /** Ekran oxuyucusuna hansı xəritədən danışıldığını bildirir. */
  label: string;
}

export function MapZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  isDefault,
  label,
}: MapZoomControlsProps) {
  // Bir onluq — «2.6×» kimi oxunur, «2.5600000000000005×» kimi yox.
  const zoomLabel = `${Math.round(zoom * 10) / 10}×`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label={`${label} miqyası`} className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onZoomOut}
          disabled={zoom <= MAP_MIN_ZOOM}
          aria-label="Uzaqlaşdır"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={onZoomIn}
          disabled={zoom >= MAP_MAX_ZOOM}
          aria-label="Yaxınlaşdır"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          onClick={onReset}
          disabled={isDefault}
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Sıfırla
        </Button>
      </div>

      {/* Cari miqyas — düymə «passiv oldu» deyəndə səbəbi görünsün.
          `aria-live` sayəsində klaviatura istifadəçisi dəyişikliyi eşidir. */}
      <p className="text-caption text-text-secondary" aria-live="polite">
        Miqyas: {zoomLabel}
      </p>

      <p className="text-caption text-text-secondary">
        Sürükləyin, siçan təkəri və ya barmaq hərəkəti ilə də yaxınlaşdıra bilərsiniz.
      </p>
    </div>
  );
}
