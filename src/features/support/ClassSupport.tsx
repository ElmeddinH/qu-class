// ============================================================================
// src/features/support/ClassSupport.tsx
// Dəstək təklifləri səthi — spec §9 («iş imkanlarının paylaşılması» daxil).
//
// Blok 5-ə qədər dəstək təklifləri YALNIZ Class Page widget-i idi (ilk 6 nəfər,
// yalnız rozetlər). Bu səhifə tam siyahını 7 növ üzrə qruplaşdırır və qeydləri
// (`SupportOffer.note`) göstərir.
//
// 🔴 ÜÇÜNCÜ, MÜSTƏQİL RAZILIQ: `User.openToSupport`. Görünürlük səviyyəsi
// (`visibility`) və aqreqasiya razılığı (`includeInStats`) ilə QARIŞDIRMA —
// filtr servisdədir (`listCohortSupportOffers`).
//
// 🔴 ƏLAQƏ MƏLUMATI GÖSTƏRİLMİR. `phone` / `personalEmail` default `PRIVATE`-dır
// və `redactProfile`-dan keçir; «Əlaqə» düyməsi PROFİL LİNKİDİR. E-poçtu burada
// göstərmək məxfilik modelinin ən sadə pozuntusu olardı.
//
// ⚠️ QRUPLAŞDIRMA JS-dədir, SÜZGƏC yox: bütün süzgəc DB-dədir (razılıq bayrağı
// + üzvlük), JS yalnız ARTIQ SÜZÜLMÜŞ siyahını növlərə paylayır.
// ============================================================================

import { Suspense } from "react";
import Link from "next/link";
import { Briefcase, HandHeart, Lock, UserRound } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { SUPPORT_OFFER_TYPE_VALUES, SupportOfferType } from "@/lib/enums";
import { supportOfferLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CohortHeader } from "@/services/cohort.service";
import {
  listCohortSupportOffers,
  type SupportOfferEntry,
} from "@/services/cohort.service";

/** Növlərin qısa izahı — səhifə "hansı dəstək nədir?" sualını da cavablayır. */
const SUPPORT_HINTS: Record<string, string> = {
  GUEST_LECTURE: "Sinifdə və ya fakültədə qonaq mühazirəsi.",
  CAREER_TALK: "Karyera yolu haqqında söhbət, sual-cavab.",
  INTERNSHIP: "Öz şirkətində təcrübə imkanı.",
  JOB_SHARING: "Açıq vakansiyaların paylaşılması.",
  MENTORING: "Fərdi mentorluq və məsləhət.",
  STARTUP_COLLAB: "Startap və layihə əməkdaşlığı.",
  EVENT_PARTICIPATION: "Universitet tədbirlərində iştirak.",
};

/**
 * 🔴 BAŞLIQ SORĞUNU GÖZLƏMİR (Blok 12D · S3-F4).
 *
 * Səhifə status qapısındandır (`support/page.tsx` → `notFound()`), yəni
 * seqmentə `loading.tsx` QOYULA BİLMİR (axın 404-ü 200-ə çevirər). Skeleton
 * qapıdan SONRA, burada verilir.
 *
 * ⚠️ TƏLƏ C: `listCohortSupportOffers` sərhədin İÇİNDƏ (`SupportBody`)
 * çağırılır. Burada `await` edilsəydi boundary boşa işləyərdi.
 *
 * ⚠️ Sayğac («N təklif · M nəfər») sərhədin İÇİNƏ köçdü — dataya bağlıdır və
 * başlıqda qalsaydı başlıq da gözləməli olardı.
 */
export function ClassSupport({ cohort }: { cohort: CohortHeader }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-h1 font-bold text-text-primary">Dəstək təklifləri</h1>
        <p className="text-body text-text-secondary">
          {cohort.displayName} · məzunların tələbələrə və universitetə təklif etdiyi
          dəstək. Yalnız «dəstəyə açığam» seçimini işarələyənlər görünür.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/me/career">Öz təklifimi redaktə et</Link>
          </Button>
        </div>
      </header>

      {/* Fallback: iki sütunlu təklif kartları — real qridlə eyni forma. */}
      <Suspense fallback={<PageSkeleton variant="cards" count={4} header={false} announce={false} />}>
        <SupportBody cohort={cohort} />
      </Suspense>
    </div>
  );
}

