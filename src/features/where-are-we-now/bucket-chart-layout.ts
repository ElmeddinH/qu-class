// ============================================================================
// src/features/where-are-we-now/bucket-chart-layout.ts
// Üfüqi sütun diaqramının HÜNDÜRLÜK hesabı — ayrıca, Recharts-SIZ modul.
//
// 🔴 NİYƏ AYRICA FAYL: `BucketBarChart` Blok 12C-də `next/dynamic` ilə
// yüklənir, yəni onun modulu İLK KADRDA HƏLƏ GƏLMƏYİB. Skeleton isə eyni
// hündürlüyü BİLMƏLİDİR — əks halda qrafik gələndə səhifə sıçrayır (CLS).
// Sabitləri `BucketBarChart.tsx`-dən import etsəydik həmin modul (və onunla
// birlikdə bütün Recharts) yenidən əsas paketə düşərdi və dinamik yükləmənin
// mənası qalmazdı.
// ============================================================================

/** Sətir başına hündürlük — çox xanada qrafik sıxılmasın. */
export const BUCKET_ROW_HEIGHT = 44;

/** Ən az hündürlük — bir-iki xanada qrafik yastılaşmasın. */
export const BUCKET_MIN_HEIGHT = 176;

export function bucketChartHeight(rowCount: number): number {
  return Math.max(BUCKET_MIN_HEIGHT, rowCount * BUCKET_ROW_HEIGHT);
}
