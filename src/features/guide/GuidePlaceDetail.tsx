// ============================================================================
// src/features/guide/GuidePlaceDetail.tsx
// `/khankendi/[id]` — məkan detalı [M3] + SİNİF XATİRƏLƏRİ (M9 ↔ M3 körpüsü).
//
// 🔴 `PlaceMemories` MƏHZ BURADA QURAŞDIRILIR (Blok 10A-nın qalan işi).
// Komponent Blok 10A-da yazılıb və testlə örtülüb, amma heç yerə qoşulmamışdı —
// bələdçi səhifəsi o vaxt yox idi. İndi bir sətirdir.
//
// 🔴 GÖRÜNÜRLÜK — SƏHİFƏ İCTİMAİDİR, XATİRƏ İSƏ DEYİL.
// `PlaceMemories` viewer-i ÖZÜ qurur (`getViewer()`) və `listMemoriesForPlace`
// `activeVisibleWhere` şərtini məkan filtrinin ÜSTÜNƏ qoyur. Yəni:
//   · anonim ziyarətçi → YALNIZ `PUBLIC` xatirələr
//   · sinif üzvü      → `PUBLIC` + öz sinfinin `CLASS` xatirələri
// Səhifədə ƏLAVƏ filtr YOXDUR və olmamalıdır — ikinci məxfilik məntiqi
// yaratmaq CLAUDE.md §5-in qadağasıdır. Sızmanın olmaması iki testlə
// bərkidilib: `memories.db.test.ts` (servis) və `public.spec.ts` (anonim
// brauzerdə CLASS xatirənin başlığı TAPILMIR).
//
// ⚠️ Ünvan, telefon və koordinat GÖSTƏRİLİR — məkan şəhərin ictimai
// obyektidir, istifadəçi məkanı DEYİL (`KhankendiMap` başlığındaki fərq).
// ============================================================================

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, ExternalLink, MapPin, Phone, TriangleAlert } from "lucide-react";

import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { PageHeader } from "@/features/content/PageHeader";
import { PlaceMemories } from "@/features/memories/PlaceMemories";
import { guideHref, guidePlaceHref } from "@/lib/guide-filters";
import { guideCategoryLabel } from "@/lib/labels";
import type { GuidePlaceItem } from "@/services/content.service";

import { GuidePlaceCard } from "./GuidePlaceCard";

interface GuidePlaceDetailProps {
  place: GuidePlaceItem;
  /** Eyni kateqoriyadaki digər məkanlar — «qonşu» keçidləri. */
  related: GuidePlaceItem[];
}

export function GuidePlaceDetail({ place, related }: GuidePlaceDetailProps) {
  const categoryLabel = guideCategoryLabel(place.category);

  return (
    <div className="flex flex-col gap-8 py-8">
      <PageHeader
        eyebrow={categoryLabel}
        title={place.title}
        breadcrumbs={[
          { href: "/", label: "Ana səhifə" },
          { href: guideHref(), label: "Xankəndi bələdçisi" },
          { href: guidePlaceHref(place.id), label: place.title },
        ]}
      >
        {place.isEmergency ? (
          // ⚠️ Ağ mətn `danger-strong` üzərindədir (6.47:1). `bg-danger`
          // üzərində ağ mətn KUDS kontrast tələbini ÖDƏMİR (3.76:1).
          <p className="flex w-fit items-center gap-2 rounded-badge bg-danger-strong px-3 py-1 text-small font-medium text-white">
            <TriangleAlert className="h-4 w-4" aria-hidden />
            Təcili əlaqə məlumatı
          </p>
        ) : null}
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <article className="flex min-w-0 flex-col gap-6">
          {place.imageUrl ? (
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-card bg-muted">
              <Image
                src={place.imageUrl}
                alt={place.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 640px"
              />
            </div>
          ) : null}

          <div className="rounded-card border border-border bg-surface p-6">
            <h2 className="sr-only">Təsvir</h2>
            <p className="whitespace-pre-line text-body text-text-secondary">
              {place.description}
            </p>
          </div>

          {/* 🔴 M9 ↔ M3 KÖRPÜSÜ — Blok 10A komponenti (başlıqdaki qeyd).
              Blok 12D · S3-F4: sərhəd BURADADIR, seqmentdə `loading.tsx` kimi
              YOX — səhifə `notFound()` çağırır (naməlum `id` 404 verməlidir) və
              axın statusu 200-ə kilidləyərdi. Məkan təsviri (mövcudluq qapısının
              özü) dərhal görünür, viewer-dən asılı xatirələr axınla gəlir. */}
          <Suspense
            fallback={<PageSkeleton variant="list" count={2} header={false} announce={false} />}
          >
            <PlaceMemories placeId={place.id} placeTitle={place.title} />
          </Suspense>
        </article>

        <aside className="flex flex-col gap-6">
          <section
            aria-labelledby="place-facts"
            className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
          >
            <h2 id="place-facts" className="text-h4 font-medium text-text-primary">
              Praktik məlumat
            </h2>

            <dl className="flex flex-col gap-3 text-small text-text-secondary">
              <Fact label="Kateqoriya" icon={MapPin} value={categoryLabel} />

              {place.address ? (
                <Fact label="Ünvan" icon={MapPin} value={place.address} />
              ) : null}

              {place.openingHours ? (
                <Fact label="İş saatları" icon={Clock} value={place.openingHours} />
              ) : null}

              {place.phone ? (
                <div className="flex items-start gap-2">
                  <dt className="sr-only">Telefon</dt>
                  <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <dd>
                    <a
                      href={`tel:${place.phone.replace(/\s/g, "")}`}
                      className="text-ku-green underline-offset-4 hover:underline"
                    >
                      {place.phone}
                    </a>
                  </dd>
                </div>
              ) : null}

              {place.websiteUrl ? (
                <div className="flex items-start gap-2">
                  <dt className="sr-only">Sayt</dt>
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <dd className="min-w-0 break-words">
                    <a
                      href={place.websiteUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-ku-green underline-offset-4 hover:underline"
                    >
                      {place.websiteUrl}
                    </a>
                  </dd>
                </div>
              ) : null}

              {place.latitude !== null && place.longitude !== null ? (
                <div className="flex items-start gap-2">
                  <dt className="sr-only">Koordinat</dt>
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {/* ⚠️ Koordinat İCTİMAİ obyektə aiddir və bələdçinin
                      funksiyasıdır. İSTİFADƏÇİ koordinatı platformada heç yerdə
                      saxlanılmır (sxemdə belə sütun yoxdur). */}
                  <dd>
                    {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                  </dd>
                </div>
              ) : null}
            </dl>

            <Link
              href={guideHref({ category: null })}
              className="kuds-prose-link text-small"
            >
              ← Bütün bələdçi
            </Link>
          </section>

          {related.length > 0 ? (
            <section aria-labelledby="related-places" className="flex flex-col gap-4">
              <h2 id="related-places" className="text-h4 font-medium text-text-primary">
                «{categoryLabel}» bölməsində daha nə var?
              </h2>
              <ul className="flex flex-col gap-4">
                {related.map((item) => (
                  <li key={item.id}>
                    <GuidePlaceCard place={item} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Fact({
  label,
  icon: Icon,
  value,
}: {
  label: string;
  icon: typeof MapPin;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <dt className="sr-only">{label}</dt>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <dd>{value}</dd>
    </div>
  );
}