async function SupportBody({ cohort }: { cohort: CohortHeader }) {
  const viewer = await getViewer();
  const offers = await listCohortSupportOffers(viewer, cohort.id);

  const byType = new Map<string, SupportOfferEntry[]>(
    SUPPORT_OFFER_TYPE_VALUES.map((type) => [type, []]),
  );
  for (const offer of offers) byType.get(offer.type)?.push(offer);

  const contributorCount = new Set(offers.map((offer) => offer.user.id)).size;

  return (
    <>
      <p className="text-small text-text-secondary">
        {offers.length} təklif · {contributorCount} nəfər
      </p>

      {!cohort.isMember ? (
        <EmptyState
          icon={Lock}
          title="Bu siyahı bağlıdır"
          description="Dəstək təklifləri yalnız həmin sinfin üzvlərinə göstərilir."
        />
      ) : offers.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title="Hələ dəstək təklifi yoxdur"
          description="Profilində «dəstəyə açığam» seçimini işarələyib qonaq mühazirəsi, mentorluq və ya təcrübə imkanı təklif edə bilərsən."
          action={{ href: "/me/career", label: "Təklif əlavə et" }}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {SUPPORT_OFFER_TYPE_VALUES.map((type) => {
            const items = byType.get(type) ?? [];
            if (items.length === 0) return null;

            const headingId = `support-${type.toLowerCase()}`;
            const isJobSharing = type === SupportOfferType.JOB_SHARING;

            return (
              <section key={type} aria-labelledby={headingId} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h2
                    id={headingId}
                    className="flex items-center gap-2 text-h2 font-semibold text-text-primary"
                  >
                    {isJobSharing ? (
                      <Briefcase className="h-5 w-5 shrink-0 text-ku-green" aria-hidden />
                    ) : (
                      <HandHeart className="h-5 w-5 shrink-0 text-ku-green" aria-hidden />
                    )}
                    {supportOfferLabel(type)}
                    <Badge variant="outline" className="text-caption font-normal">
                      {items.length}
                    </Badge>
                  </h2>
                  <p className="text-small text-text-secondary">{SUPPORT_HINTS[type]}</p>
                </div>

                <ul className="grid gap-4 md:grid-cols-2">
                  {items.map((offer) => (
                    <li key={`${offer.user.id}-${offer.type}`}>
                      <OfferCard offer={offer} isJobSharing={isJobSharing} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function OfferCard({
  offer,
  isJobSharing,
}: {
  offer: SupportOfferEntry;
  isJobSharing: boolean;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col gap-4 rounded-card border border-border p-6 shadow-sm-kuds",
        // İş elanı vizual olaraq fərqlənir — spec §9-un ayrıca vurğuladığı hal.
        isJobSharing ? "bg-ku-cream" : "bg-surface",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={offer.user.avatarUrl ?? undefined} alt="" />
          <AvatarFallback className="bg-ku-soft text-caption text-ku-dark">
            {offer.user.firstName.charAt(0)}
            {offer.user.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col">
          {/* T22: `CardTitle` <div>-dir → semantik başlıq əl ilə. */}
          <h3 className="truncate text-body font-semibold text-text-primary">
            {offer.user.firstName} {offer.user.lastName}
          </h3>

          {/* Şirkət yalnız `CareerEntry` görünürlükdən keçdikdə gəlir. */}
          {offer.company ? (
            <span className="truncate text-caption text-text-secondary">
              {offer.position ? `${offer.position} · ` : ""}
              {offer.company}
            </span>
          ) : null}
        </div>
      </div>

      {offer.note ? (
        <p className="whitespace-pre-line break-words text-small text-text-primary">
          {offer.note}
        </p>
      ) : (
        <p className="text-small text-text-secondary">
          {supportOfferLabel(offer.type)} üçün əlaqə saxlaya bilərsiniz.
        </p>
      )}

      <div className="mt-auto">
        {/* «Əlaqə» = PROFİL LİNKİ. E-poçt/telefon burada göstərilmir. */}
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href={`/u/${offer.user.id}`}>
            <UserRound className="h-4 w-4" aria-hidden />
            Əlaqə
          </Link>
        </Button>
      </div>
    </article>
  );
}
