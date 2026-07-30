"use client";

// ============================================================================
// src/features/memories/MemoryCard.tsx
// Xatirənin HEKAYƏVİ kartı — spec §11 «daha hekayəvi və vizual formada».
//
// 🔴 LENT KARTINDAN (`features/feed/PostCard.tsx`) VİZUAL OLARAQ FƏRQLİDİR və
// bu, spec-in birbaşa tələbidir. Fərqlər:
//   · geniş şəkil (kartın bütün enində, 3:2), lentdə isə kiçik qalereya
//   · böyük sitat tipoqrafiyası (`text-h3`) — lentdə `text-body`
//   · növ TONU kartın FONUDUR (`ku-soft` / `ku-blue` / `ku-cream`), lentdə isə
//     yalnız kiçik rozet var
//   · reaksiya / şərh zolağı YOXDUR — bu, söhbət deyil, xatirədir
//   · masonry-yə bənzər iki sütunlu axın (`columns`), lentdə tək sütun
//
// ⚠️ TON YALNIZ FONDUR: üzərində həmişə `text-text-primary` gəlir (KUDS
// kontrast cədvəli — bu üç ton mətn rəngi kimi işlədilmir).
//
// ⚠️ TƏLƏ T22: shadcn `CardTitle` <div> render edir, başlıq semantikası YOXDUR
// → kart başlığı ƏL İLƏ `<h3>` verilir.
// ============================================================================

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { EllipsisVertical, MapPin, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { guideCategoryLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { shortDate } from "@/utils/date";

import { deleteMemoryAction } from "./actions";
import { MEMORY_ICONS, memoryToneClass, memoryTypeMeta } from "./catalog";
import { MemoryComposer } from "./MemoryComposer";
import type { MemoryCardView, MemoryPlaceOption } from "./types";

interface MemoryCardProps {
  memory: MemoryCardView;
  cohortId: string;
  cohortSlug: string;
  /** Redaktə formasının məkan seçimi — siyahı serverdən gəlir. */
  places: MemoryPlaceOption[];
}

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function MemoryCard({ memory, cohortId, cohortSlug, places }: MemoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const meta = memoryTypeMeta(memory.type);
  const Icon = MEMORY_ICONS[meta.icon];
  const authorName = `${memory.author.firstName} ${memory.author.lastName}`;

  function remove() {
    startTransition(async () => {
      const result = await deleteMemoryAction({ memoryId: memory.id }, cohortSlug);
      if (!result.ok) {
        toast.error(result.message ?? "Xatirə silinmədi.");
        return;
      }
      toast.success(result.message ?? "Xatirə silindi.");
    });
  }

  if (isEditing) {
    return (
      // Redaktə formu kartın YERİNDƏ açılır — sütun axınında sıçrayış olmasın.
      <div className="mb-6 break-inside-avoid">
        <MemoryComposer
          cohortId={cohortId}
          cohortSlug={cohortSlug}
          places={places}
          draft={memory}
          onDone={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    // `break-inside-avoid` — həm `columns` düzülüşü, həm də ÇAP üçün: kart
    // sütunlar və səhifələr arasında bölünməməlidir.
    <article
      id={`memory-${memory.id}`}
      className={cn(
        "mb-6 flex break-inside-avoid flex-col gap-4 overflow-hidden rounded-card border border-border",
        "shadow-sm-kuds print:shadow-none",
        memoryToneClass(memory.type),
      )}
    >
      {memory.imageUrl ? (
        <div className="relative aspect-[3/2] w-full">
          <Image
            src={memory.imageUrl}
            alt=""
            fill
            sizes="(min-width: 768px) 520px, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-text-primary/20 bg-surface/70 text-caption font-normal text-text-primary"
          >
            <Icon className="h-3 w-3" aria-hidden />
            {meta.label}
          </Badge>

          <div className="flex items-center gap-2">
            <VisibilityBadge level={memory.visibility} />

            {memory.isOwner || memory.canModerate ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-surface/70 print:hidden"
                    aria-label="Xatirə əməliyyatları"
                  >
                    <EllipsisVertical className="h-4 w-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  {memory.isOwner ? (
                    <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4" aria-hidden />
                      Redaktə et
                    </DropdownMenuItem>
                  ) : null}

                  <DropdownMenuItem
                    disabled={isPending}
                    onSelect={() => remove()}
                    className="text-danger-strong focus:text-danger-strong"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    {memory.canModerate && !memory.isOwner ? "Moderasiya ilə sil" : "Sil"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        {/* T22: semantik başlıq — `CardTitle` <div>-dir, onu işlətmirik. */}
        <h3 className="text-h3 font-semibold leading-snug text-text-primary">
          {memory.title}
        </h3>

        {/* Böyük sitat tipoqrafiyası — lentdəki `text-body`-dən fərqli. */}
        <p className="whitespace-pre-line break-words text-body leading-relaxed text-text-primary">
          {memory.body}
        </p>

        {memory.dedicatedTo ? (
          <p className="text-small italic text-text-primary/80">
            — {memory.dedicatedTo}-a həsr olunub
          </p>
        ) : null}

        {memory.guidePlace ? (
          <p className="flex items-center gap-2 text-small text-text-primary/80">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            {memory.guidePlace.title}
            <span className="text-caption text-text-primary/60">
              · {guideCategoryLabel(memory.guidePlace.category)}
            </span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-text-primary/10 pt-4">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={memory.author.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="bg-surface text-caption text-text-primary">
              {initialsOf(memory.author.firstName, memory.author.lastName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col">
            <Link
              href={`/u/${memory.author.id}`}
              className="truncate text-small font-medium text-text-primary hover:underline"
            >
              {authorName}
            </Link>
            <time dateTime={memory.occurredAt} className="text-caption text-text-primary/70">
              {shortDate(memory.occurredAt)}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
}
