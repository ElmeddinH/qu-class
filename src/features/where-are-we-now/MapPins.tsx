"use client";

// ============================================================================
// src/features/where-are-we-now/MapPins.tsx
// Xəritə markerləri və onların məlumat kartı — dünya və Azərbaycan
// görünüşlərinin ORTAQ hissəsi.
//
// ============================================================================
// 🔴 TOOLTIP SƏRHƏDİ — bu blokun ən vacib UI qərarı
// ============================================================================
// Kartda GÖSTƏRİLİR:
//   · şəhər və ölkə adı
//   · «N nəfər»
//   · vəzifə bölgüsü — YALNIZ həmin şəhərdə ≥ 3 nəfər olan istiqamətlər
//
// Kartda HEÇ VAXT GÖSTƏRİLMİR:
//   · ad / soyad
//   · şirkət–şəxs bağı ("Azercell-də çalışan Elvin")
//   · profil linki
//   · dəqiq ünvan və ya koordinat
//
// Səbəb: bu üç şeydən BİRİ əlavə olunan kimi xəritə "karyera statistikası"ndan
// «insan izləyicisi»nə çevrilir — 20 nəfərlik sinifdə "Bakı → Azercell → bir
// nəfər" zənciri onsuz da adı deyir. Sərhəd e2e testi ilə bərkidilib
// (`tests/e2e/map.spec.ts` seed adlarını səhifə mətnində AXTARIR və
// TAPMAMALIDIR).
//
// ⚠️ VƏZİFƏ BÖLGÜSÜ BİRGƏ CƏDVƏLDİR (şəhər × vəzifə) və ona görə AYRICA
// k-anonimlikdən keçir (`lib/career-stats.ts` → `MapPin.roles`). Marjinal
// xanalar təmiz olsa da "Bakı · 2 müəllim" konkret iki nəfəri göstərir.
//
// ⚠️ ƏLÇATANLIQ: hər marker `tabIndex={0}` ilə klaviatura fokusuna düşür və
// `<title>` elementi daşıyır (ekran oxuyucusu üçün). Xəritə TƏK mənbə deyil —
// eyni məlumatın cədvəli hər görünüşün altındadır (KUDS §21 / WCAG 2.2).
// ============================================================================

import { Marker } from "react-simple-maps";

import { MIN_BUCKET_SIZE, pinRadius, type MapPin } from "@/lib/career-stats";
import { jobFunctionLabel } from "@/lib/labels";

interface MapPinsLayerProps {
  pins: MapPin[];
  /** Ən böyük pin — radius nisbəti üçün. */
  maxCount: number;
  activeId: string | null;
  onActivate: (id: string | null) => void;
}

/** Markerin ekran oxuyucusuna oxunan mətni — kartla EYNİ məzmun. */
function pinTitle(pin: MapPin): string {
  const roles =
    pin.roles.length > 0
      ? ` · ${pin.roles.map((r) => `${r.count} ${jobFunctionLabel(r.key)}`).join(", ")}`
      : "";
  return `${pin.city}, ${pin.country} — ${pin.count} nəfər${roles}`;
}

export function MapPinsLayer({ pins, maxCount, activeId, onActivate }: MapPinsLayerProps) {
  return (
    <>
      {pins.map((pin) => {
        const radius = pinRadius(pin.count, maxCount);
        const isActive = activeId === pin.id;

        return (
          <Marker
            key={pin.id}
            coordinates={[pin.lon, pin.lat]}
            tabIndex={0}
            role="button"
            aria-label={pinTitle(pin)}
            className="cursor-pointer outline-none"
            onMouseEnter={() => onActivate(pin.id)}
            onMouseLeave={() => onActivate(null)}
            onFocus={() => onActivate(pin.id)}
            onBlur={() => onActivate(null)}
          >
            <title>{pinTitle(pin)}</title>
            {/* Fokus halqası: SVG-də `outline` etibarsızdır, ona görə ayrı
                dairə çəkilir (klaviatura istifadəçisi hansı pində olduğunu
                görməlidir — KUDS fokus tələbi). */}
            {isActive ? (
              <circle
                r={radius + 4}
                fill="none"
                stroke="var(--map-pin-active)"
                strokeWidth={2}
              />
            ) : null}
            <circle
              r={radius}
              fill={isActive ? "var(--map-pin-active)" : "var(--map-pin)"}
              stroke="var(--map-pin-stroke)"
              strokeWidth={2}
              fillOpacity={0.9}
            />
          </Marker>
        );
      })}
    </>
  );
}

/**
 * Aktiv markerin məlumat kartı. Pin seçilməyəndə istifadə təlimatı göstərilir —
 * boş yer qalmasın və klaviatura istifadəçisi nə edəcəyini bilsin.
 */
export function PinDetails({ pin }: { pin: MapPin | null }) {
  if (pin === null) {
    return (
      <p className="text-caption text-text-secondary">
        Nöqtənin üzərinə gəlin və ya <kbd className="font-medium">Tab</kbd> ilə fokuslanın —
        şəhər üzrə bölgü burada görünəcək.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-small font-medium text-text-primary">
        {pin.city}, {pin.country} · {pin.count} nəfər
      </p>

      {pin.roles.length > 0 ? (
        <p className="text-caption text-text-secondary">
          {pin.roles.map((role) => `${role.count} ${jobFunctionLabel(role.key)}`).join(" · ")}
          {pin.undisclosedRoles > 0 ? ` · Açıqlanmayan ${pin.undisclosedRoles}` : ""}
        </p>
      ) : (
        // Şəhər açıqdır (≥3 nəfər), amma vəzifə bölgüsü deyil. Səbəb yazılır —
        // boş sətir "məlumat yoxdur" kimi oxunardı.
        <p className="text-caption text-text-secondary">
          Vəzifə bölgüsü açıqlanmır: bu şəhərdə hər istiqamət üzrə{" "}
          {MIN_BUCKET_SIZE} nəfərdən az adam var.
        </p>
      )}
    </div>
  );
}
