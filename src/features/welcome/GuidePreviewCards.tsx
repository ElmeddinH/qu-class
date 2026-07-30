// ============================================================================
// src/features/welcome/GuidePreviewCards.tsx
// «Xankəndi bələdçisi» önizləməsi — 3 kart (tam bələdçi Blok 11-dədir).
//
// ⚠️ Sıralama servisdəndir: `isEmergency` yazıları ƏN ÖNDƏDİR (spec §3 —
// təhlükəsizlik və təcili əlaqə). Önizləmədə bu, doğru seçimdir: şəhərə yeni
// gələn üçün ən kritik məlumat təcili nömrələrdir.
//
// ⚠️ `address` GÖSTƏRİLİR və bu, məxfilik pozuntusu deyil — söhbət şəhərin
// ictimai obyektlərindən gedir (`content.service.ts` → `listGuidePlaces` şərhi).
// İSTİFADƏÇİ məkanı üçün qayda tam əksinədir (`coarsenLocation`).
//
// ⚠️ Telefon `tel:` keçidi kimi verilir — mobil ziyarətçi üçün bir toxunuşla
// zəng. `phone` yoxdursa sətir ÜMUMİYYƏTLƏ render olunmur.
// ============================================================================

import Image from "next/image";
import { MapPin, Phone, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { guideCategoryLabel } from "@/lib/labels";
import type { GuidePlaceItem } from "@/services/content.service";

interface GuidePreviewCardsProps {
  places: GuidePlaceItem[];
}

export function GuidePreviewCards({ places }: GuidePreviewCardsProps) {
  if (places.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="Bələdçi hazırlanır"
        description="Şəhər bələdçisinin yazıları hələ əlavə olunmayıb."
      />
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {places.map((place) => (
        <li
          key={place.id}
          className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm-kuds"
        >
          {place.imageUrl ? (
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
              <span className="rounded-badge bg-ku-cream px-3 py-1 text-caption text-text-primary">
                {guideCategoryLabel(place.category)}
              </span>

              {place.isEmergency ? (
                // ⚠️ `warning` fonunda TÜND mətn (KUDS kontrast qeydi:
                // ağ / #F59E0B = 2.15:1 ❌, tünd mətn = 6.78:1 ✅).
                <span className="inline-flex items-center gap-1 rounded-badge bg-warning px-3 py-1 text-caption text-text-primary">
                  <TriangleAlert className="h-3 w-3" aria-hidden />
                  Təcili
                </span>
              ) : null}
            </div>

            <h3 className="text-h4 font-medium text-text-primary">{place.title}</h3>

            <p className="line-clamp-3 text-small text-text-secondary">
              {place.description}
            </p>

            <dl className="mt-auto flex flex-col gap-1 text-small text-text-secondary">
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
                      className="transition-colors hover:text-ku-green"
                    >
                      {place.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </li>
      ))}
    </ul>
  );
}
