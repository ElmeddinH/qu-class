// ============================================================================
// src/features/where-are-we-now/catalog.ts
// Səkkiz görünüşün etiket və izahları (spec §13).
//
// ⚠️ İKON KOMPONENT DEYİL, AD (sətir) kimi saxlanılır — CLAUDE.md §12.
// Reyestr client komponentindədir (`MapTabs.tsx` → `TAB_ICONS`). Burada React
// importu YOXDUR ki, fayl server komponentindən də təhlükəsiz oxunsun.
//
// ⚠️ `Record<MapTab, …>` tipindədir: `MAP_TAB_VALUES`-ə yeni görünüş əlavə
// edilsə və etiketi yazılmasa `tsc` DAYANIR (səssiz boş tab olmur).
// ============================================================================

import type { MapTab } from "@/lib/map-filters";

export type MapTabIconName =
  | "globe"
  | "flag"
  | "building"
  | "pin"
  | "briefcase"
  | "chart"
  | "graduation";

export interface MapTabMeta {
  /** Tab düyməsindəki qısa etiket. */
  label: string;
  /** Panel başlığı — tabdan uzun ola bilər. */
  title: string;
  /** Panelin altındaki bir sətirlik izah. */
  description: string;
  icon: MapTabIconName;
}

export const MAP_TAB_META: Record<MapTab, MapTabMeta> = {
  world: {
    label: "Dünya",
    title: "Dünya xəritəsi",
    description:
      "Ölkə rəngi həmin ölkədə yaşayan məzun sayı ilə mütənasibdir; nöqtələr şəhər mərkəzlərini göstərir.",
    icon: "globe",
  },
  azerbaijan: {
    label: "Azərbaycan",
    title: "Azərbaycan üzrə bölgü",
    description:
      "Ölkə daxilindəki şəhərlər — Qarabağ və Şərqi Zəngəzur da daxil olmaqla.",
    icon: "flag",
  },
  cities: {
    label: "Şəhərlər",
    title: "Şəhərlər üzrə paylanma",
    description: "Ən çox məzun toplanan şəhərlər.",
    icon: "pin",
  },
  countries: {
    label: "Ölkələr",
    title: "Ölkələr üzrə paylanma",
    description: "Məzunların yaşadığı ölkələr.",
    icon: "globe",
  },
  companies: {
    label: "Şirkətlər",
    title: "İşəgötürənlər üzrə statistika",
    description:
      "Ən çox məzun çalışan təşkilatlar. Konkret şəxsin hansı şirkətdə olduğu göstərilmir.",
    icon: "building",
  },
  industries: {
    label: "Sənaye",
    title: "Fəaliyyət sahələri",
    description: "Məzunların çalışdığı sektorlar.",
    icon: "chart",
  },
  functions: {
    label: "Vəzifələr",
    title: "Vəzifə istiqamətləri",
    description:
      "«Hansı konumda çalışır?» sualının cavabı — sərbəst vəzifə adı deyil, normallaşdırılmış rol taksonomiyası (14 dəyər).",
    icon: "briefcase",
  },
  education: {
    label: "Təhsil",
    title: "Təhsil pillələri",
    description: "Məzuniyyətdən sonra əldə edilən dərəcələr — pillə sırası ilə.",
    icon: "graduation",
  },
};
