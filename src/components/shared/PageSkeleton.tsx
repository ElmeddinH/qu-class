// ============================================================================
// src/components/shared/PageSkeleton.tsx
// Yüklənmə skeletonlarının VAHİD ailəsi — həm route seqmentindəki
// `loading.tsx`, həm də səhifə DAXİLİ `<Suspense fallback>` üçün (Blok 12D).
//
// 🔴 NƏYİ HƏLL EDİR: layihədəki demək olar bütün səhifələr `force-dynamic`-dir
// (TƏLƏ T5 — nəticə viewer-dən asılıdır). Yəni hər naviqasiyada server sorğusu
// gedir və skeleton OLMAYANDA Next brauzeri KÖHNƏ səhifədə saxlayır: klik
// edirsən, heç nə dəyişmir, sonra birdən yeni səhifə görünür. İstifadəçi üçün
// bu, «düymə işləmədi» kimi oxunur.
//
// ⚠️ SKELETON REAL SƏHİFƏNİN FORMASINI TƏQLİD EDİR. Ölçüsüz boz düzbucaqlı
// göstərmək sıçrayış yaradır: məzmun gələndə hündürlük dəyişir və Lighthouse
// bunu CLS kimi ölçür. Ona görə `variant` var — kart şəbəkəsi, sətir siyahısı,
// cədvəl, məqalə və forma bir-birinə heç bənzəmir və eyni boz qutu ÜÇÜNÜ DƏ
// səhv göstərir.
//
// 🔴 İKİ İSTİFADƏ YERİ, İKİ FƏRQLİ A11Y REJİMİ (`announce`):
//
//   · `loading.tsx` (bütün seqment əvəzlənir) → `announce` AÇIQ:
//     `role="status"` + `aria-live="polite"` və `sr-only` mətn. Ekran oxuyucu
//     «… yüklənir» eşidir, boz qutuları oxumur.
//
//   · səhifə daxili `<Suspense fallback>` (başlıq ARTIQ render olunub) →
//     `announce={false}`: yalnız `aria-busy="true"`. Səbəb: bir səhifədə
//     ÇOXLU canlı bölgə ekran oxuyucuda səs-küy yaradır — istifadəçi artıq
//     `<h1>`-i eşidib, ona lazım olan «bu hissə hələ gəlir» siqnalıdır,
//     üçüncü dəfə «yüklənir» elanı yox.
//
// ⚠️ `loading.tsx` SERVER komponentidir: `"use client"` YAZMA, data ÇƏKMƏ.
// Bu fayl da o qaydaya tabedir — sırf təqdimatdır.
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Skeletonun forması — REAL səhifənin düzülüşünə görə seçilir.
 *
 * | variant   | hansı səhifələr                                        |
 * | --------- | ------------------------------------------------------ |
 * | `cards`   | kart şəbəkəsi: kataloq, tədbir siyahısı, admin paneli   |
 * | `list`    | tam enli sətirlər: lent, bildiriş, moderasiya növbəsi   |
 * | `table`   | alət zolağı + cədvəl sətirləri: admin istifadəçi/audit  |
 * | `rows`    | `table` + avatar sütunu YOX: FAQ akkordeonu, filtr sətri |
 * | `article` | uzun mətn: redaksiya səhifələri, hüquqi sənədlər        |
 * | `form`    | etiket + sahə cütlükləri: qeydiyyat, profil, məxfilik   |
 */
export type PageSkeletonVariant = "cards" | "list" | "table" | "rows" | "article" | "form";

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  /**
   * Neçə element yeri saxlanılsın (kart / sətir / cədvəl sətri / sahə).
   * REAL səhifədəki İLK EKRAN sayına yaxın olmalıdır — 1 sətir skeleton +
   * 12 kart məzmun gözlə görünən sıçrayışdır.
   */
  count?: number;
  /**
   * Başlıq bloku (h1 + təsvir) çəkilsinmi.
   *
   * 🔴 `false` VER, əgər skeleton səhifə daxili `<Suspense>`-dədir və başlıq
   * ARTIQ real mətnlə render olunub. Əks halda ekranda iki başlıq görünür:
   * biri əsl, biri boz — və məzmun gələndə boz olan itib sıçrayış yaradır.
   */
  header?: boolean;
  /** Ekran oxuyucuya oxunan mətn (yalnız `announce` açıq olanda). */
  label?: string;
  /** Canlı bölgə elanı — fayl başlığındakı iki rejimə bax. */
  announce?: boolean;
  className?: string;
}

