"use client";

// ============================================================================
// src/features/admin/BulkModeration.tsx
// TOPLU MODERASİYA — çoxlu seçim + «seçilmişləri həll et / rədd et» (Blok 12B).
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 SEÇİM VƏZİYYƏTİ CLIENT-DƏ, LİSTƏ İSƏ SERVERDƏ QALIR
// ────────────────────────────────────────────────────────────────────────────
// `ReportQueue` server komponentidir və elə qalmalıdır: şikayət məlumatı
// servisdən gəlir və məzmun (TƏLƏ A) heç vaxt cavabda olmur. Ona görə seçim
// üçün bütün siyahını client-ə köçürmək əvəzinə KİÇİK bir kontekst adası
// qurulur: `ModerationSelectionProvider` yalnız işarələnmiş `id` dəstini
// saxlayır, sətirlər isə serverdə render olunmağa davam edir.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 HƏR ELEMENT ÜÇÜN AYRICA AuditLog
// ────────────────────────────────────────────────────────────────────────────
// Bir «12 şikayət həll edildi» yekun sətri YOXDUR — audit `entityId` üzrə
// sorğulanır və yekun sətir «bu şikayətə kim qərar verdi?» izini qırardı.
// Qayda servisdədir (`moderation.service.ts` → `bulkDecideReports`), burada
// yalnız istifadəçiyə açıq şəkildə yazılır.
//
// ⚠️ QİSMƏN UĞUR YOXDUR: hamısı bir `$transaction`-dadır. Seçimdə artıq
// bağlanmış şikayət varsa HEÇ BİRİ tətbiq olunmur və server səbəbi qaytarır.
//
// ⚠️ Bağlanmış şikayətlər ÜMUMİYYƏTLƏ seçilə bilmir (checkbox render olunmur):
// serverin rədd edəcəyi seçimi UI-da mümkün göstərmək mənasız gözləntidir.
// Qoruma yenə də serverdədir — checkbox-un yoxluğu qoruma sayılmır.
// ============================================================================

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ReportStatus } from "@/lib/enums";

import { bulkDecideReportsAction } from "./actions";

interface SelectionContextValue {
  selected: ReadonlySet<string>;
  toggle: (reportId: string, checked: boolean) => void;
  clear: () => void;
  /** Seçilə bilən (yəni açıq) şikayətlərin id-ləri — «hamısını seç» üçün. */
  selectableIds: readonly string[];
  selectAll: () => void;
  pending: boolean;
  setPending: (pending: boolean) => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

function useSelection(): SelectionContextValue {
  const value = useContext(SelectionContext);
  if (value === null) {
    throw new Error("Toplu moderasiya komponentləri Provider-in İÇİNDƏ olmalıdır.");
  }
  return value;
}

export function ModerationSelectionProvider({
  selectableIds,
  children,
}: {
  selectableIds: readonly string[];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState(false);

  const toggle = useCallback((reportId: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(reportId);
      else next.delete(reportId);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);
  const selectAll = useCallback(
    () => setSelected(new Set(selectableIds)),
    [selectableIds],
  );

  const value = useMemo(
    () => ({ selected, toggle, clear, selectableIds, selectAll, pending, setPending }),
    [clear, pending, selectAll, selectableIds, selected, toggle],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

/** Sətirdəki seçim qutusu. Bağlanmış şikayətlər üçün ÇAĞIRILMIR. */
export function ReportSelectCheckbox({
  reportId,
  label,
}: {
  reportId: string;
  label: string;
}) {
  const { selected, toggle, pending } = useSelection();
  const id = `report-select-${reportId}`;

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={selected.has(reportId)}
        disabled={pending}
        onCheckedChange={(next) => toggle(reportId, next === true)}
      />
      <Label htmlFor={id} className="text-caption font-normal text-text-secondary">
        {label}
      </Label>
    </div>
  );
}

/**
 * Toplu əməliyyat paneli — siyahının ÜSTÜNDƏ dayanır.
 *
 * ⚠️ `sticky` DEYİL: kuki banneri onsuz da səhifənin altını tutur və iki
 * yapışqan element bir-birini örtərdi.
 */
export function BulkActionBar() {
  const { selected, clear, selectableIds, selectAll, pending, setPending } = useSelection();
  const [resolution, setResolution] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const count = selected.size;
  const busy = pending || isPending;

  function apply(decision: string) {
    const reportIds = [...selected];

    setPending(true);
    startTransition(async () => {
      const result = await bulkDecideReportsAction({
        reportIds,
        decision,
        resolution,
      });

      setPending(false);

      if (!result.ok) {
        toast.error(result.message ?? "Toplu əməliyyat tamamlanmadı.");
        return;
      }

      toast.success(result.message ?? "Qərar yazıldı.");
      clear();
      setResolution("");
      router.refresh();
    });
  }

  return (
    <div
      data-testid="bulk-moderation-bar"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-sm-kuds"
      role="group"
      aria-label="Toplu moderasiya"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-text-primary" aria-live="polite">
          {count === 0
            ? "Toplu əməliyyat üçün sətirləri işarələyin."
            : `${count} şikayət seçilib.`}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || selectableIds.length === 0}
            onClick={selectAll}
          >
            Açıq olanların hamısını seç ({selectableIds.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || count === 0}
            onClick={clear}
          >
            Seçimi təmizlə
          </Button>
        </div>
      </div>

      {count === 0 ? null : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-resolution" className="text-caption text-text-secondary">
              Qərarın izahı — seçilmiş HƏR şikayət üçün eyni mətn yazılır (həll və
              rədd üçün məcburidir)
            </Label>
            <Textarea
              id="bulk-resolution"
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              rows={2}
              placeholder="Şikayətlər toplu yoxlanıldı…"
              className="rounded-input"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => apply(ReportStatus.IN_REVIEW)}
            >
              Seçilmişləri baxışa götür
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => apply(ReportStatus.RESOLVED)}
            >
              Seçilmişləri həll et
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => apply(ReportStatus.REJECTED)}
            >
              Seçilmişləri rədd et
            </Button>
          </div>

          <p className="text-caption text-text-secondary">
            Hamısı BİR tranzaksiyada yazılır — biri alınmasa heç biri tətbiq olunmur.
            Hər şikayət üçün AYRICA audit sətri və şikayətçiyə ayrıca bildiriş yaranır.
          </p>
        </>
      )}
    </div>
  );
}
