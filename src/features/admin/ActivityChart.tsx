"use client";

// ============================================================================
// src/features/admin/ActivityChart.tsx
// Son 12 həftənin paylaşım / qeydiyyat sayı (dashboard).
//
// ⚠️ `"use client"` MƏCBURİDİR — Recharts `ResponsiveContainer` DOM ölçüsünü
// oxuyur (Blok 9-dakı `AttendanceChart` ilə eyni səbəb).
//
// 🔴 TƏLƏ G — BU QRAFİKDƏ FƏRD YOXDUR. Giriş `SeriesPoint[]`-dir: həftə + iki
// say. Nə `userId`, nə ad, nə də sıralama. «Ən aktiv istifadəçilər» lider
// cədvəli QƏSDƏN yaradılmayıb — səbəb `lib/admin-series.ts` başlığında və
// STATE.md-dədir.
//
// ⚠️ Cədvəl alternativi var (KUDS §21 / WCAG 2.2 — "vizual TƏK kanal olmamalı"):
// qrafikin altındaki `<details>` eyni məlumatı `<table>` kimi verir.
// ============================================================================

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SeriesPoint } from "@/lib/admin-series";

interface ActivityChartProps {
  data: SeriesPoint[];
}

const SERIES = [
  { key: "posts", label: "Paylaşım", color: "var(--chart-primary)" },
  { key: "members", label: "Yeni qeydiyyat", color: "var(--chart-primary-dark)" },
] as const;

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
              stroke="var(--chart-grid)"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
              stroke="var(--chart-grid)"
              width={36}
            />
            <Tooltip
              // Recharts 3-də `value` `ValueType | undefined`-dir.
              formatter={(value, name) => [`${Number(value ?? 0)}`, String(name)]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--chart-grid)",
                fontSize: 14,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {SERIES.map((series) => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.label}
                stroke={series.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <details className="text-small text-text-secondary">
        <summary className="cursor-pointer">Cədvəl kimi göstər</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-caption">
            <caption className="sr-only">
              Son {data.length} həftənin paylaşım və qeydiyyat sayı
            </caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Həftə
                </th>
                {SERIES.map((series) => (
                  <th key={series.key} scope="col" className="py-2 pr-4 font-medium">
                    {series.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.week} className="border-b border-border/60">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {point.week}
                  </th>
                  <td className="py-2 pr-4">{point.posts}</td>
                  <td className="py-2 pr-4">{point.members}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
