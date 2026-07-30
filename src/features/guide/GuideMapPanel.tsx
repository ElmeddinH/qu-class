"use client";

// ============================================================================
// src/features/guide/GuideMapPanel.tsx
// Xəritənin client qabığı.
//
// 🔴 `dynamic(..., { ssr: false })` YALNIZ CLIENT komponentində işlədilə bilər —
// server komponentində Next istisna atır. Blok 10B-də eyni səbəbdən `MapTabs`
// qabığı yaradılmışdı; burada tab yoxdur, ona görə qabıq minimaldır.
//
// ⚠️ MƏLUMAT PROP KİMİ GƏLİR — bu komponentdə sorğu YOXDUR. Bələdçi məkanları
// server komponentində bir dəfə oxunur (`listGuidePlaces`), yəni xəritə və
// siyahı EYNİ məlumatı göstərir və ayrıla bilmir.
// ============================================================================

import dynamic from "next/dynamic";

import { MapSkeleton } from "@/components/shared/MapSkeleton";
import type { GuideMapPlace } from "./KhankendiMap";

const KhankendiMap = dynamic(
  () => import("./KhankendiMap").then((mod) => mod.KhankendiMap),
  { ssr: false, loading: () => <MapSkeleton label="Xankəndi xəritəsi" /> },
);

interface GuideMapPanelProps {
  places: GuideMapPlace[];
  withoutCoordinates: number;
}

export function GuideMapPanel({ places, withoutCoordinates }: GuideMapPanelProps) {
  return <KhankendiMap places={places} withoutCoordinates={withoutCoordinates} />;
}
