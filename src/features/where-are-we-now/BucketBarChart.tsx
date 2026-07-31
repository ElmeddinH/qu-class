"use client";

// ============================================================================
// src/features/where-are-we-now/BucketBarChart.tsx
// ÜFÜQİ sütun diaqramı — şəhər, ölkə, şirkət, vəzifə və təhsil görünüşlərinin
// ortaq primitivi.
//
// ⚠️ `"use client"` MƏCBURİDİR — Recharts `ResponsiveContainer` DOM ölçüsünü
// oxuyur (bax `features/events/AttendanceChart.tsx`).
//
// ⚠️ NİYƏ ÜFÜQİ: etiketlər uzundur ("Birləşmiş Ərəb Əmirlikləri", "Kibertəhlükə-
// sizlik"). Şaquli sütunda belə adlar 45° əyilir və oxunmur; üfüqi sütunda ad
// tam sətir kimi yazılır. Recharts-da bu `layout="vertical"` deməkdir (ad
// tərsdir: "vertical" oxların istiqamətinə aiddir, sütunlara yox).
//
// ⚠️ LEQENDA YOXDUR VƏ BU DÜZGÜNDÜR — tək seriyalıdır, başlıq onsuz da nəyin
// sayıldığını deyir. Tək seriya üçün leqenda boş yer tutur.
//
// ⚠️ Rəng SIRALANMAYA görə DEYİL: bütün sütunlar eyni əsas rəngdədir. Sütunun
// UZUNLUĞU onsuz da böyüklüyü göstərir; rəngi də dəyişsək eyni məlumat iki
// dəfə kodlaşdırılar və "yaşıl niyə fərqlidir?" sualı yaranar.
// ============================================================================

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { bucketChartHeight } from "./bucket-chart-layout";

export interface BucketDatum {
  /** Xam açar — React key üçün (etiketlər eyniləşə bilər). */
  key: string;
  label: string;
  count: number;
}

interface BucketBarChartProps {
  data: BucketDatum[];
  /** Tooltip-də sütunun adı — "Şəhər", "Şirkət"… */
  dimensionLabel: string;
}

export function BucketBarChart({ data, dimensionLabel }: BucketBarChartProps) {
  // ⚠️ Hesab `bucket-chart-layout.ts`-dədir: skeleton eyni hündürlüyü Recharts-ı
  // yükləmədən bilməlidir (bax həmin faylın başlığı).
  const height = bucketChartHeight(data.length);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
            stroke="var(--chart-grid)"
          />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
            stroke="var(--chart-grid)"
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-grid)", opacity: 0.3 }}
            // Recharts 3-də `value` `ValueType | undefined`-dir — cavab burada
            // normallaşır (`AttendanceChart` ilə eyni nümunə).
            formatter={(value) => [`${Number(value ?? 0)} nəfər`, dimensionLabel]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--chart-grid)",
              fontSize: 14,
            }}
          />
          <Bar
            dataKey="count"
            name={dimensionLabel}
            fill="var(--chart-primary)"
            radius={[0, 8, 8, 0]}
          >
            {/* Seçici birbaşa etiket: sütunun ucundaki say. Hər nöqtəyə rəqəm
                yazmaq deyil — bir seriyada uc etiketi oxumağı asanlaşdırır və
                rəngin kontrastından ASILI OLMAYAN ikinci kanaldır. */}
            <LabelList
              dataKey="count"
              position="right"
              className="fill-text-secondary text-caption"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
