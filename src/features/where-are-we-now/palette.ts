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

// ---------------------------------------------------------------------------
// DONUT DİLİMLƏRİ — ardıcıl ku-green şkalası (Blok 12B)
// ---------------------------------------------------------------------------
//
// 🔴 NİYƏ AYRICA ŞKALA. `CATEGORY_FILLS` KİMLİK palitrasıdır (yaşıl, mavi,
// krem…) və ONU ölçmüşdük — ayırdedilmə yaxşıdır, amma dilimlər arasında
// SIRALAMA oxunmur və üç rəng səthlə 3:1-dən aşağı qalır. Donut isə hissə-bütöv
// münasibətini göstərir; ardıcıl (sequential) şkala payın böyüklüyünü rənglə də
// təkrarlayır və hamısı EYNİ çaların pillələri olduğu üçün rəng korluğunda
// ayırdedilmə YALNIZ parlaqlığa qalır — bu, ən etibarlı kanaldır.
//
// 🔴 ŞƏRT (Blok 12F-də DÜZƏLDİLDİ): yan-yana duran iki dilim arasında ƏN AZI
// **3:1 KONTRAST**. Əvvəlki qayda «ən azı 2 PİLLƏ fərq» idi və bu, SƏHV ölçü
// vahidi seçmişdi: pillə sayı kontrast demək deyil. Ölçdük —
//
//   köhnə növbələşdirmə (4 dilim, pillələr 1·6·4·9):
//     `--slice-6` ↔ `--slice-4` = **1.73:1** ❌ (2 pillə fərq VAR, kontrast YOX)
//   yeni sıra (4 dilim, pillələr 1·8·2·9):
//     ən pis qonşu cüt = **5.05:1** ✅
//
// Yəni köhnə test yaşıl idi, amma qayda pozulurdu. İndi test PİLLƏ deyil,
// WCAG nisbi parlaqlıq düsturu ilə hesablanmış KONTRAST ölçür və hexləri
// `globals.css`-dən oxuyur (token dəyişsə test qırmızıya düşür).
//
// 🔴 SIRALAR BRUTE-FORCE İLƏ SEÇİLİB: hər `count` üçün 9 pillədən bütün
// yerləşdirmələr yoxlanıldı və QAPALI halqada ən pis qonşu cütü MAKSİMUM edən
// variant götürüldü. Nəticələr `docs/quality-report-12c.md` §6-dadır.
//
// 🔴 TƏK SAYDA DİLİM ÜÇÜN 3:1 RİYAZİ OLARAQ MÜMKÜN DEYİL — və bu, palitranın
// deyil, HƏNDƏSƏNİN nəticəsidir. İki rəngin kontrastı onların ağ ilə
// kontrastlarının nisbətidir; şkalanın diapazonu 11.18/1.31 = **8.53** < 9,
// yəni «bir-birinə qarşı 3:1» olan ÜÇ ton yoxdur (üçü olsaydı ən uc iki ton
// arasında ≥ 3×3 = 9 lazım gələrdi). Qonşuluq qrafi bu səbəbdən İKİHİSSƏLİDİR
// (bipartite) və ikihissəli qrafda TƏK uzunluqlu dövr yoxdur. Ona görə:
//
//   2 dilim → 8.55:1 ✅   ·   3 dilim → 2.54:1 ❌ (mümkün olan ən yaxşısı)
//   4 dilim → 5.05:1 ✅   ·   5 dilim → 2.54:1 ❌
//   6 dilim → 3.67:1 ✅   ·   7+ dilim → ≤ 2.73:1 ❌
//
// ⚠️ ONA GÖRƏ DİLİM SAYI 6-YA MƏHDUDLAŞDIRILIR (`MAX_DONUT_SLICES`) və qalan
// kateqoriyalar «Digər»ə yığılır — bax `IndustriesChart.tsx`. Cüt saylarda
// (2·4·6) qayda ödənilir; 3 və 5 dilim halında ödənilmir və bu, sənəddə
// AÇIQ yazılır. Həmin iki halda ayırdedilmə dilimlər arasındakı `paddingAngle`
// boşluğu + səth rəngli konturla (`--map-stroke`, 2px) verilir: sərhəd rəng
// kontrastından ASILI DEYİL. Rəng onsuz da heç vaxt yeganə kanal deyil
// (faiz etiketi + leqenda + `<table>`).
//
// ⚠️ Rənglər `app/globals.css`-dədir (`--slice-1…9`); burada yalnız istinad var
// (CLAUDE.md §2 — hardcode hex yoxdur).

