// ============================================================================
// src/components/shared/visibility-meta.ts
// Görünürlük səviyyələrinin UI təsviri — etiket, izah, ikon, badge stili.
//
// ⚠️ Səviyyə SİYAHISI burada təkrar yazılmır: `Record<Visibility, …>` tipi
// `src/lib/visibility.ts`-dən gəlir, yəni yeni səviyyə əlavə olunsa bu fayl
// KOMPİLYASİYADA sınır — səssizcə etiketsiz qalmır.
//
// ⚠️ İkonlar KOMPONENT kimi deyil, AD kimi saxlanılır (eyni səbəb `layouts/nav.ts`
// -dəki kimi: React funksiyaları server → client sərhədindən keçmir).
// ============================================================================

import { Building2, Globe, Lock, Users, type LucideIcon } from "lucide-react";

import { VISIBILITY_LEVELS, type Visibility } from "@/lib/visibility";

/** İkon reyestri — `VisibilityMeta.icon` bu obyektin açarıdır. */
export const VISIBILITY_ICONS = {
  globe: Globe,
  building: Building2,
  users: Users,
  lock: Lock,
} satisfies Record<string, LucideIcon>;

export type VisibilityIconName = keyof typeof VISIBILITY_ICONS;

export interface VisibilityMeta {
  /** Qısa etiket — seçici düyməsi və badge üçün */
  label: string;
  /** "Kim görə bilər: ..." — spesifikasiya §5 tələbi */
  audience: string;
  icon: VisibilityIconName;
  /** Badge fonu — KUDS token-ləri, hardcode rəng yoxdur */
  badgeClass: string;
}

/** Ən AÇIQ-dan ən QAPALI-ya sıra (`VISIBILITY_LEVELS` ilə eynidir). */
export const VISIBILITY_META: Record<Visibility, VisibilityMeta> = {
  PUBLIC: {
    label: "Hamı",
    audience:
      "Kim görə bilər: internetdəki hər kəs — sistemə daxil olmayan ziyarətçilər də daxil.",
    icon: "globe",
    badgeClass: "border-transparent bg-ku-soft text-ku-dark",
  },
  UNIVERSITY: {
    label: "Universitet",
    audience:
      "Kim görə bilər: Qarabağ Universitetinin bütün təsdiqlənmiş istifadəçiləri.",
    icon: "building",
    badgeClass: "border-transparent bg-ku-blue text-ku-dark",
  },
  CLASS: {
    label: "Sinif",
    audience: "Kim görə bilər: yalnız sinif yoldaşlarınız (eyni cohort üzvləri).",
    icon: "users",
    badgeClass: "border-transparent bg-ku-cream text-ku-dark",
  },
  PRIVATE: {
    label: "Yalnız mən",
    audience: "Kim görə bilər: yalnız siz. Universitet administratoru da görmür.",
    icon: "lock",
    badgeClass: "border-border bg-background text-text-secondary",
  },
};

/** Naməlum/pozulmuş səviyyə üçün — fail closed göstərilir. */
export const UNKNOWN_VISIBILITY_META: VisibilityMeta = {
  label: "Naməlum",
  audience: "Səviyyə tanınmadı — sahə təhlükəsizlik üçün gizlədilib.",
  icon: "lock",
  badgeClass: "border-border bg-background text-text-secondary",
};

/** UI-da göstərilmə sırası. */
export const VISIBILITY_OPTIONS = VISIBILITY_LEVELS;
