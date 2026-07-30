// ============================================================================
// src/features/guide/GuideDirectory.tsx
// `/khankendi` — Xankəndi bələdçisi [M3] (spec §3, 10 bənd → sxemdə 11
// kateqoriya + xəritə GÖRÜNÜŞÜ).
//
// 🔴 TƏCİLİ MƏKANLAR SİYAHININ BAŞINDADIR və ayrı vizual tondadır — spec §3-ün
// "təhlükəsizlik və təcili əlaqə" bəndi. Şəhərə yeni gələn üçün ən kritik
// məlumat təcili nömrələrdir və onları 11 başlıq arasında axtarmaq səhvdir.
// Ton `GuidePlaceCard`-dadır (`danger-strong` + ağ mətn, 6.47:1).
//
// ⚠️ Kateqoriya filtri URL-DƏDİR (`?category=TRANSPORT`) — «Xankəndidə
// nəqliyyat» linki paylaşıla bilən olmalıdır. Filtr DB-yə ötürülür
// (`listGuidePlaces(category)`), JS-də süzülmür.
//
// ⚠️ Filtr AKTİV olanda xəritə yenə də GÖSTƏRİLİR, amma yalnız süzülmüş
// nöqtələrlə: «marketlər harada?» sualının cavabı məhz budur.
//
// ⚠️ İCTİMAİ SƏHİFƏ — `content.service` `Viewer` almır. Səhifədəki YEGANƏ
// istifadəçi məzmunu məkan xatirələridir (`PlaceMemories`) və o, öz viewer-ini
// `getViewer()` ilə qurub `activeVisibleWhere`-dən keçirir (bax detal səhifəsi).
// ============================================================================

import Link from "next/link";
import { MapPin } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/features/content/PageHeader";
import { GUIDE_CATEGORY_VALUES } from "@/lib/enums";
import {
  emergencyFirst,
  groupPlacesByCategory,
  guideHref,
  type GuideFilterState,
} from "@/lib/guide-filters";
import { guideCategoryLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { GuidePlaceItem } from "@/services/content.service";

import { GuideMapPanel } from "./GuideMapPanel";
import { GuidePlaceCard } from "./GuidePlaceCard";
import type { GuideMapPlace } from "./KhankendiMap";

interface GuideDirectoryProps {
  places: GuidePlaceItem[];
  filters: GuideFilterState;
}

/** Koordinatı olan məkanlar → xəritə nöqtələri. */
function toMapPlaces(places: GuidePlaceItem[]): GuideMapPlace[] {
  return places.flatMap((place) =>
    place.latitude === null || place.longitude === null
      ? []
      : [
          {
            id: place.id,
            title: place.title,
            category: place.category,
            latitude: place.latitude,
            longitude: place.longitude,
            isEmergency: place.isEmergency,
          },
        ],
  );
}

export function GuideDirectory({ places, filters }: GuideDirectoryProps) {
  const emergency = places.filter((place) => place.isEmergency);
  const mapPlaces = toMapPlaces(places);
  const groups = groupPlacesByCategory(places);

  return (
    <div className="flex flex-col gap-8 py-8">
      <PageHeader
        eyebrow="Şəhər bələdçisi"
        title="Xankəndi bələdçisi"
        description="Şəhərin tarixi, əsas məkanları, nəqliyyat, universitetə gediş yolları, marketlər, sağlamlıq, mədəniyyət, təhlükəsizlik və yeni gələnlər üçün praktik məsləhətlər."
        breadcrumbs={[
          { href: "/", label: "Ana səhifə" },
          { href: "/khankendi", label: "Xankəndi bələdçisi" },
        ]}
      />

      {/* --- Təcili əlaqələr — filtrdən ASILI OLMAYARAQ ən üstdə --- */}
      {emergency.length > 0 ? (
        <section aria-labelledby="emergency-heading" className="flex flex-col gap-4">
          <h2 id="emergency-heading" className="text-h3 font-semibold text-text-primary">
            Təcili əlaqə
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {emergencyFirst(emergency).map((place) => (
              <li key={place.id}>
                <GuidePlaceCard place={place} showCategory />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* --- Xəritə görünüşü (spec §3, 10-cu bənd) --- */}
      <section aria-labelledby="map-heading" className="flex flex-col gap-4">
        <h2 id="map-heading" className="text-h3 font-semibold text-text-primary">
          Xəritə və vacib nöqtələr
        </h2>

        {mapPlaces.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Xəritədə göstəriləcək nöqtə yoxdur"
            description="Seçilmiş kateqoriyadaki yazıların koordinatı yoxdur. Siyahı aşağıda tam görünür."
          />
        ) : (
          <GuideMapPanel
            places={mapPlaces}
            withoutCoordinates={places.length - mapPlaces.length}
          />
        )}
      </section>

      {/* --- Kateqoriya filtri --- */}
      <nav aria-label="Kateqoriya filtri" className="flex flex-wrap gap-2">
        <CategoryChip
          href={guideHref({ category: null })}
          label="Hamısı"
          active={filters.category === null}
        />
        {GUIDE_CATEGORY_VALUES.map((category) => (
          <CategoryChip
            key={category}
            href={guideHref({ category })}
            label={guideCategoryLabel(category)}
            active={filters.category === category}
          />
        ))}
      </nav>

      {/* --- Kateqoriyalar üzrə siyahı --- */}
      {groups.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Bu kateqoriyada yazı yoxdur"
          description="Seçilmiş kateqoriya üçün bələdçi yazısı hələ əlavə olunmayıb."
          action={{ href: guideHref(), label: "Bütün kateqoriyalar" }}
        />
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map((group) => (
            <section
              key={group.category}
              id={group.category.toLowerCase()}
              aria-labelledby={`guide-${group.category}`}
              className="flex scroll-mt-24 flex-col gap-4"
            >
              <h2
                id={`guide-${group.category}`}
                className="text-h3 font-semibold text-text-primary"
              >
                {guideCategoryLabel(group.category)}
              </h2>

              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {emergencyFirst(group.items).map((place) => (
                  <li key={place.id}>
                    <GuidePlaceCard place={place} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-small text-text-secondary">
        Bələdçi redaksiya məzmunudur. Sinif yoldaşlarının məkanlarla bağlı
        xatirələrini hər məkanın öz səhifəsində oxuya bilərsən —{" "}
        <Link href="/register" className="text-ku-green hover:underline">
          qeydiyyatdan keçib
        </Link>{" "}
        öz xatirəni də əlavə et.
      </p>
    </div>
  );
}

function CategoryChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-badge px-3 py-1 text-small transition-colors",
        active
          ? "bg-ku-green font-medium text-white"
          : "bg-muted text-text-secondary hover:bg-ku-soft hover:text-ku-dark",
      )}
    >
      {label}
    </Link>
  );
}
