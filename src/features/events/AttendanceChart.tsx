"use client";

// ============================================================================
// src/features/events/AttendanceChart.tsx
// İştirak statistikası (spec §14) — Recharts.
//
// ⚠️ CLAUDE.md: qrafik kitabxanası YALNIZ Recharts-dır.
//
// ⚠️ `"use client"` MƏCBURİDİR — Recharts `ResponsiveContainer` DOM ölçüsünü
// oxuyur, serverdə render oluna bilmir.
//
// ⚠️ RƏNGLƏR HARDCODE DEYİL: Recharts `fill` propuna Tailwind sinfi qəbul
// etmir, CSS dəyəri gözləyir — ona görə KUDS tokenləri `var(--…)` CSS
// dəyişənləri ilə oxunur (`globals.css`-də təyin olunub). `#`-lə başlayan
// hex kod bu fayla düşmür (CLAUDE.md §2).
//
// ⚠️ `summarizeRsvps` bütün statusları SIFIRLA doldurur, ona görə boş tədbirdə
// də oxlar və sütun yerləri görünür (Recharts boş massivdə heç nə çəkmir).
// ============================================================================

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { RSVP_STATUS_VALUES, type RsvpStatus as RsvpStatusType } from "@/lib/enums";
import { RSVP_STATUS_LABELS } from "@/lib/labels";

interface AttendanceChartProps {
  /** Status → say. `lib/rsvp.ts` → `summarizeRsvps().byStatus`. */
  byStatus: Record<string, number>;
}

/**
 * Status → KUDS rəng tokeni (CSS dəyişəni adı).
 *
 * `ku-green` əsas, `ku-blue` neytral gözləmə, `success/danger/warning` isə
 * nəticə statusları. `Record<RsvpStatus, …>` tipindədir — enum-a yeni dəyər
 * əlavə olunsa `tsc` burada dayanır.
 */
const STATUS_COLOR: Record<RsvpStatusType, string> = {
  INVITED: "var(--chart-neutral)",
  ACCEPTED: "var(--chart-primary)",
  DECLINED: "var(--chart-danger)",
  REGISTERED: "var(--chart-primary-dark)",
  WAITLISTED: "var(--chart-warning)",
  ATTENDED: "var(--chart-success)",
  NO_SHOW: "var(--chart-muted)",
};

export function AttendanceChart({ byStatus }: AttendanceChartProps) {
  const data = RSVP_STATUS_VALUES.map((status) => ({
    status,
    label: RSVP_STATUS_LABELS[status],
    count: byStatus[status] ?? 0,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={70}
            stroke="var(--chart-grid)"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
            stroke="var(--chart-grid)"
          />
          <Tooltip
            cursor={{ fill: "var(--chart-grid)", opacity: 0.3 }}
            // Recharts 3-də `value` `ValueType | undefined`-dir (ox sahəsi
            // boş ola bilər) — tipi daraltmaq əvəzinə cavab burada normallaşır.
            formatter={(value) => [`${Number(value ?? 0)} nəfər`, "Say"]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--chart-grid)",
              fontSize: 14,
            }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Say">
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLOR[entry.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
