// ============================================================================
// spec §16 blok 14 — "Paylaşım yarat" düyməsi.
//
// Kompozitor lent səhifəsindədir (`features/feed/PostComposer`), ona görə bu
// blok ora keçid verir. Üzv olmayan viewer paylaşım edə bilmir — lentdə də
// kompozitor göstərilmir (`ClassFeed canPost={cohort.isMember}`), burada da
// düymə əvəzinə izah verilir.
// ============================================================================

import Link from "next/link";
import { Info, MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";

export function CreatePostCta({ cohort, headingId }: ClassHomeWidgetProps) {
  return (
    <WidgetCard
      headingId={headingId}
      title="Paylaşım yarat"
      icon="postPlus"
      description="Foto, xatirə, nailiyyət və ya qısa qeyd."
      footer={
        cohort.isMember ? (
          <Button asChild className="gap-2">
            <Link href={`/class/${cohort.slug}/feed`}>
              <MessageSquarePlus className="h-4 w-4" aria-hidden />
              Paylaşım yaz
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={`/class/${cohort.slug}/feed`}>Lentə bax</Link>
          </Button>
        )
      }
    >
      {cohort.isMember ? (
        <p className="text-small text-text-secondary">
          Paylaşarkən görünürlük səviyyəsini özünüz seçirsiniz. İstəsəniz eyni
          paylaşım xronologiyaya və nailiyyətlərə də düşür — bunlar ayrı-ayrı
          seçimlərdir.
        </p>
      ) : (
        <p className="flex items-start gap-2 text-small text-text-secondary">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ku-green" aria-hidden />
          Bu sinfin üzvü olmadığınız üçün paylaşım edə bilmirsiniz. Lentin sizə
          açıq olan hissəsinə baxa bilərsiniz.
        </p>
      )}
    </WidgetCard>
  );
}
