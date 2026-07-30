// ============================================================================
// src/features/welcome/CommunityStories.tsx
// «İcmamızdan hekayələr» — 2 PUBLIC xatirə, şəkilli kart (GW analizi #12).
//
// 🔴 ANONİM VIEWER İLƏ ÇƏKİLİR. `listMemories(ANONYMOUS, …)` →
// `visibleMemoryWhere` yalnız `visibility = PUBLIC` və `status != DELETED`
// seçir. Səhifədə ƏLAVƏ FİLTR YOXDUR (CLAUDE.md §5) — `CLASS` xatirə burada
// görünə bilmir və bunu `public.spec.ts` seed başlığı ilə yoxlayır.
//
// ⚠️ BOŞ GƏLƏRSƏ BÖLMƏ GİZLƏNİR (`null` qaytarır). Bu, «Qarşıdan gələn
// tədbirlər» bölməsindən FƏRQLİDİR: ora naviqasiya anchor-unun HƏDƏFİ idi və
// gizlətmək linki heç yerə aparardı. Bu bölməyə isə heç bir link yoxdur —
// EmptyState göstərmək «icmamızda hekayə yoxdur» kimi oxunardı və açılış
// səhifəsində bu, zərərli mesajdır.
//
// ⚠️ MÜƏLLİF ADI GÖSTƏRİLİR və bu, sızma DEYİL: xatirənin özü `PUBLIC`-dir,
// yəni müəllif onu ictimai paylaşmağı SEÇİB. Profil linki VERİLMİR — `/u/[id]`
// auth arxasındadır və anonim ziyarətçini `/login`-ə atardı.
// ============================================================================

import Image from "next/image";
import { Quote } from "lucide-react";

import { memoryTypeLabel } from "@/lib/labels";
import type { MemoryItem } from "@/services/memory.service";
import { shortDate } from "@/utils/date";

interface CommunityStoriesProps {
  memories: MemoryItem[];
}

export function CommunityStories({ memories }: CommunityStoriesProps) {
  if (memories.length === 0) return null;

  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {memories.map((memory) => (
        <li
          key={memory.id}
          className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm-kuds"
        >
          {memory.imageUrl ? (
            <div className="relative aspect-[12/5] w-full bg-muted">
              <Image
                src={memory.imageUrl}
                alt={memory.title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          ) : null}

          <div className="flex flex-1 flex-col gap-3 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-badge bg-ku-soft px-3 py-1 text-caption text-ku-dark">
                {memoryTypeLabel(memory.type)}
              </span>
              <time
                dateTime={memory.occurredAt.toISOString()}
                className="text-caption text-text-secondary"
              >
                {shortDate(memory.occurredAt)}
              </time>
            </div>

            <h3 className="flex items-start gap-2 text-h4 font-medium text-text-primary">
              <Quote className="mt-1 h-4 w-4 shrink-0 text-ku-green" aria-hidden />
              {memory.title}
            </h3>

            <p className="line-clamp-4 whitespace-pre-line text-small text-text-secondary">
              {memory.body}
            </p>

            <p className="mt-auto text-caption text-text-secondary">
              {memory.author.firstName} {memory.author.lastName} ·{" "}
              {memory.cohort.displayName}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
