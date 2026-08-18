// ============================================================================
// src/features/where-are-we-now/donut-slices.ts
// Donut dilimlərinin YIĞILMASI — Recharts-SIZ, saf modul (vahid testdə işləyir).
// Blok 12F — donut dilimlərinin «Digər»ə yığılması (kontrast hüdudu).
//
// 🔴 NİYƏ LAZIMDIR: `palette.ts` ölçdü ki, qapalı halqada qonşu dilimlər
// arasında 3:1 kontrast YALNIZ 6 dilimə qədər mümkündür (7 dilimdə ən yaxşı
// hal 2.54:1-ə düşür və şkalanın diapazonu bunu düzəltməyə imkan vermir).
// Ona görə dilim sayı `MAX_DONUT_SLICES` ilə kəsilir və ən kiçik kateqoriyalar
// «Digər»ə yığılır.
//
// ⚠️ BU, k-ANONİMLİK SUPRESSİYASI DEYİL — iki fərqli mexanizm eyni sözə
// («Digər») bənzəyir, amma ayrı-ayrı işləyir və qarışdırılmamalıdır:
//
//   · k-anonimlik (`lib/career-stats.ts` → `MIN_BUCKET_SIZE = 3`): 3 nəfərdən
//     kiçik xana MƏXFİLİK üçün gizlədilir və «Açıqlanmayan» adlanır. Bu,
//     `cell.visible`-a ÜMUMİYYƏTLƏ düşmür — buradakı kod onu heç görmür.
//   · buradakı yığım: artıq AÇIQLANMIŞ xanalar OXUNAQLILIQ üçün birləşdirilir.
//     Heç bir say itmir, cəm dəyişmir.
//
// ⚠️ CƏDVƏL YIĞILMIR. `StatsTable` vizualın əlçatan alternatividir; orada
// bütün kateqoriyalar TAM siyahı ilə qalır. Yığım yalnız donut + leqenda
// üçündür, çünki məhdudiyyət RƏNGdən gəlir, məlumatdan yox.
//
// ⚠️ `Industry.OTHER` onsuz da "Digər"dir. Yığılan xana MƏHZ onun açarını
// alır — əks halda leqendada eyni adlı İKİ sətir görünərdi.
// ============================================================================

import { MAX_DONUT_SLICES } from "./palette";

/** Enum-dakı «Digər» xanası — yığılan qalıq da bu açarı alır. */
const OTHER_KEY = "OTHER";

export interface DonutSlice {
  key: string;
  label: string;
  count: number;
  /** Neçə kateqoriyadan yığılıb — 1 isə adi xanadır. Leqenda bunu yazır. */
  mergedCount: number;
}

/**
 * Açıqlanmış xanaları donut üçün ƏN ÇOX `MAX_DONUT_SLICES` dilimə yığır.
 *
 * Sıra: saya görə AZALAN. Bərabər saylarda ad ilə (əlifba) — nəticə
 * DETERMİNİKDİR, yəni eyni məlumat həmişə eyni rəngi alır.
 */
export function toDonutSlices(
  buckets: readonly { key: string; count: number }[],
  labelOf: (key: string) => string,
): DonutSlice[] {
  const sorted = [...buckets]
    .map((bucket) => ({
      key: bucket.key,
      label: labelOf(bucket.key),
      count: bucket.count,
      mergedCount: 1,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "az"));

  if (sorted.length <= MAX_DONUT_SLICES) return sorted;

  // «Digər» HƏMİŞƏ qalığa qoşulur: ilk sıralara düşsə belə ayrıca dilim kimi
  // qalsaydı, yığılan xana ilə eyni adı daşıyan iki dilim yaranardı.
  const named = sorted.filter((slice) => slice.key !== OTHER_KEY);

  const kept = named.slice(0, MAX_DONUT_SLICES - 1);
  const merged = [...named.slice(MAX_DONUT_SLICES - 1), ...sorted.filter((s) => s.key === OTHER_KEY)];

  return [
    ...kept,
    {
      key: OTHER_KEY,
      label: labelOf(OTHER_KEY),
      count: merged.reduce((sum, slice) => sum + slice.count, 0),
      mergedCount: merged.length,
    },
  ];
}
