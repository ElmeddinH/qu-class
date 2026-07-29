"use client";

// ============================================================================
// src/features/profile/career/EntryConsentFields.tsx
// Karyera və təhsil qeydinin İKİ MÜSTƏQİL RAZILIĞI — bir yerdə, bir dəfə.
//
// 🔴 BUNLAR AYRI SUALLARDIR VƏ AYRI İDARƏEDİCİ TƏLƏB EDİR:
//
//   1. GÖRÜNÜRLÜK (`visibility`)      → "bu qeydi KİM GÖRƏ bilər?"
//   2. AQREQASİYA (`includeInStats`)  → "bu qeyd STATİSTİKAYA daxil olsun?"
//
// Səviyyə `PUBLIC` qoyan istifadəçi statistikaya qoşulmağa razı olmaya bilər
// (spec §13): "iş yerimi sinfim görsün" ≠ "universitet hesabatında xana
// olum". `stats.service` hər İKİSİNİ tələb edir — biri kifayət etmir. Ona görə
// interfeysdə də iki ayrı element var; tək açar qoysaydıq istifadəçi bir
// razılıq verib ikisini vermiş olardı.
//
// Komponent HƏR İKİ dialoqda (karyera + təhsil) işlədilir — dublikat yoxdur.
// ============================================================================

import { ChartColumn } from "lucide-react";

import { VisibilitySelector } from "@/components/shared/VisibilitySelector";
import { VISIBILITY_META } from "@/components/shared/visibility-meta";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Visibility } from "@/lib/visibility";

interface EntryConsentFieldsProps {
  visibility: Visibility;
  onVisibilityChange: (value: Visibility) => void;
  includeInStats: boolean;
  onIncludeInStatsChange: (value: boolean) => void;
  /**
   * Radio qrupunun adı — SƏHİFƏDƏ UNİKAL olmalıdır. İki dialoq eyni anda
   * DOM-da ola bilər (karyera + təhsil), eyni ad qrupları birləşdirərdi.
   */
  namePrefix: string;
  disabled?: boolean;
}

export function EntryConsentFields({
  visibility,
  onVisibilityChange,
  includeInStats,
  onIncludeInStatsChange,
  namePrefix,
  disabled = false,
}: EntryConsentFieldsProps) {
  const statsSwitchId = `${namePrefix}-include-in-stats`;

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-background p-4">
      {/* --- 1. RAZILIQ: görünürlük --- */}
      <div className="flex flex-col gap-2">
        <p className="text-small font-medium text-text-primary">Bu qeydi kim görə bilər?</p>

        <VisibilitySelector
          name={`${namePrefix}-visibility`}
          legend="Qeydin görünürlük səviyyəsi"
          value={visibility}
          onValueChange={onVisibilityChange}
          disabled={disabled}
        />

        <p className="text-caption text-text-secondary">
          {VISIBILITY_META[visibility].audience}
        </p>
      </div>

      <Separator />

      {/* --- 2. RAZILIQ: aqreqasiya (görünürlükdən MÜSTƏQİL) --- */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={statsSwitchId}
            className="flex items-center gap-2 text-small font-medium text-text-primary"
          >
            <ChartColumn className="h-4 w-4 text-ku-green" aria-hidden />
            Statistikaya daxil et
          </Label>
          <p className="max-w-md text-caption text-text-secondary">
            «İndi haradayıq?» panelindəki xanalara bu qeyd də əlavə olunsun. Bu,
            görünürlükdən AYRI razılıqdır: qeydi sinfinizə göstərmək statistikaya
            qoşulmaq demək deyil. Statistikada ad göstərilmir, yalnız şəhər/ölkə
            səviyyəsində sayılırsınız.
          </p>
        </div>

        <Switch
          id={statsSwitchId}
          checked={includeInStats}
          disabled={disabled}
          onCheckedChange={onIncludeInStatsChange}
        />
      </div>
    </div>
  );
}
