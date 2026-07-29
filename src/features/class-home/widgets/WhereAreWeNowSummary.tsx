// ============================================================================
// spec §16 blok 12 — "İndi haradayıq?" xülasəsi.
//
// ⚠️ Bu widget ÜÇ QAT qorunmuş aqreqasiyanı göstərir (bax `services/stats.service.ts`):
//   1. görünürlük · 2. `includeInStats` razılığı · 3. k-anonimlik (min 3 nəfər).
// Ona görə burada HEÇ BİR əlavə hesablama edilmir — nə "Digər"i açmaq, nə də
// kiçik xanaları geri qatmaq. Gizlədilən sətirlərin cəmi `otherCount`-dadır.
//
// ⚠️ Dəqiq ünvan/koordinat heç vaxt göstərilmir — servis yalnız şəhər/ölkə
// buraxır (`coarsenLocation`).
//
// ⚠️ AD TOQQUŞMASI TƏLƏSİ: `Industry` enum-unda `OTHER` ("Digər") dəyəri var,
// k-anonimlik nəticəsi də intuitiv olaraq "Digər" adlanardı. İkisi eyni
// siyahıda yan-yana düşür və istifadəçi iki eyni adlı rozet görür. Buna görə
// gizlədilmiş qrup «Açıqlanmayan» adlanır — həm toqquşma qalxır, həm də ad
// dəqiqdir (bu, ayrıca kateqoriya deyil, GİZLƏDİLMİŞ sətirlərdir).
// ============================================================================

import Link from "next/link";
import { Building2, Globe2, GraduationCap, MapPinned, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { UserStage } from "@/lib/enums";
import { degreeLabel, industryLabel } from "@/lib/labels";
import { MIN_BUCKET_SIZE } from "@/lib/visibility";
import { getWhereAreWeNowStats } from "@/services/stats.service";
import type { StatsBucket, SuppressedBuckets } from "@/services/stats.service";

import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";

/** Xülasədə göstərilən maksimum xana — tam panel `/class/[slug]/map`-dədir. */
const BUCKET_LIMIT = 4;

export async function WhereAreWeNowSummary({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const stats = await getWhereAreWeNowStats(viewer, { cohortId: cohort.id });

  const mapHref = `/class/${cohort.slug}/map`;
  const hasData = stats.respondentCount > 0;

  const dimensions: Array<{
    key: string;
    title: string;
    icon: React.ReactNode;
    buckets: SuppressedBuckets<StatsBucket>;
    labelOf: (key: string) => string;
  }> = [
    {
      key: "countries",
      title: "Ölkələr",
      icon: <Globe2 className="h-4 w-4 text-ku-green" aria-hidden />,
      buckets: stats.countries,
      labelOf: (key) => key,
    },
    {
      key: "industries",
      title: "Fəaliyyət sahələri",
      icon: <Building2 className="h-4 w-4 text-ku-green" aria-hidden />,
      buckets: stats.industries,
      labelOf: industryLabel,
    },
    {
      key: "degrees",
      title: "Təhsil dərəcələri",
      icon: <GraduationCap className="h-4 w-4 text-ku-green" aria-hidden />,
      buckets: stats.degrees,
      labelOf: degreeLabel,
    },
  ];

  const withData = dimensions.filter((dimension) => dimension.buckets.visible.length > 0);

  return (
    <WidgetCard
      headingId={headingId}
      title="İndi haradayıq?"
      icon="map"
      description={`Yalnız statistikaya razılıq verənlər sayılır; ${MIN_BUCKET_SIZE} nəfərdən kiçik qruplar «Açıqlanmayan»a yığılır.`}
      action={hasData ? { href: mapHref, label: "Tam panel" } : undefined}
    >
      {!hasData ? (
        // Boş ekran deyil — mərhələyə uyğun izah və növbəti addım.
        <EmptyState
          icon={MapPinned}
          title="Statistika hələ formalaşmayıb"
          description={
            cohort.stage === UserStage.ALUMNI
              ? "Sinif yoldaşları karyera məlumatını əlavə edib «statistikaya daxil et» seçimini işarələdikcə bu panel dolacaq."
              : "Bu panel əsasən məzuniyyətdən sonra doldurulur. Karyera qeydini indidən əlavə edə bilərsiniz — statistikaya qoşulmaq ayrıca seçimdir."
          }
          action={{ href: "/me/career", label: "Karyera məlumatım" }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatCard
              icon={Users}
              value={stats.respondentCount}
              label="məlumat paylaşan sinif yoldaşı"
              hint="statistikaya razılıq verib"
            />
            <StatCard
              icon={MapPinned}
              value={stats.locations.visible.length + stats.countries.visible.length}
              label="açıqlanan məkan qrupu"
              hint={`${MIN_BUCKET_SIZE} nəfərdən kiçik qruplar gizlədilir`}
            />
          </div>

          {withData.length === 0 ? (
            // Məlumat var, amma hər xana k-anonimlik həddindən kiçikdir.
            // Bu, nasazlıq deyil — məxfilik mühərrikinin işləməsidir.
            <p className="rounded-card border border-dashed border-border p-4 text-small text-text-secondary">
              {stats.respondentCount} nəfər məlumatını paylaşıb, amma qruplar hələ
              çox kiçikdir: hər ölkə, sahə və dərəcə üzrə {MIN_BUCKET_SIZE} nəfərdən
              az adam var, ona görə bölgü göstərilmir. Daha çox məzun qoşulduqca
              rəqəmlər açılacaq.
            </p>
          ) : (
            withData.map((dimension) => (
              <BucketList
                key={dimension.key}
                icon={dimension.icon}
                title={dimension.title}
                items={dimension.buckets.visible
                  .slice(0, BUCKET_LIMIT)
                  .map((bucket) => ({
                    label: dimension.labelOf(bucket.key),
                    count: bucket.count,
                  }))}
                hiddenCount={dimension.buckets.otherCount}
              />
            ))
          )}

          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link href={mapHref}>Xəritə və qrafiklərə bax</Link>
          </Button>
        </div>
      )}
    </WidgetCard>
  );
}

function BucketList({
  icon,
  title,
  items,
  hiddenCount,
}: {
  icon: React.ReactNode;
  title: string;
  items: Array<{ label: string; count: number }>;
  /** k-anonimliklə gizlədilmiş sətirlərin cəmi (`SuppressedBuckets.otherCount`). */
  hiddenCount: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="flex items-center gap-2 text-small font-medium text-text-primary">
        {icon}
        {title}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.label}>
            <Badge variant="outline" className="text-caption font-normal">
              {item.label} · {item.count}
            </Badge>
          </li>
        ))}
        {hiddenCount > 0 ? (
          <li>
            <Badge
              variant="outline"
              className="border-dashed text-caption font-normal text-text-secondary"
              title={`${MIN_BUCKET_SIZE} nəfərdən kiçik qruplar məxfilik üçün birləşdirilib`}
            >
              Açıqlanmayan · {hiddenCount}
            </Badge>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
