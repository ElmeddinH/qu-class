"use client";

// ============================================================================
// src/features/where-are-we-now/BucketBarChart.lazy.tsx
// Recharts-ın tənbəl sərhədi — bax `features/admin/ActivityChart.lazy.tsx`.
//
// 🔴 BURADA XÜSUSİ HAL VAR: bu qrafikin hündürlüyü SƏTİR SAYINDAN asılıdır,
// yəni skeleton eyni ölçünü bilmək üçün `data.length`-i görməlidir. `dynamic`
// isə `loading`-ə prop ötürmür. Ona görə tənbəl komponent ADİ komponentin
// içinə bükülür: xarici komponent props-u görür və skeleton hündürlüyünü
// `bucketChartHeight()` ilə ÖZÜ hesablayır (Recharts-a toxunmadan — hesab
// ayrıca `bucket-chart-layout.ts` modulundadır).
//
// Nəticə: qrafik gələnə qədər skeleton MƏHZ eyni hündürlükdədir → CLS = 0.
// ============================================================================

import dynamic from "next/dynamic";

import { ChartSkeleton } from "@/components/shared/ChartSkeleton";

import { bucketChartHeight } from "./bucket-chart-layout";
import type { BucketDatum } from "./BucketBarChart";

interface BucketBarChartProps {
  data: BucketDatum[];
  dimensionLabel: string;
}

function lazyBucketBarChart(height: number) {
  return dynamic(
    () => import("./BucketBarChart").then((module) => module.BucketBarChart),
    {
      ssr: false,
      loading: () => <ChartSkeleton height={height} label="Bölgü qrafiki" />,
    },
  );
}

/**
 * ⚠️ `dynamic()` RENDER İÇİNDƏ ÇAĞIRILMIR — hər render-də yeni komponent tipi
 * yaranardı və React ağacı hər dəfə sıfırdan qurulardı (qrafik yanıb-sönərdi).
 * Bunun əvəzinə sətir sayına görə keşlənir: eyni say → eyni komponent.
 */
const cache = new Map<number, ReturnType<typeof lazyBucketBarChart>>();

function chartFor(rowCount: number) {
  const height = bucketChartHeight(rowCount);
  const existing = cache.get(height);
  if (existing) return existing;

  const created = lazyBucketBarChart(height);
  cache.set(height, created);
  return created;
}

export function BucketBarChart({ data, dimensionLabel }: BucketBarChartProps) {
  const Chart = chartFor(data.length);
  return <Chart data={data} dimensionLabel={dimensionLabel} />;
}
