"use client";

// ============================================================================
// src/features/events/manage/AttendeeTable.tsx
// İştirakçı cədvəli — KUDS §14-ün ALTI MƏCBURİ funksiyası:
//   sorting · filtering · pagination · search · export · responsive
//
// 🔴 SORTING VƏ SƏHİFƏLƏMƏ BURADA (client-də) EDİLİR, digər cədvəllərdən
// FƏRQLİ olaraq. Səbəb açıqdır və qəsdəndir:
//   · Kataloq / xronologiya siyahıları MİNLƏRLƏ sətirdir və məxfilik süzgəci
//     DB-də qalmalıdır (CLAUDE.md §5 — JS-də filtrləmə qadağandır).
//   · Bu cədvəl BİR TƏDBİRİN iştirakçılarıdır: onlarla, ən çoxu bir neçə yüz
//     sətir, hamısı ONSUZ DA rol qapısından keçmiş koordinatora açıqdır.
//     Yəni burada JS-də çeşidləmək nə məxfilik, nə də səhifələmə problemi
//     yaradır — server sətirləri artıq tam göndərib.
//   · Əvəzində sütun başlığına klik ANİdir və koordinator check-in zamanı
//     siyahını sürətlə çeşidləyə bilir.
//
// ⚠️ Axtarış və status filtri isə SERVERDƏDİR (`listEventAttendees`) — onlar
// nəticə DƏSTİNİ dəyişir və `total` ilə uzlaşmalıdır.
//
// ⚠️ Mobil: cədvəl `overflow-x-auto` içindədir (KUDS §14 responsive).
// ============================================================================

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Download,
  LoaderCircle,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CSV_BOM_BYTES } from "@/lib/csv";