/** Şkalanın pillə sayı — `--slice-1` … `--slice-9`. */
export const SLICE_RAMP_SIZE = 9;

/** Dilim rəngləri, ƏN AÇIQdan ƏN TÜNDə. Sıra parlaqlıq sırasıdır. */
export const SLICE_RAMP = Array.from(
  { length: SLICE_RAMP_SIZE },
  (_, step) => `var(--slice-${step + 1})`,
) as readonly string[];

/**
 * Donut-da göstərilən ƏN ÇOX dilim sayı. Bundan artıq kateqoriya varsa ən
 * kiçikləri «Digər»ə yığılır (`IndustriesChart.tsx`).
 *
 * 🔴 6 rəqəmi ESTETİK DEYİL, ÖLÇÜLMÜŞ HÜDUDDUR: 6 dilimdə ən pis qonşu cüt
 * 3.67:1-dir (✅), 7 dilimdə isə 2.54:1-ə düşür (❌) və şkalanın diapazonu
 * bunu düzəltməyə imkan vermir (bax fayl başlığı).
 */
export const MAX_DONUT_SLICES = 6;

/**
 * QAPALI HALQADA ən pis qonşu kontrastı MAKSİMUM edən pillə sıraları.
 * İndeks = dilim sayı, dəyər = `--slice-N` pillələri (0 bazalı).
 *
 * Brute-force ilə seçilib (bütün yerləşdirmələr yoxlanılıb); yanındakı rəqəm
 * həmin sıranın ən pis qonşu cütüdür. Cədvəl SABİTDİR — filtr dilim sayını
 * dəyişəndə rənglər yenidən paylanır, amma EYNİ `count` üçün nəticə həmişə
 * eynidir (təsadüfilik yoxdur).
 */
const SLICE_RINGS: readonly (readonly number[])[] = [
  [], //                        0 dilim — boş
  [8], //                       1 → ən tünd ton
  [0, 8], //                    2 → 8.55:1 ✅
  [0, 5, 8], //                 3 → 2.54:1 (mümkün olan ən yaxşısı)
  [0, 7, 1, 8], //              4 → 5.05:1 ✅
  [0, 5, 8, 1, 6], //           5 → 2.54:1 (mümkün olan ən yaxşısı)
  [0, 6, 1, 7, 2, 8], //        6 → 3.67:1 ✅
  [0, 5, 8, 1, 6, 2, 7], //     7 → 2.54:1  ⚠️ `MAX_DONUT_SLICES`-dən yuxarı
  [0, 5, 1, 6, 2, 7, 3, 8], //  8 → 2.73:1  ⚠️ yalnız ehtiyat
  [0, 4, 8, 3, 7, 2, 6, 1, 5], // 9 → 2.53:1 ⚠️ yalnız ehtiyat
];

/**
 * `index`-ci dilim üçün şkala PİLLƏSİ (0 = ən açıq, 8 = ən tünd).
 *
 * Tək dilim halında şkalanın ƏN TÜND ucu verilir: tək pay «az» kimi
 * oxunmamalıdır (ən açıq ton məhz onu deyərdi).
 *
 * ⚠️ `count` şkaladan böyük olsa (praktikada baş vermir — çağıran tərəf
 * `MAX_DONUT_SLICES` ilə kəsir) sıra dövr edir: nəticə yenə DETERMİNİKDİR,
 * sadəcə qonşu kontrastı zəmanətli deyil.
 */
export function sliceRampIndex(index: number, count: number): number {
  if (count <= 1) return SLICE_RAMP_SIZE - 1;

  const ring = SLICE_RINGS[count];
  if (ring) return ring[index % count];

  // Ehtiyat yol — şkaladan çox dilim: pillələr sadəcə dövr edir.
  return index % SLICE_RAMP_SIZE;
}

/** `index`-ci dilimin rəngi — `sliceRampIndex()`-in token qarşılığı. */
export function sliceFill(index: number, count: number): string {
  return SLICE_RAMP[sliceRampIndex(index, count)];
}
