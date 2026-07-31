"use client";

// ============================================================================
// src/features/admin/ActivityChart.lazy.tsx
// Blok 12C · B bəndi — Recharts YALNIZ LAZIM OLANDA yüklənir.
//
// 🔴 ÖLÇÜ NƏ DEYİRDİ: `/admin` mobil profildə `bootup-time 1.7 s`,
// `mainthread-work-breakdown 2.9 s` və 48 KiB işlənməmiş JS verirdi. Səbəb —
// Recharts (+ d3 alt paketləri) dashboard-un İLK paketində gəlirdi, halbuki
// qrafik ekranın aşağısındadır və istifadəçilərin bir hissəsi ona heç baxmır.
//
// 🔴 `ssr: false` MƏCBURİDİR: `ResponsiveContainer` DOM ölçüsünü oxuyur və
// serverdə render oluna bilmir (impl faylının öz qeydi).
//
// 🔴 BU FAYL `"use client"`-dir və bu, TƏSADÜF DEYİL. Next.js 15 App
// Router-də `dynamic(..., { ssr: false })` SERVER komponentindən çağırıla
// bilmir (build xətası). `AdminDashboard` isə server komponentidir — ona görə
// dinamik sərhəd ayrıca client modulunda saxlanılır və server yalnız onu
// import edir.
//
// ⚠️ `loading` skeleton-un hündürlüyü qrafiklə EYNİDİR (`h-64` = 256px),
// yoxsa qrafik gələndə səhifə sıçrayar (CLS).
// ============================================================================

import dynamic from "next/dynamic";

import { ChartSkeleton } from "@/components/shared/ChartSkeleton";

/** `ActivityChart` konteynerinin hündürlüyü (`h-64`). */
const CHART_HEIGHT = 256;

export const ActivityChart = dynamic(
  () => import("./ActivityChart").then((module) => module.ActivityChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={CHART_HEIGHT} label="Aktivlik qrafiki" />,
  },
);
