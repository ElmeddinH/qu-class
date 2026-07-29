"use client";

// ============================================================================
// src/features/feed/MediaGallery.tsx
// Lent kartının şəkil qalereyası + lightbox.
//
// `next/image` işlədilir: yüklənən fayllar `public/uploads/` altındadır (yerli
// yol, `remotePatterns` tələb etmir), seed məzmunu isə `picsum.photos`-dandır
// və o, `next.config.ts`-də icazəlidir.
// ============================================================================

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { FeedMedia } from "@/services/post.service";

interface MediaGalleryProps {
  media: FeedMedia[];
  /** Ekran oxuyucu üçün kontekst — "Aynur Məmmədovanın paylaşımı". */
  label: string;
}

export function MediaGallery({ media, label }: MediaGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  const active = openIndex === null ? null : media[openIndex];

  function step(delta: number) {
    setOpenIndex((current) => {
      if (current === null) return null;
      return (current + delta + media.length) % media.length;
    });
  }

  return (
    <>
      <ul
        className={cn(
          "grid gap-2",
          media.length === 1 ? "grid-cols-1" : "grid-cols-2",
          media.length >= 5 && "sm:grid-cols-3",
        )}
      >
        {media.map((asset, index) => (
          <li key={asset.id} className={cn(media.length === 3 && index === 0 && "col-span-2")}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className={cn(
                "relative block w-full overflow-hidden rounded-card border border-border bg-background",
                // Tək şəkil geniş ekranda kartı divara çevirir — hündürlük
                // `max-h` ilə kəsilir, nisbət isə saxlanılır.
                media.length === 1 ? "aspect-[16/10] max-h-[420px]" : "aspect-square",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <Image
                src={asset.thumbUrl || asset.url}
                alt={asset.caption ?? `${label} — ${index + 1}. şəkil`}
                fill
                sizes="(max-width: 768px) 50vw, 320px"
                className="object-cover transition-transform duration-200 hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setOpenIndex(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="text-h4">{label}</DialogTitle>
          <DialogDescription>
            {openIndex !== null ? `${openIndex + 1} / ${media.length}` : ""}
            {active?.caption ? ` · ${active.caption}` : ""}
          </DialogDescription>

          {active ? (
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card bg-background">
              <Image
                src={active.url}
                alt={active.caption ?? label}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-contain"
              />
            </div>
          ) : null}

          {media.length > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => step(-1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Əvvəlki
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => step(1)}>
                Növbəti
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