import { RsvpStatus } from "@/lib/enums";
import { ATTENDEE_PARAMS } from "@/lib/event-filters";
import { cohortRoleLabel, rsvpStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { shortDate } from "@/utils/date";

import { ATTENDEE_STATUS_OPTIONS } from "../catalog";
import {
  checkInAction,
  confirmRegistrationAction,
  exportAttendeesCsvAction,
} from "../actions";

/** Radix Select "hamısı" seçimi — boş sətir işlədilə bilmir. */
const ALL_VALUE = "__all__";

/** Cədvəldə göstərilən sətir — serverdən JSON kimi gəlir (tarixlər ISO sətri). */
export interface AttendeeTableRow {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  cohortRole: string | null;
  status: string;
  registeredAt: string | null;
  checkedInAt: string | null;
  rating: number | null;
}

type SortKey = "name" | "status" | "registeredAt";
type SortDirection = "asc" | "desc";

interface AttendeeTableProps {
  eventId: string;
  rows: AttendeeTableRow[];
  /** Serverdəki filtrə uyğun ÜMUMİ say (səhifələmə üçün). */
  total: number;
  pageSize: number;
}

/**
 * URL parserləri — açarlar `lib/event-filters.ts` → `ATTENDEE_PARAMS` ilə
 * EYNİDİR. Server komponenti eyni parametrləri `parseAttendeeParams` ilə
 * oxuyur; ayrılsalar cədvəl "işləyir, amma nəticə dəyişmir" olar.
 */
const ATTENDEE_PARSERS = {
  [ATTENDEE_PARAMS.search]: parseAsString,
  [ATTENDEE_PARAMS.status]: parseAsString,
  [ATTENDEE_PARAMS.page]: parseAsInteger,
};

export function AttendeeTable({ eventId, rows, total, pageSize }: AttendeeTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ⚠️ `shallow: false` — süzgəc DB-dədir, server komponenti yenidən işə
  // düşməlidir (kataloq filtrləri ilə eyni qayda).
  const [urlState, setUrlState] = useQueryStates(ATTENDEE_PARSERS, {
    shallow: false,
    clearOnDefault: true,
  });

  const search = (urlState[ATTENDEE_PARAMS.search] as string | null) ?? "";
  const status = (urlState[ATTENDEE_PARAMS.status] as string | null) ?? null;
  const page = (urlState[ATTENDEE_PARAMS.page] as number | null) ?? 1;

  const [draftSearch, setDraftSearch] = useState(search);
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [direction, setDirection] = useState<SortDirection>("asc");

  // URL xaricdən dəyişəndə (geri düyməsi) input sinxronlaşdırılır.
  useEffect(() => setDraftSearch(search), [search]);

  const onNavigate = useCallback(
    (next: { search?: string; status?: string | null; page?: number }) => {
      void setUrlState({
        ...(next.search === undefined
          ? {}
          : { [ATTENDEE_PARAMS.search]: next.search.trim() === "" ? null : next.search.trim() }),
        ...(next.status === undefined ? {} : { [ATTENDEE_PARAMS.status]: next.status }),
        ...(next.page === undefined
          ? {}
          : { [ATTENDEE_PARAMS.page]: next.page <= 1 ? null : next.page }),
      });
    },
    [setUrlState],
  );

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const sorted = useMemo(() => {
    const collator = new Intl.Collator("az");
    const factor = direction === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      if (sortKey === "name") {
        return (
          factor *
          (collator.compare(a.firstName, b.firstName) ||
            collator.compare(a.lastName, b.lastName))
        );
      }
      if (sortKey === "status") {
        return factor * (collator.compare(a.status, b.status) || collator.compare(a.lastName, b.lastName));
      }
      // Tarixi olmayan sətir HƏMİŞƏ sonda qalır (istiqamətdən asılı olmayaraq) —
      // "boş" dəyər çeşidləmənin başını tutmamalıdır.
      if (a.registeredAt === null && b.registeredAt === null) return 0;
      if (a.registeredAt === null) return 1;
      if (b.registeredAt === null) return -1;
      return factor * a.registeredAt.localeCompare(b.registeredAt);
    });
  }, [rows, sortKey, direction]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection("asc");
  }

  function runAction(promise: Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await promise;
      if (!result.ok) {
        toast.error(result.message ?? "Əməliyyat tamamlanmadı.");
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  /**
   * CSV endirilməsi.
   *
   * ⚠️ Fayl BRAUZERDƏ qurulur: server action yalnız MƏTNİ qaytarır, `Blob`
   * və `URL.createObjectURL` burada işlədilir. Belə olanda ayrıca route
   * handler və orada TƏKRAR icazə yoxlaması lazım gəlmir.
   */
  function exportCsv() {
    startTransition(async () => {
      const result = await exportAttendeesCsvAction({ eventId });

      if (!result.ok || !result.value) {
        toast.error(result.message ?? "İxrac alınmadı.");
        return;
      }

      // ⚠️ BOM BAYTLARI burada, `Blob`-un içində əlavə olunur — server action
      // yalnız MƏTNİ göndərir. Səbəb `lib/csv.ts` → `CSV_BOM_BYTES`-dədir:
      // U+FEFF simvolu mətn qatlarından keçəndə itir, bayt massivi itmir.
      const blob = new Blob([new Uint8Array(CSV_BOM_BYTES), result.value.content], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.value.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(`${result.value.fileName} endirildi.`);
    });
  }

  return (
    <section
      aria-labelledby="attendee-table"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="attendee-table" className="text-h4 font-medium text-text-primary">
            Dəvət olunanlar və qeydiyyatlar
          </h2>
          <p className="text-small text-text-secondary">{total} sətir</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={isPending}
          onClick={exportCsv}
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          CSV ixrac
        </Button>
      </div>

      {/* --- Axtarış + status filtri (SERVERDƏ tətbiq olunur) --- */}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onNavigate({ search: draftSearch, page: 1 });
        }}
      >
        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <Label htmlFor="attendee-search">Axtarış</Label>
          <Input
            id="attendee-search"
            type="search"
            value={draftSearch}
            placeholder="Ad, soyad və ya e-poçt"
            onChange={(event) => setDraftSearch(event.target.value)}
          />
        </div>

        <div className="flex min-w-[180px] flex-col gap-2">
          <Label htmlFor="attendee-status">Status</Label>
          <Select
            value={status ?? ALL_VALUE}
            onValueChange={(value) =>
              onNavigate({ status: value === ALL_VALUE ? null : value, page: 1 })
            }
          >
            <SelectTrigger id="attendee-status" className="rounded-input">
              <SelectValue placeholder="Bütün statuslar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Bütün statuslar</SelectItem>
              {ATTENDEE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {rsvpStatusLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" variant="outline" className="gap-2">
          <Search className="h-4 w-4" aria-hidden />
          Axtar
        </Button>
      </form>

      {/* --- Cədvəl --- */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="Sətir tapılmadı"
          description="Axtarış sözünü və ya status filtrini dəyişin."
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead
                  label="İştirakçı"
                  active={sortKey === "name"}
                  direction={direction}
                  onClick={() => toggleSort("name")}
                />
                <TableHead>E-poçt</TableHead>
                <TableHead>Sinifdəki rol</TableHead>
                <SortableHead
                  label="Status"
                  active={sortKey === "status"}
                  direction={direction}
                  onClick={() => toggleSort("status")}
                />
                <SortableHead
                  label="Qeydiyyat"
                  active={sortKey === "registeredAt"}
                  direction={direction}
                  onClick={() => toggleSort("registeredAt")}
                />
                <TableHead>Check-in</TableHead>
                <TableHead className="text-right">Əməliyyat</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell className="font-medium text-text-primary">
                    {row.firstName} {row.lastName}
                  </TableCell>
                  <TableCell className="text-text-secondary">{row.email}</TableCell>
                  <TableCell className="text-text-secondary">
                    {row.cohortRole === null ? "—" : cohortRoleLabel(row.cohortRole)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-caption font-normal",
                        row.status === RsvpStatus.WAITLISTED &&
                          "border-warning bg-warning/20 text-text-primary",
                        row.status === RsvpStatus.ATTENDED &&
                          "border-success text-success-strong",
                      )}
                    >
                      {rsvpStatusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {row.registeredAt === null ? "—" : shortDate(row.registeredAt)}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {row.checkedInAt === null ? "—" : shortDate(row.checkedInAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {row.status === RsvpStatus.WAITLISTED ||
                      row.status === RsvpStatus.INVITED ||
                      row.status === RsvpStatus.ACCEPTED ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            runAction(
                              confirmRegistrationAction({ eventId, userId: row.userId }),
                            )
                          }
                        >
                          Təsdiqlə
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`${row.firstName} ${row.lastName} — iştirak etdi`}
                        disabled={isPending || row.status === RsvpStatus.ATTENDED}
                        onClick={() =>
                          runAction(
                            checkInAction({ eventId, userId: row.userId, attended: true }),
                          )
                        }
                      >
                        <Check className="h-4 w-4" aria-hidden />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-danger-strong"
                        aria-label={`${row.firstName} ${row.lastName} — gəlmədi`}
                        disabled={isPending || row.status === RsvpStatus.NO_SHOW}
                        onClick={() =>
                          runAction(
                            checkInAction({ eventId, userId: row.userId, attended: false }),
                          )
                        }
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* --- Səhifələmə --- */}
      {pageCount > 1 ? (
        <nav
          aria-label="İştirakçı səhifələri"
          className="flex items-center justify-between gap-3"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onNavigate({ page: page - 1 })}
          >
            Əvvəlki
          </Button>

          <span className="text-small text-text-secondary" aria-live="polite">
            {page} / {pageCount}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => onNavigate({ page: page + 1 })}
          >
            Növbəti
          </Button>
        </nav>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Çeşidlənə bilən sütun başlığı
// ---------------------------------------------------------------------------

function SortableHead({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        // ⚠️ `aria-sort` `<th>`-ə yazılmalıdır, düyməyə yox — amma shadcn
        // `TableHead` propları ötürdüyü üçün onu birbaşa `TableHead`-ə vermək
        // olardı. Sadəlik üçün düymədə `aria-label` işlədilir.
        aria-label={`${label} sütununa görə çeşidlə`}
        // 🔴 `min-h-6` (24px) — WCAG 2.2 AA SC 2.5.8 «Target Size (Minimum)».
        // Blok 12D-də ölçüldü: düymə 73×**21**px idi, yəni QAPI pozuntusu.
        // `text-small` sətir hündürlüyü 21px verir və düymədə dolğu yoxdur;
        // «Inline» istisnası da işləmir — cədvəl başlığında hədəf olmayan
        // qonşu mətn yoxdur. Ölçü `src/components/ui/` -də deyil, BURADA
        // düzəlir (primitiv toxunulmazdır, bu düymə bizimdir).
        className="flex min-h-6 items-center gap-1 text-small font-medium text-text-primary hover:text-ku-green"
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden />
      </button>
    </TableHead>
  );
}
