// ============================================================================
// src/features/where-are-we-now/ConsentNotice.tsx
// 🔴 RAZILIQ ŞƏFFAFLIĞI — bu blokun müdafiə üçün ən dəyərli detalı.
//
// Üç sual cavablandırılır və heç biri "xırda detal" deyil:
//
// 1. BU RƏQƏMLƏR KİMDƏNDİR? Panel BÜTÜN sinfi göstərmir — yalnız aqreqasiyaya
//    AYRICA razılıq vermiş üzvlərin CARİ iş qeydlərini. Bunu yazmasaq oxucu
//    "bizim sinifdən yalnız 15 nəfər işləyir" nəticəsi çıxarar (yalandır) və
//    razılıq verməyənlərin seçimi görünməz qalar.
//
// 2. MƏNİM MƏLUMATIM BURADADIRMI? İstifadəçi öz iştirakını BİR BAXIŞDA
//    görməlidir. "Məxfilik parametrlərini yoxla" deməkdənsə birbaşa cavab +
//    `/me/career` linki verilir. Razılıq geri alına bilməlidir və bunun yolu
//    görünən olmalıdır (GDPR-in "withdraw consent" prinsipi).
//
// 3. NİYƏ BƏZİ RƏQƏMLƏR YOXDUR? Gizlədilmiş xanaların səbəbi AÇIQ yazılır —
//    səssizcə atmaq istifadəçidə "sistem nasazdır" hissi yaradır.
//
// ⚠️ Bu komponent SERVER komponentidir (`"use client"` yoxdur) — vəziyyət
// saxlamır, yalnız rəqəmləri mətnə çevirir.
// ============================================================================

import Link from "next/link";
import { Info, ShieldCheck, ShieldOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MIN_BUCKET_SIZE, type WhereAreWeNow } from "@/lib/career-stats";

export function ConsentNotice({ stats }: { stats: WhereAreWeNow }) {
  const { memberCount, totalConsented, respondentCount, suppressedCount } = stats;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-ku-blue/40 p-4">
      <p className="flex items-start gap-2 text-small text-text-primary">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ku-dark" aria-hidden />
        <span>
          Bu statistikalar yalnız aqreqasiyaya razılıq verən üzvlərin{" "}
          <strong className="font-medium">cari iş qeydlərindən</strong> hesablanır.{" "}
          {memberCount === null ? (
            <>Razılıq verən üzv sayı: {totalConsented}.</>
          ) : (
            <>
              {memberCount} üzvdən {totalConsented}-i razılıq verib
              {respondentCount !== totalConsented ? (
                <>
                  ; onlardan {respondentCount} nəfərin cari iş qeydi var və bölgüdə
                  sayılır
                </>
              ) : null}
              .
            </>
          )}
        </span>
      </p>

      <p className="flex items-start gap-2 text-small text-text-primary">
        {stats.viewerIncluded ? (
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-strong" aria-hidden />
        ) : (
          <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
        )}
        <span data-testid="viewer-participation">
          {stats.viewerIncluded ? (
            <>
              Sənin məlumatın bu statistikada <strong className="font-medium">iştirak edir</strong>.
            </>
          ) : (
            <>
              Sənin məlumatın bu statistikada{" "}
              <strong className="font-medium">iştirak etmir</strong>.
            </>
          )}
        </span>
      </p>

      {/* ⚠️ `text-text-primary` — `ku-blue/40` fonunda `text-text-secondary`
          4.5:1 həddini keçmir (axe `color-contrast`, serious). CLAUDE.md-nin
          qaydası onsuz da budur: ku-blue/ku-soft/ku-cream üzərində yalnız
          `text-text-primary`. Ölçü `text-caption` olaraq qalır. */}
      <p className="text-caption text-text-primary">
        {MIN_BUCKET_SIZE} nəfərdən az olan qruplar məxfilik üçün «Açıqlanmayan» sətrinə
        birləşdirilib — belə qrup konkret şəxsi göstərmiş olardı.
        {suppressedCount > 0 ? (
          <> Bu səhifədə {suppressedCount} nəfərin bölgüsü bu qaydaya görə tam açılmır.</>
        ) : null}{" "}
        Xəritədə dəqiq ünvan və koordinat heç vaxt göstərilmir — yalnız şəhər və ölkə
        mərkəzləri.
      </p>

      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/me/career">Karyera məlumatım və razılığım</Link>
        </Button>
      </div>
    </div>
  );
}
