// ============================================================================
// src/features/welcome/ClosingCta.tsx
// Bağlanış CTA-sı — səhifənin sonunda təkrar qeydiyyat çağırışı.
//
// ⚠️ Hero-daki düymə iyerarxiyası TƏRSİNƏ çevrilir: burada əsas əməliyyat
// QEYDİYYATdır (ziyarətçi bütün səhifəni oxuyub sona çatıb — artıq "bu nədir?"
// sualı yoxdur, "necə qoşulum?" sualı var). «Daxil ol» ikinci dərəcəli
// (`variant="outline"`, KUDS §11).
//
// ⚠️ Bölmə `WelcomeSection` qabığını İŞLƏTMİR: burada `<h2>` mərkəzləşdirilmiş
// və fon tünddür, ortaq qabığın sol düzləndirilmiş başlıq zolağı uyğun gəlmir.
// `aria-labelledby` bağlantısı isə eynidir.
// ============================================================================

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CLOSING_SECTION } from "./sections";

export function ClosingCta() {
  const headingId = `${CLOSING_SECTION.id}-heading`;

  return (
    <section
      id={CLOSING_SECTION.id}
      aria-labelledby={headingId}
      className="flex scroll-mt-24 flex-col items-center gap-6 rounded-card bg-ku-dark px-6 py-12 text-center sm:px-12"
    >
      <div className="flex flex-col gap-3">
        <h2 id={headingId} className="text-h2 font-semibold text-white">
          {CLOSING_SECTION.title}
        </h2>
        <p className="mx-auto max-w-2xl text-body text-white/90">
          {CLOSING_SECTION.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/register">
            Qeydiyyatdan keç
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>

        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <Link href="/login">Hesabım var</Link>
        </Button>
      </div>
    </section>
  );
}
