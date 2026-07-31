// ============================================================================
// src/features/accessibility/AccessibilityScreen.tsx
// `/accessibility` — KUDS §21 / WCAG 2.2 uyğunluq bəyanatı + maneə forması.
//
// 🔴 BƏYANAT ANONİMƏ TAM AÇIQDIR, FORMA İSƏ GİRİŞ TƏLƏB EDİR.
// `Report.reporterId` sxemdə məcburidir (səbəb və alternativlərin müqayisəsi
// `features/accessibility/actions.ts` başlığındadır). Anonim ziyarətçi formanın
// yerinə giriş çağırışını VƏ e-poçt kanalını görür — yəni "əlaqə yolu olsun"
// tələbi girişsiz də ödənilir.
//
// ⚠️ BƏYANAT DÜRÜST OLMALIDIR: aşağıdakı "bilinən məhdudiyyətlər" bölməsi
// layihənin ƏSL vəziyyətini yazır. Saxta "tam uyğun" bəyanatı WCAG-ın özündən
// daha böyük problemdir — auditdə ilk yoxlanan yerdir.
//
// ⚠️ SİYAHI BLOKLA BİRLİKDƏ YENİLƏNİR. Blok 12B-də iki maddə BAĞLANDI
// (xəritə zoom/pan, donut kontrastı) və siyahıdan çıxarıldı — düzəldilmiş
// boşluğu "bilinən məhdudiyyət" kimi saxlamaq da yalan bəyanatdır.
// ============================================================================

import Link from "next/link";
import { Mail } from "lucide-react";

import { PageHeader } from "@/features/content/PageHeader";
import { legalHref } from "@/lib/content-routes";

import { BarrierReportForm } from "./BarrierReportForm";

interface AccessibilityScreenProps {
  /** Giriş etmiş istifadəçi formanı görür (bax fayl başlığı). */
  isAuthenticated: boolean;
}

/** Bəyanatın strukturu — hər blok bir sual cavablandırır. */
const COMMITMENTS = [
  {
    title: "Klaviatura ilə tam idarəetmə",
    body: "Bütün interaktiv elementlər klaviatura ilə əlçatandır: menyular, akkordeonlar, filtr çipləri və xəritə markerləri. Fokus göstəricisi heç yerdə söndürülməyib və «əsas məzmuna keç» keçidi hər səhifənin ilk elementidir.",
  },
  {
    title: "Semantik quruluş",
    body: "Hər səhifədə bir <h1> var və başlıq səviyyələri atlanmır. Siyahılar <ul>/<ol>, cədvəllər <table>, bölmələr isə aria-labelledby ilə öz başlığına bağlanır.",
  },
  {
    title: "Rəng tək kanal deyil",
    body: "Oxunmamış bildiriş həm zolaq, həm «Yeni» yazısı ilə işarələnir; təcili bələdçi yazıları həm rəng, həm «Təcili» rozeti daşıyır; donut dilimlərində faiz etiketi, ad+say leqendası, hover/fokus vurğusu və cədvəl alternativi var. Bitişik dilimlərin parlaqlıq fərqi ən azı iki pillədir, yəni rəng korluğunda da ayırd edilir.",
  },
  {
    title: "Kontrast",
    body: "Mətn və fon cütləri ölçülüb: ağ mətn yalnız «-strong» tonları üzərində işlədilir (ku-green 5.18:1, danger-strong 6.47:1). Açıq fonlarda (ku-soft, ku-blue, ku-cream) yalnız tünd mətn var.",
  },
  {
    title: "Xəritə və qrafiklər alternativlə",
    body: "Hər vizualın altında eyni məlumatı verən cədvəl və ya siyahı var. Xəritə heç vaxt yeganə məlumat mənbəyi deyil. Yaxınlaşdırma siçan təkərindən başqa «+ / − / sıfırla» düymələri ilə də işləyir, yəni klaviatura ilə idarə olunur.",
  },
  {
    title: "Mətn ölçüsü və responsivlik",
    body: "Düzülüş 360px-dən 1536px-ə qədər yatay sürüşmə olmadan işləyir; ölçülər nisbi vahidlərdədir, yəni brauzer şrifti böyüdüləndə məzmun kəsilmir.",
  },
] as const;

