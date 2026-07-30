// ============================================================================
// src/features/guide/GuidePlaceCard.tsx
// Bələdçi məkanının kartı — `/khankendi` siyahısında.
//
// 🔴 TƏCİLİ MƏKANLAR AYRI VİZUAL TONDADIR (spec §3 — təhlükəsizlik və təcili
// əlaqə). Fon `danger-strong`, mətn ağdır: KUDS kontrast cədvəlinə görə
// ağ / `danger` = 3.76:1 ❌, ağ / `danger-strong` = 6.47:1 ✅
// (dəyərlər `tailwind.config.ts`-dədir — hex BURADA TƏKRARLANMIR).
// `bg-danger` üzərində ağ mətn YAZMA — açılış səhifəsindəki rozetdə `warning`
// fonunda TÜND mətn işlədilir, burada isə bütün kart tünddür.
//
// ⚠️ Ünvan və telefon GÖSTƏRİLİR — məxfilik pozuntusu DEYİL. Qayda
// (`coarsenLocation`) İSTİFADƏÇİ məkanına aiddir; `GuidePlace` şəhərin ictimai
// obyektidir (aptek, dayanacaq) və ünvanı bələdçinin bütün mənasıdır
// (`content.service.ts` → `listGuidePlaces` şərhi).
//
// ⚠️ Telefon `tel:` keçididir — mobil ziyarətçi üçün bir toxunuşla zəng.
// Təcili nömrələrdə bu, sadəcə rahatlıq deyil, funksiyanın özüdür.
// ============================================================================

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Phone, TriangleAlert } from "lucide-react";

import { guidePlaceHref } from "@/lib/guide-filters";
import { guideCategoryLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { GuidePlaceItem } from "@/services/content.service";

interface GuidePlaceCardProps {
  place: GuidePlaceItem;
  /** Kateqoriya rozeti — qruplaşdırılmış görünüşdə lazımsızdır. */
  showCategory?: boolean;
}

export function GuidePlaceCard({ place, showCategory = false }: GuidePlaceCardProps) {
  const emergency = place.isEmergency;

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-card border shadow-sm-kuds",
        emergency ? "border-danger-strong bg-danger-strong" : "border-border bg-surface",
      )}
    >
      {place.imageUrl && !emergency ? (
        <div className="relative aspect-[3/2] w-full bg-muted">
          <Image
            src={place.imageUrl}
            alt={place.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {emergency ? (
            <span className="inline-flex items-center gap-1 rounded-badge bg-white px-3 py-1 text-caption font-medium text-danger-strong">
              <TriangleAlert className="h-3 w-3" aria-hidden />
              Təcili
            </span>
          ) : null}

          {showCategory ? (
            <span
              className={cn(
                "rounded-badge px-3 py-1 text-caption",
                emergency ? "bg-white/20 text-white" : "bg-ku-cream text-text-primary",
              )}
            >
              {guideCategoryLabel(place.category)}
            </span>
          ) : null}
        </div>

        <h3
          className={cn(
            "text-h4 font-medium",
            emergency ? "text-white" : "text-text-primary",
          )}
        >
          <Link
            href={guidePlaceHref(place.id)}
            className="transition-opacity hover:opacity-80"
          >
            {place.title}
          </Link>
        </h3>

        <p
          className={cn(
            "line-clamp-3 text-small",
            emergency ? "text-white/90" : "text-text-secondary",
          )}
        >
          {place.description}
        </p>

        <dl
          className={cn(
            "mt-auto flex flex-col gap-1 text-small",
            emergency ? "text-white/90" : "text-text-secondary",
          )}
        >
          {place.address ? (
            <div className="flex items-start gap-2">
              <dt className="sr-only">Ünvan</dt>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <dd>{place.address}</dd>
            </div>
          ) : null}

          {place.phone ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">Telefon</dt>
              <Phone className="h-4 w-4 shrink-0" aria-hidden />
              <dd>
                <a
                  href={`tel:${place.phone.replace(/\s/g, "")}`}
                  className="underline-offset-4 hover:underline"
                >
                  {place.phone}
                </a>
              </dd>
            </div>
          ) : null}

          {place.openingHours ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">İş saatları</dt>
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              <dd>{place.openingHours}</dd>
            </div>
          ) : null}
        </dl>

        <Link
          href={guidePlaceHref(place.id)}
          className={cn(
            "flex w-fit items-center gap-1 text-small transition-opacity hover:opacity-80",
            emergency ? "text-white" : "text-ku-green",
          )}
        >
          Ətraflı
          <ArrowRight className="h-4 w-4" aria-hidden />
          <span className="sr-only">— {place.title}</span>
        </Link>
      </div>
    </article>
  );
}
