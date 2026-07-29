// ============================================================================
// INCOMING widget-i — Xankəndi bələdçisinə keçid kartı (spec §3, §16).
//
// ⚠️ Bələdçi SƏHİFƏSİ Blok 11-dədir (`/khankendi` — `GuidePlace` modeli,
// 11 kateqoriya, xəritə və təcili nömrələr). Blok 5-in işi yalnız KEÇİDİ
// yerinə qoymaqdır, ona görə kart tam statikdir və `guide.service` YARADILMIR
// — Blok 11 onu öz sorğuları ilə birlikdə yazacaq.
//
// Kateqoriya adları `GUIDE_CATEGORY_VALUES` alt çoxluğudur; onlar burada
// yalnız gözləntini göstərmək üçün etiket kimi işlədilir, məlumat çəkilmir.
// ============================================================================

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";

/** Kartda vəd edilən bölmələr — bələdçinin 11 kateqoriyasından seçmə. */
const GUIDE_HIGHLIGHTS = [
  "Universitetə gedən yol",
  "Nəqliyyat",
  "Bazar və mağazalar",
  "Səhiyyə",
  "Təcili nömrələr",
  "Görməli yerlər",
] as const;

export function KhankendiGuideCard({ headingId }: ClassHomeWidgetProps) {
  return (
    <WidgetCard
      headingId={headingId}
      title="Xankəndi bələdçisi"
      icon="map"
      description="Şəhərə ilk dəfə gəlirsənsə — yol, nəqliyyat, xidmət və təhlükəsizlik məlumatları bir yerdə."
      footer={
        <Button asChild className="gap-2">
          <Link href="/khankendi">
            Bələdçini aç
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      }
    >
      <ul className="flex flex-wrap gap-2">
        {GUIDE_HIGHLIGHTS.map((item) => (
          <li key={item}>
            <Badge variant="outline" className="text-caption font-normal">
              {item}
            </Badge>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
