// ============================================================================
// src/features/welcome/WelcomeHero.tsx
// Hero bölməsi — səhifənin YEGANƏ `<h1>`-i.
//
// ⚠️ KUDS §11: «Qeydiyyat» ikinci dərəcəli əməliyyatdır → `variant="outline"`.
// `variant="secondary"` İŞLƏTMƏ — shadcn onu FILLED render edir və iki dolu
// düymə yan-yana iyerarxiyanı itirir.
//
// ⚠️ Fonun rəngi TOKEN-dəndir (`bg-ku-dark`, `from-ku-dark`, `to-ku-green`) —
// hardcode hex YOXDUR (CLAUDE.md §2). Tünd fon üzərində ağ mətn: ağ / `ku-green`
// kontrastı 5.18:1, `ku-dark` daha da tünddür → WCAG AA keçir.
//
// ⚠️ Mobil (0-767) TƏK sütun: `grid-cols-1` default, `lg:grid-cols-[3fr_2fr]`
// yalnız laptopdan. Rəqəm kartları mobildə mətnin ALTINA düşür.
// ============================================================================

import Link from "next/link";
import { ArrowRight, GraduationCap, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StructureCounts } from "@/services/academic.service";

interface WelcomeHeroProps {
  counts: StructureCounts;
}

export function WelcomeHero({ counts }: WelcomeHeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="overflow-hidden rounded-card bg-gradient-to-br from-ku-dark to-ku-green p-6 sm:p-8 md:p-12"
    >
      <div className="grid items-center gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="flex min-w-0 flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-badge bg-ku-soft px-3 py-1 text-caption font-medium text-ku-dark">
            <GraduationCap className="h-4 w-4" aria-hidden />
            Qarabağ Universiteti
          </span>

          <div className="flex flex-col gap-3">
            <h1
              id="hero-heading"
              className="text-h1 font-bold text-white md:text-display"
            >
              Sinfin bir yerdə: tələbəlikdən məzunluğa
            </h1>

            <p className="max-w-2xl text-body text-white/90">
              QU CLASS — Qarabağ Universitetinin tələbə və məzun sinif
              platforması. Yeni qəbul olunanların tanışlığından məzuniyyətdən
              sonrakı əlaqəyə qədər hər şey EYNİ səhifədə:{" "}
              <strong className="font-semibold text-white">
                Incoming → Student → Alumni
              </strong>
              . Sinif səhifəsi heç vaxt bağlanmır.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden />
                Daxil ol
              </Link>
            </Button>

            {/* KUDS §11: Secondary = outline. Tünd fonda ağ sərhəd + ağ mətn. */}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/register">
                Qeydiyyat
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>

        {/* Struktur rəqəmləri — hero-nun sağ sütunu.
            ⚠️ ÜZV SAYI YOXDUR (aqreqasiya qaydası, `getStructureCounts` şərhi). */}
        <dl className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <HeroStat value={counts.faculties} label="fakültə" />
          <HeroStat value={counts.programs} label="ixtisas" />
          <HeroStat value={counts.cohorts} label="sinif səhifəsi" />
        </dl>
      </div>
    </section>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-white/10 p-4">
      <dt className="order-2 text-caption text-white/80 sm:text-small">{label}</dt>
      <dd className="order-1 text-h2 font-bold text-white">{value}</dd>
    </div>
  );
}