export function PageSkeleton({
  variant = "cards",
  count,
  header = true,
  label = "Səhifə yüklənir",
  announce = true,
  className,
}: PageSkeletonProps) {
  const items = count ?? DEFAULT_COUNT[variant];

  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      // İki rejim — fayl başlığındakı izaha bax.
      {...(announce
        ? { role: "status" as const, "aria-live": "polite" as const }
        : { "aria-busy": true })}
    >
      {announce ? <span className="sr-only">{label}…</span> : null}

      {header ? <HeaderBlock /> : null}

      {variant === "cards" ? <CardsBlock count={items} /> : null}
      {variant === "list" ? <ListBlock count={items} /> : null}
      {variant === "table" ? <TableBlock count={items} avatar /> : null}
      {variant === "rows" ? <TableBlock count={items} /> : null}
      {variant === "article" ? <ArticleBlock count={items} /> : null}
      {variant === "form" ? <FormBlock count={items} /> : null}
    </div>
  );
}

/**
 * Variant üzrə default say — REAL səhifələrdən götürülüb, təxmin deyil:
 * kataloqlar üç sütunlu qriddə iki sıra göstərir (6), lent ilk ekranda dörd
 * yazı, cədvəl səhifələməyə qədər səkkiz sətir, məqalə beş paraqraf, forma
 * altı sahə.
 */
const DEFAULT_COUNT: Record<PageSkeletonVariant, number> = {
  cards: 6,
  list: 4,
  table: 8,
  rows: 8,
  article: 5,
  form: 6,
};

function HeaderBlock() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {/* h-8 = `text-h1`-in sətir hündürlüyü; w-64 orta başlıq uzunluğu. */}
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
    </div>
  );
}

function CardsBlock({ count }: { count: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
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
  );
}

/**
 * Tam enli sətirlər — lent yazısı, bildiriş, moderasiya kartı.
 * ⚠️ Kart qridindən FƏRQLİ hündürlükdədir: sətirdə avatar + iki sətir mətn +
 * hərəkət zolağı var, yəni ~160px. `cards` variantı ilə əvəzləmək CLS verir.
 */
function ListBlock({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-avatar" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-20 rounded-badge" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      ))}
    </div>
  );
}

/**
 * Alət zolağı (axtarış + filtr) + sərhədli sətirlər.
 *
 * `avatar` — cədvəldə şəxs sütunu var (istifadəçi, audit aktoru); FAQ
 * akkordeonunda isə yoxdur və dairə orada yalançı element kimi görünür.
 */
function TableBlock({ count, avatar = false }: { count: number; avatar?: boolean }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-full max-w-xs" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-sm-kuds">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-border px-6 py-4 last:border-b-0"
          >
            {avatar ? <Skeleton className="h-8 w-8 rounded-avatar" /> : null}
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-32 sm:block" />
            <Skeleton className="hidden h-5 w-20 rounded-badge md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Uzun mətn — redaksiya səhifəsi. Paraqraf blokları arasında BAŞLIQ da var;
 * yalnız eyni enli sətirlər çəkmək real mətnin ritmini vermir və məzmun
 * gələndə hündürlük gözlə görünən qədər dəyişir.
 */
function ArticleBlock({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 shadow-sm-kuds sm:p-8" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3">
          {index % 2 === 0 ? <Skeleton className="h-5 w-2/5" /> : null}
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/** Etiket + sahə cütlükləri, sonda əməliyyat düyməsi. */
function FormBlock({ count }: { count: number }) {
  return (
    <div
      className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          {/* h-9 — shadcn `Input`/`Button` primitivlərinin real hündürlüyü. */}
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-40" />
    </div>
  );
}
