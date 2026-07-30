import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LANDING_SECTIONS } from "@/layouts/nav";

// TODO(Blok 11 · M1): Bu, müvəqqəti PLACEHOLDER-dir — əsl Public Welcome Page
// (spec §2, 10 bölmə) Blok 11-də `src/features/welcome/` altında qurulacaq və
// bu fayl yalnız həmin komponenti render edəcək.
// Karkas (PublicShell) artıq `(public)/layout.tsx`-dən gəlir.
//
// 🔴 BÖLMƏ `id`-LƏRİ TƏSADÜFİ DEYİL. Naviqasiyadakı hələ mövcud olmayan
// səhifələr (`/about`, `/faculties`, `/events`…) məhz bu bölmələrin
// anchor-larına yönəldilib. Siyahı `layouts/nav.ts` → `LANDING_SECTIONS`-də
// TƏK mənbədir və bu səhifə onun üzərində dövr edir: `id` dəyişsə həm link,
// həm bölmə eyni anda dəyişir, yəni link səssizcə "heç yerə" apara bilmir.
export default function WelcomePage() {
  return (
    <div className="flex flex-col gap-16 py-16">
      {/* --- Hero --- */}
      <section className="flex flex-col items-start gap-6">
        <span className="rounded-badge bg-ku-soft px-3 py-1 text-caption text-ku-dark">
          Holberton final layihəsi
        </span>

        <h1 className="max-w-2xl text-display font-bold text-text-primary">
          Sinif heç vaxt bağlanmır
        </h1>

        <p className="max-w-2xl text-body text-text-secondary">
          QU CLASS — Qarabağ Universitetinin tələbə və məzun sinif platforması.
          Yeni qəbul olunanların tanışlığından məzuniyyətdən sonrakı əlaqəyə qədər
          hər şey eyni səhifədə: <strong>Incoming → Student → Alumni</strong>.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/register">
              Qeydiyyatdan keç
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          {/* KUDS §11: Secondary = outline */}
          <Button variant="outline" asChild>
            <Link href="/login">
              <LogIn className="h-4 w-4" aria-hidden />
              Daxil ol
            </Link>
          </Button>
        </div>
      </section>

      {/* --- Naviqasiyanın hədəf bölmələri --- */}
      {LANDING_SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          // `scroll-mt-24` — yapışqan header (72px) bölmənin başlığını örtməsin.
          className="flex scroll-mt-24 flex-col gap-3 border-t border-border pt-8"
          aria-labelledby={`${section.id}-heading`}
        >
          <h2
            id={`${section.id}-heading`}
            className="text-h2 font-semibold text-text-primary"
          >
            {section.title}
          </h2>

          <p className="max-w-2xl text-body text-text-secondary">
            {section.description}
          </p>

          <p className="text-small text-text-secondary">
            Bu bölmə hazırlanır — tam məzmun Blok 11-də universitetin rəsmi
            məlumatları ilə doldurulacaq.
          </p>
        </section>
      ))}
    </div>
  );
}
