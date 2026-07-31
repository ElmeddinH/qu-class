"use client";

// ============================================================================
// src/features/events/AttendanceChart.lazy.tsx
// Recharts-ın tənbəl sərhədi — bax `features/admin/ActivityChart.lazy.tsx`
// başlığındakı tam izah (eyni səbəb, eyni qayda).
//
// ⚠️ `EventDetail` SERVER komponentidir → `ssr: false` dinamikası burada,
// `"use client"` modulunda saxlanılmalıdır.
// ⚠️ Qrafik tədbir səhifəsinin AŞAĞISINDADIR (statistika bölməsi) və yalnız
// tamamlanmış tədbirlərdə göstərilir — yəni ilk paketdə yeri yoxdur.
// ============================================================================

import dynamic from "next/dynamic";

import { ChartSkeleton } from "@/components/shared/ChartSkeleton";

/** `AttendanceChart` konteynerinin hündürlüyü (`h-64`). */
const CHART_HEIGHT = 256;

export const AttendanceChart = dynamic(
  () => import("./AttendanceChart").then((module) => module.AttendanceChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={CHART_HEIGHT} label="İştirak qrafiki" />,
  },
);
