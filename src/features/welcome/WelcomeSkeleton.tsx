// ============================================================================
// src/features/welcome/WelcomeSkeleton.tsx
// Açılış səhifəsinin (`/`) yüklənmə skeletonu.
//
// 🔴 NİYƏ AYRICA FAYL — ÖLÇÜLMÜŞ REQRESSİYA, zövq məsələsi DEYİL.
// Blok 12D `(landing)/loading.tsx`-ə ümumi `PageSkeleton variant="cards"`
// qoymuşdu. O skeleton ~730px yer tutur, REAL açılış səhifəsi isə ~6400px:
// `PublicShell`-in `<footer>`-i axının içindədir və Suspense sərhədindən
// KƏNARDA qalır, yəni skeleton görünəndə footer 730px-də — 940px-lik
// ekranın DAXİLİNDƏ — dayanır, məzmun gələndə isə 5794px-ə tullanır.
//
// Ölçmə (`npm run audit:lighthouse`, desktop preset, `next start`):
//   ƏVVƏL:  `/` performance 88, CLS **0.223** (tək sıçrayış, node = `<footer>`)
//   SONRA:  `/` performance 100, CLS **0** (aşağıdakı «Ölçmə» qeydinə bax)
// 0.223 CLS-in «zəif» zolağıdır (>0.25 hədd, «yaxşı» ≤0.1) — bu, layihənin
// İLK göründüyü səhifədə ən pis göstərici idi.
//
// 🔴 DÜZƏLİŞİN MƏNTİQİ: `PageSkeleton`-un ÖZ müqaviləsi (fayl başlığı)
// «skeleton real səhifənin FORMASINI təqlid edir» deyir və `count` prop-unun
// sənədi «real səhifədəki İLK EKRAN sayına yaxın olmalıdır» tələb edir.
// Açılış səhifəsi kart şəbəkəsi DEYİL — hero + təkrarlanan bölmələrdir, ona
// görə düzgün cavab `count`-u böyütmək yox, FORMANI vermək idi.
// Eyni idiom Blok 12D-də `YearbookSkeleton` üçün işlədilib (albom başlığı
// ~220px kartdır, `PageSkeleton`-un 60px başlığı CLS verirdi).
//
// ⚠️ ÖLÇMƏ QEYDİ: skeleton real səhifə ilə PİKSEL-BƏRABƏR deyil (6400px boz
// qutu absurd olardı). Hədəf ondan kiçikdir və ÖLÇÜLƏ BİLƏNDİR: footer
// skeleton anında EKRANDAN KƏNARDA (>940px) başlasın. CLS yalnız viewport-da
// GÖRÜNƏN elementlərin sıçrayışını sayır — footer hər iki vəziyyətdə
// ekrandan kənardadırsa, sıçrayış istifadəçiyə görünmür və metrikaya düşmür.
// Qapı `tests/e2e/landing-cls.spec.ts`-dədir: rəqəm əl ilə deyil, testlə
// saxlanılır.
//
// ⚠️ SERVER komponentidir (`loading.tsx` qaydası): `"use client"` YOXDUR,
// data çəkilmir — sırf təqdimat.
// ============================================================================

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Bölmə skeletonu: `WelcomeSection`-un forması —
 * `<h2>` + təsvir sətri + kart sırası.
 */
function SectionBlock({ cards }: { cards: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {/* h-7 = `text-h2`-nin sətir hündürlüyü. */}
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-sm-kuds"
          >
            {/* Real kartlarda şəkil `aspect-[12/5]` qabdadır — eyni nisbət. */}
            <Skeleton className="aspect-[12/5] w-full rounded-none" />
            <div className="flex flex-col gap-3 p-6">
              <Skeleton className="h-5 w-24 rounded-badge" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WelcomeSkeleton() {
  return (
    <div
      className="flex flex-col gap-12"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Açılış səhifəsi yüklənir…</span>

      {/* Hero — real blok `p-6 sm:p-8 md:p-12` gradient kartdır. */}
      <div aria-hidden className="rounded-card border border-border bg-surface p-6 sm:p-8 md:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-[3fr_2fr]">
          <div className="flex flex-col items-start gap-6">
            <Skeleton className="h-7 w-40 rounded-badge" />
            <div className="flex w-full flex-col gap-3">
              <Skeleton className="h-10 w-full max-w-2xl" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 w-32 rounded-btn" />
              <Skeleton className="h-10 w-40 rounded-btn" />
            </div>
          </div>

          {/* `<dl>` — üç sayğac. */}
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-card" />
            ))}
          </div>
        </div>
      </div>

      {/* Real səhifədə doqquz bölmə var; skeleton ilk üçünü çəkir — footer-i
          ekrandan kənara itələmək üçün bu bəsdir (fayl başlığındaki «Ölçmə»). */}
      <div aria-hidden className="flex flex-col gap-12">
        <SectionBlock cards={3} />
        <SectionBlock cards={3} />
        <SectionBlock cards={3} />
      </div>
    </div>
  );
}
