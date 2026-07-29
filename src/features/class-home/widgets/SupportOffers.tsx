// ============================================================================
// ALUMNI widget-i — dəstək təklifləri (spec §9, PLAN.md §4.6).
//
// ⚠️ RAZILIQ: `SupportOffer` sətrində `visibility` sütunu yoxdur; siyahı
// `User.openToSupport` bayrağı ilə qapılanır (bax `cohort.service.ts` →
// `listSupportOffers`). Bayraq işarələnməyibsə təklif göstərilmir — seed-də
// belə sətirlər var və onlar QAYTARILMIR.
// ============================================================================

import Link from "next/link";
import { HandHeart, Lock } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import { supportOfferLabel } from "@/lib/labels";
import { listSupportOffers } from "@/services/cohort.service";

import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";

const SUPPORT_LIMIT = 5;

export async function SupportOffers({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const offers = await listSupportOffers(viewer, cohort.id, SUPPORT_LIMIT);

  return (
    <WidgetCard
      headingId={headingId}
      title="Dəstək təklifləri"
      icon="handshake"
      description="Sinif yoldaşlarının universitetə və bir-birinə təklif etdiyi dəstək."
      action={{ href: `/class/${cohort.slug}/directory`, label: "Kataloq" }}
    >
      {offers.length === 0 ? (
        cohort.isMember ? (
          <EmptyState
            icon={HandHeart}
            title="Hələ dəstək təklifi yoxdur"
            description="Profilinizdə «dəstəyə açığam» seçimini işarələyib qonaq mühazirəsi, mentorluq və ya təcrübə imkanı təklif edə bilərsiniz."
            action={{ href: "/me", label: "Profilimi aç" }}
          />
        ) : (
          <EmptyState
            icon={Lock}
            title="Bu siyahı bağlıdır"
            description="Dəstək təklifləri yalnız həmin sinfin üzvlərinə göstərilir."
          />
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {offers.map((offer) => (
            <li key={offer.user.id} className="flex items-start gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                {offer.user.avatarUrl ? (
                  <AvatarImage src={offer.user.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="bg-ku-soft text-caption text-ku-dark">
                  {offer.user.firstName.charAt(0)}
                  {offer.user.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex min-w-0 flex-col gap-1">
                <Link
                  href={`/u/${offer.user.id}`}
                  className="truncate text-small font-medium text-text-primary hover:text-ku-green hover:underline"
                >
                  {offer.user.firstName} {offer.user.lastName}
                </Link>

                <ul className="flex flex-wrap gap-1">
                  {offer.types.map((type) => (
                    <li key={type}>
                      <Badge
                        variant="outline"
                        className="text-caption font-normal"
                      >
                        {supportOfferLabel(type)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
