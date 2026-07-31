"use client";

// ============================================================================
// src/features/where-are-we-now/IndustriesChart.lazy.tsx
// Recharts-ın tənbəl sərhədi — bax `features/admin/ActivityChart.lazy.tsx`.
//
// ⚠️ Donut «İndi haradayıq?» panelinin YALNIZ BİR tabındadır (`industries`).
// Digər tablar (xəritə, şəhərlər, ölkələr…) açılanda bu qrafik heç vaxt
// render olunmur — yəni ilk paketdə yeri yoxdur.
//
// ⚠️ `MapTabs` client komponentidir, yəni burada `dynamic` birbaşa da yazıla
// bilərdi; ayrıca fayl QƏSDƏNDİR — dörd qrafikin dördü də eyni nümunə ilə
// yüklənir və axtaranda hamısı `*.lazy.tsx` adında tapılır.
// ============================================================================

import dynamic from "next/dynamic";

import { ChartSkeleton } from "@/components/shared/ChartSkeleton";

/** Donut konteynerinin hündürlüyü (`h-64`). */
const CHART_HEIGHT = 256;

export const IndustriesChart = dynamic(
  () => import("./IndustriesChart").then((module) => module.IndustriesChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={CHART_HEIGHT} label="Sənaye bölgüsü" />,
  },
);
