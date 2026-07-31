// ============================================================================
// src/features/memories/PlaceMemories.tsx
// «Sinif yoldaşlarının bu yer haqqında xatirələri» — M9 ↔ M3 körpüsü.
//
// 🔴 BLOK 11-DƏ QURAŞDIRILACAQ. Xankəndi bələdçisi səhifəsi (M3) hələ yoxdur;
// bu komponent indi yazılır və testlə örtülür ki, bələdçi gələndə yalnız
// `<PlaceMemories placeId={place.id} />` sətri əlavə edilsin.
//
// 🔴 GÖRÜNÜRLÜK — ƏN VACİB HİSSƏ:
// Bələdçi səhifəsi İCTİMAİ olacaq, yəni bu komponent ANONİM viewer ilə də
// render olunacaq. Servis (`listMemoriesForPlace`) `activeVisibleWhere`
// şərtini MƏCBURİ tətbiq edir — məkan filtri onun ƏVƏZİ deyil, ÜSTƏLİYİDİR.
// Anonim ziyarətçi yalnız `PUBLIC` xatirələri görür; `CLASS` və `PRIVATE`
// məzmun məkan səhifəsi üzərindən SIZMIR (inteqrasiya testi ilə bərkidilib).
//
// ⚠️ SERVER komponentidir və viewer-i özü qurur (`getViewer`) — çağıran
// səhifənin ötürməsini gözləmir. Səbəb: səhv yerdə ötürülmüş viewer sızma
// deməkdir, `getViewer()` isə `cache()`-lənib (render başına bir sorğu).
// ============================================================================

import Link from "next/link";
import { Heart, MapPin } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import { memoryTypeLabel } from "@/lib/labels";
import { MEMORY_PLACE_FLAG, MEMORY_PARAMS } from "@/lib/memory-filters";
import {
  PLACE_MEMORY_LIMIT,
  countMemoriesForPlace,
  listMemoriesForPlace,
} from "@/services/memory.service";
import { shortDate } from "@/utils/date";

interface PlaceMemoriesProps {
  placeId: string;
  /** Bələdçi kartındakı başlıq üçün — məkanın adı. */
  placeTitle?: string;
  take?: number;
  /** `aria-labelledby` üçün — bələdçi səhifəsi öz id-sini verir. */
  headingId?: string;
}

export async function PlaceMemories({
  placeId,
  placeTitle,
  take = PLACE_MEMORY_LIMIT,
  headingId = `place-memories-${placeId}`,
}: PlaceMemoriesProps) {
  const viewer = await getViewer();

  const [memories, total] = await Promise.all([
    listMemoriesForPlace(viewer, placeId, take),
    countMemoriesForPlace(viewer, placeId),
  ]);

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id={headingId}
          className="flex items-center gap-2 text-h4 font-medium text-text-primary"
        >
          <MapPin className="h-4 w-4 shrink-0 text-ku-green" aria-hidden />
          Sinif yoldaşlarının bu yer haqqında xatirələri
        </h3>

        {total > memories.length ? (
          <span className="text-caption text-text-secondary">{total} xatirə</span>
        ) : null}
      </div>

      {memories.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Bu yer haqqında hələ xatirə yoxdur"
          description={
            placeTitle
              ? `«${placeTitle}» ilə bağlı ilk xatirəni sən yaza bilərsən.`
              : "Xatirə yazarkən «bu xatirə hansı məkanla bağlıdır?» sualını doldur."
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {memories.map((memory) => (
            <li
              key={memory.id}
              className="flex flex-col gap-2 rounded-card bg-ku-blue p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-text-primary/20 bg-surface/70 text-caption font-normal text-text-primary"
                >
                  {memoryTypeLabel(memory.type)}
                </Badge>
                <time
                  dateTime={memory.occurredAt.toISOString()}
                  className="text-caption text-text-primary/70"
                >
                  {shortDate(memory.occurredAt)}
                </time>
              </div>

              <p className="text-body font-medium text-text-primary">{memory.title}</p>

              <p className="line-clamp-3 whitespace-pre-line text-small text-text-primary/90">
                {memory.body}
              </p>

              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={memory.author.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="bg-surface text-caption text-text-primary">
                    {memory.author.firstName.charAt(0)}
                    {memory.author.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-caption text-text-primary/80">
                  {memory.author.firstName} {memory.author.lastName} ·{" "}
                  {memory.cohort.displayName}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {memories.length > 0 ? (
        // Sinif səhifəsindəki tam siyahı — «yalnız məkanla bağlı» filtri ilə.
        // ⚠️ Link yalnız üzvlər üçün mənalıdır; anonim ziyarətçi `/login`-ə
        // düşür (middleware) və bu, doğru davranışdır.
        <Link
          href={`/class/${memories[0].cohort.slug}/memories?${MEMORY_PARAMS.place}=${MEMORY_PLACE_FLAG}`}
          className="kuds-prose-link text-small"
        >
          Məkanla bağlı bütün xatirələr
        </Link>
      ) : null}
    </section>
  );
}