/** Dürüstlük bölməsi — bilinən boşluqlar (bax fayl başlığı). */
const KNOWN_GAPS = [
  "Avtomatik audit (axe-core) və Lighthouse ölçmələri Blok 12-nin keyfiyyət keçidində planlaşdırılıb.",
  "Video məzmun hazırda yoxdur; əlavə olunarsa altyazı tələbi bu bəyanata yazılacaq.",
  "Parol sıfırlama axını qəsdən yoxdur (e-poçt xidməti qurulmayıb) — hesabı bərpa etmək üçün universitet administrasiyası ilə əlaqə saxlanılır.",
] as const;

export function AccessibilityScreen({ isAuthenticated }: AccessibilityScreenProps) {
  return (
    <div className="flex flex-col gap-8 py-8">
      <PageHeader
        eyebrow="Əlçatanlıq"
        title="Əlçatanlıq bəyanatı"
        description="QU CLASS interfeysi KUDS §21 və WCAG 2.2 AA səviyyəsini hədəfləyir. Aşağıda nəyi təmin etdiyimiz, nəyin hələ tamamlanmadığı və maneəni necə bildirəcəyiniz yazılıb."
        breadcrumbs={[
          { href: "/", label: "Ana səhifə" },
          { href: "/accessibility", label: "Əlçatanlıq" },
        ]}
      />

      <section aria-labelledby="commitments-heading" className="flex flex-col gap-4">
        <h2 id="commitments-heading" className="text-h2 font-semibold text-text-primary">
          Nəyi təmin edirik
        </h2>

        <ul className="grid gap-4 sm:grid-cols-2">
          {COMMITMENTS.map((item) => (
            <li
              key={item.title}
              className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
            >
              <h3 className="text-h4 font-medium text-text-primary">{item.title}</h3>
              <p className="text-small text-text-secondary">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="gaps-heading" className="flex flex-col gap-4">
        <h2 id="gaps-heading" className="text-h2 font-semibold text-text-primary">
          Bilinən məhdudiyyətlər
        </h2>
        <p className="text-body text-text-secondary">
          Uyğunluq davam edən işdir. Aşağıdakılar bizə məlumdur və üzərində
          işləyirik — siyahını gizlətmək auditdə tapılmaqdan pisdir.
        </p>
        <ul className="ml-4 flex list-disc flex-col gap-2 text-body text-text-secondary">
          {KNOWN_GAPS.map((gap) => (
            <li key={gap}>{gap}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="report-heading" className="flex flex-col gap-4">
        <h2 id="report-heading" className="text-h2 font-semibold text-text-primary">
          Maneə bildir
        </h2>
        <p className="text-body text-text-secondary">
          Bir səhifədən istifadə edə bilmədinizsə bunu bizə bildirin. Bildiriş
          moderasiya növbəsinə düşür və 10 iş günü ərzində baxılır.
        </p>

        {isAuthenticated ? (
          <BarrierReportForm />
        ) : (
          // 🔴 Anonim hal — səbəb fayl başlığındadır (sxemdə `reporterId`
          // məcburidir; nullable etmək `Report`-un bütün oxu tərəfini açardı).
          <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6">
            <p className="text-body text-text-primary">
              Formanı göndərmək üçün daxil olmaq lazımdır: bildiriş moderasiya
              növbəsində qeydə alınır və nəticəni sizə çatdıra bilməyimiz üçün
              müraciətin sahibi məlum olmalıdır.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login?callbackUrl=%2Faccessibility"
                className="rounded-btn bg-ku-green px-6 py-2 text-small font-medium text-white transition-colors hover:bg-ku-dark"
              >
                Daxil ol
              </Link>
              <Link
                href="/register"
                className="rounded-btn border border-ku-green px-6 py-2 text-small font-medium text-ku-green transition-colors hover:bg-ku-soft"
              >
                Qeydiyyat
              </Link>
            </div>

            <p className="flex items-center gap-2 text-small text-text-secondary">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              Hesab açmadan bildirmək istəyirsinizsə universitetin əlçatanlıq
              məsul şəxsinə yazın — əlaqə məlumatı{" "}
              <Link
                href={legalHref("equal-opportunity")}
                className="kuds-prose-link"
              >
                bərabər imkanlar bəyanatındadır
              </Link>
              .
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
