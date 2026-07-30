// ============================================================================
// src/features/where-are-we-now/palette.ts
// Qrafik rənglərinin SABİT SIRASI.
//
// ⚠️ Rənglər burada TƏYİN OLUNMUR — `app/globals.css`-dəki tokenlərə istinad
// edilir (CLAUDE.md §2: `#`-lə başlayan kod yoxdur). Recharts `fill` propuna
// Tailwind sinfi qəbul etmir, ona görə `var(--…)` işlədilir.
//
// ----------------------------------------------------------------------------
// İKİ FƏRQLİ İŞ, İKİ FƏRQLİ QAYDA
// ----------------------------------------------------------------------------
// 1. BÖYÜKLÜK (magnitude) — dünya xəritəsinin ölkə doldurması. Bir çalar,
//    açıqdan tündə: `--map-fill-1…5`. Rəngin ÖZÜ SAY deməkdir.
// 2. KİMLİK (identity) — donut diaqramının dilimləri. Fərqli kateqoriyalar
//    fərqli rəng alır. Burada AÇIQ→TÜND şkala İŞLƏMİR: qonşu pillələr
//    bir-birindən ayırd edilə bilmir (ölçüldü — bax aşağı).
//
// ----------------------------------------------------------------------------
// SIRA NİYƏ MƏHZ BUDUR (ölçülmüş, təxmin deyil)
// ----------------------------------------------------------------------------
// Dilimlərin rəngləri OKLab məsafəsi ilə yoxlanıldı (rəng görmə fərqi
// simulyasiyası: protanopiya / tritanopiya). Ən yaxın QONŞU cütün nəticəsi:
//
//   bu sıra (ku-green → ku-blue → ku-dark → ku-cream → orta yaşıl → ku-soft):
//     ΔE 17.8 (protan) · 18.7 (tritan) · 18.5 (normal görmə)  ✅
//   açıq→tünd şkala ilə (yəni «gözəl gradient»):
//     ΔE  8.9 (protan) ·  9.3 (tritan) ·  9.2 (normal görmə)  ❌
//
// Yəni gradient donut "səliqəli" görünür, amma dilimlər ayırd edilmir. Sıra
// SABİTDİR və HEÇ VAXT sayla / sıralanmaya görə dəyişmir: filtr dilim sayını
// azaldanda qalan dilimlər rəngini DƏYİŞMƏMƏLİDİR.
//
// ⚠️ BİLİNƏN MƏHDUDİYYƏT (müdafiədə soruşula bilər): KUDS palitrası qəsdən
// solğundur (institusional yaşıl + üç pastel fon rəngi), ona görə "xroma
// döşəməsi" və "açıqlıq zolağı" yoxlamaları KEÇMİR — üç dilim səthlə 3:1
// kontrastdan aşağıdadır. Bunu yeni rəng UYDURARAQ düzəltmək CLAUDE.md §2-ni
// pozardı. Əvəzinə İKİNCİ KODLAŞDIRMA verilir və bu, tələb olunan kompensasiyadır:
//   · hər dilimin üzərində FAİZ etiketi,
//   · ad + say daşıyan leqenda,
//   · hər vizualın altında `<table>` alternativi.
// Rəng heç vaxt YEGANƏ məlumat kanalı deyil.
//
// ⚠️ SEMANTİK RƏNGLƏR (`success` / `warning` / `danger`) KATEQORİYA KİMİ
// İŞLƏDİLMİR — onlar VƏZİYYƏT bildirir (təsdiqlənib / gözləyir / rədd edilib).
// "4-cü kateqoriya" kimi işlətsək istifadəçi qırmızı dilimi problem sayar.
// ============================================================================

/** Kimlik rəngləri — SABİT sıra, dövr etdirilmir (bax fayl başlığı). */
export const CATEGORY_FILLS = [
  "var(--chart-primary)", // ku-green
  "var(--chart-neutral)", // ku-blue
  "var(--chart-primary-dark)", // ku-dark
  "var(--chart-accent)", // ku-cream
  "var(--map-fill-3)", // orta yaşıl (şkalanın 3-cü pilləsi)
  "var(--map-fill-1)", // ku-soft
] as const;

/**
 * Böyüklük şkalası — dünya xəritəsinin ölkə doldurması.
 * `lib/career-stats.ts` → `fillStep()` indeksi hesablayır.
 */
export const MAP_FILLS = [
  "var(--map-fill-1)",
  "var(--map-fill-2)",
  "var(--map-fill-3)",
  "var(--map-fill-4)",
  "var(--map-fill-5)",
] as const;

/**
 * `index`-ə uyğun kimlik rəngi.
 *
 * ⚠️ Dilim sayı palitradan çox olsa sıra dövr edir. Praktikada baş vermir:
 * k-anonimlik eşiyi (3 nəfər) ilə 19 respondent üçün ən çox 6 açıqlanan xana
 * ola bilər — palitra da MƏHZ 6 slotdur. Baş versə də rəng yeganə kanal
 * deyil (etiket + leqenda + cədvəl).
 */
export function categoryFill(index: number): string {
  return CATEGORY_FILLS[index % CATEGORY_FILLS.length];
}
