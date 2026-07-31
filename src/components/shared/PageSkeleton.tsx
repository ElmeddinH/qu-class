// ============================================================================
// src/components/shared/PageSkeleton.tsx
// Route QRUPU səviyyəsindəki `loading.tsx`-in ORTAQ görünüşü (Blok 12C · D bəndi).
//
// 🔴 NƏYİ HƏLL EDİR: layihədəki BÜTÜN səhifələr `force-dynamic`-dir (TƏLƏ T5 —
// nəticə viewer-dən asılıdır). Yəni hər naviqasiyada server sorğusu gedir və
// `loading.tsx` OLMAYANDA Next brauzeri KÖHNƏ səhifədə saxlayır: klik edirsən,
// heç nə dəyişmir, sonra birdən yeni səhifə görünür. İstifadəçi üçün bu,
// «düymə işləmədi» kimi oxunur.
//
// `loading.tsx` həmin boşluğu skeleton ilə doldurur — CLAUDE.md-nin «boş ekran
// buraxma» qaydası naviqasiya ANINA da aiddir, təkcə siyahının içinə yox.
//
// ⚠️ SKELETON REAL SƏHİFƏNİN FORMASINI TƏQLİD EDİR (başlıq → təsvir → kart
// şəbəkəsi). Ölçüsüz boz düzbucaqlı göstərmək sıçrayış yaradır: məzmun gələndə
// hündürlük dəyişir və Lighthouse bunu CLS kimi ölçür.
//
// ⚠️ `aria-hidden` + `role="status"`: ekran oxuyucu boz qutuları OXUMUR,
// yalnız «yüklənir» mesajını eşidir.
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  /** Neçə kart yeri saxlanılsın — qrupdan qrupa dəyişir. */
  cards?: number;
  /** Ekran oxuyucuya oxunan mətn. */
  label?: string;
}

export function PageSkeleton({ cards = 6, label = "Səhifə yüklənir" }: PageSkeletonProps) {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>

      <div className="flex flex-col gap-3" aria-hidden>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-12 w-12 rounded-avatar" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
