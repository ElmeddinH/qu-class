// ============================================================================
// src/features/where-are-we-now/ChartFrame.tsx
// Hər görünüşün ortaq çərçivəsi: başlıq → izah → vizual → izahat → cədvəl.
//
// ÜÇ QAYDA BURADA MƏRKƏZLƏŞİR (hər qrafikdə təkrarlanmasın):
//
// 1. 🔴 BOŞ QRAFİK GÖSTƏRİLMİR. Açıqlanan xana yoxdursa Recharts-a boş massiv
//    verib "oxları olan, sütunu olmayan" qrafik çıxarmaq istifadəçini
//    çaşdırır ("nasazlıqdır?"). Əvəzinə səbəb yazılır: minimum 3 nəfər.
//
// 2. 🔴 GİZLƏDİLƏNLƏR SƏSSİZCƏ ATILMIR. «Açıqlanmayan» sayı və SƏBƏBİ hər
//    görünüşün altında yazılır. İki səbəb AYRI-AYRI göstərilir, çünki onlar
//    fərqli şeylərdir: (a) qrup 3 nəfərdən kiçikdir → məxfilik, (b) həmin ölçü
//    üzrə məlumat bildirilməyib → boşluq.
//
// 3. 🔴 CƏDVƏL ALTERNATİVİ MƏCBURİDİR (KUDS §21 / WCAG 2.2) — bax `StatsTable`.
// ============================================================================

import type { LucideIcon } from "lucide-react";

import { MIN_BUCKET_SIZE } from "@/lib/career-stats";

interface ChartFrameProps {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Vizual — açıqlanan məlumat varsa render olunur. */
  children: React.ReactNode;
  /** `StatsTable` — «Cədvəl kimi göstər» içində. */
  table: React.ReactNode;
  /** Açıqlanan xana varmı? Yoxsa (1)-ci qayda işə düşür. */
  hasData: boolean;
  /** k-anonimliklə gizlədilmiş sətirlər (dəyəri var, qrupu kiçikdir). */
  suppressedCount: number;
  /** Bu ölçü üzrə məlumat bildirməyən sətirlər. */
  unknownCount: number;
  /** Cədvəl açılışının başlığı — hər görünüşdə unikal olsun (ekran oxuyucusu). */
  tableLabel: string;
}

export function ChartFrame({
  title,
  description,
  icon: Icon,
  children,
  table,
  hasData,
  suppressedCount,
  unknownCount,
  tableLabel,
}: ChartFrameProps) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds">
      <header className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-avatar bg-ku-soft"
          aria-hidden
        >
          <Icon className="h-5 w-5 text-ku-dark" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-semibold text-text-primary">{title}</h2>
          <p className="text-small text-text-secondary">{description}</p>
        </div>
      </header>

      {hasData ? (
        children
      ) : (
        // Qayda 1 — boş qrafik yerinə SƏBƏB.
        <p className="rounded-card border border-dashed border-border p-4 text-small text-text-secondary">
          Bu göstərici üçün kifayət qədər məlumat yoxdur (minimum {MIN_BUCKET_SIZE} nəfər).
          Daha çox sinif yoldaşı karyera məlumatını əlavə edib «statistikaya daxil et»
          seçimini işarələdikcə bölgü açılacaq.
        </p>
      )}

      {/* Qayda 2 — gizlədilənlərin sayı və SƏBƏBİ. */}
      {suppressedCount > 0 || unknownCount > 0 ? (
        <ul className="flex flex-col gap-1 text-caption text-text-secondary">
          {suppressedCount > 0 ? (
            <li>
              <strong className="font-medium">Açıqlanmayan · {suppressedCount}</strong> —{" "}
              {MIN_BUCKET_SIZE} nəfərdən az olan qruplar məxfilik üçün birləşdirilib.
            </li>
          ) : null}
          {unknownCount > 0 ? (
            <li>
              <strong className="font-medium">Bildirilməyən · {unknownCount}</strong> — bu
              göstərici üzrə məlumat paylaşılmayıb.
            </li>
          ) : null}
        </ul>
      ) : null}

      {/* Qayda 3 — cədvəl alternativi. `<details>` klaviatura ilə açılır. */}
      <details className="group rounded-card border border-border">
        <summary className="cursor-pointer rounded-card px-4 py-3 text-small font-medium text-ku-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ku-green">
          Cədvəl kimi göstər
          <span className="sr-only"> — {tableLabel}</span>
        </summary>
        <div className="overflow-x-auto border-t border-border px-4 py-3">{table}</div>
      </details>
    </section>
  );
}
