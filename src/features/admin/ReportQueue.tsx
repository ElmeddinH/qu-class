// ============================================================================
// src/features/admin/ReportQueue.tsx
// `/admin/moderation` — şikayət növbəsi (spec §17).
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ A — BU EKRAN ŞİKAYƏT OLUNAN MƏZMUNU GÖSTƏRMİR
// ────────────────────────────────────────────────────────────────────────────
// Sətirdə YALNIZ: şikayətçi · səbəb · şikayətçinin detalı · tarix · hədəfin
// NÖVÜ + `id`-si + GÖRÜNÜRLÜK SƏVİYYƏSİ. Mətn `listReportQueue`-nin cavabında
// ÜMUMİYYƏTLƏ YOXDUR (servis onu sorğulamır), yəni burada «səhvən göstərmək»
// mümkün deyil.
//
// Məzmuna çıxış `ReportActions` → «Moderasiya baxışı» düyməsindəndir və o yol
// AuditLog yazmadan açılmır.
//
// ⚠️ `ACCESSIBILITY` qeydləri AYRI VİZUAL TONDADIR (`ku-blue` zolaq): onlarda
// `entityId` DB sətri deyil, SƏHİFƏ YOLUDUR (Blok 11A qərarı) və qeyd «məzmunu
// gizlət» ilə həll olunmur — texniki nasazlıq biletidir.
//
// ⚠️ TOPLU ƏMƏLİYYAT (Blok 12B) client adasındadır (`BulkModeration.tsx`):
// seçim vəziyyəti brauzerdədir, siyahı isə SERVERDƏ render olunmağa davam edir
// (TƏLƏ A qorunur — məzmun cavaba düşmür). Yalnız AÇIQ şikayətlər seçilə bilir.
// ============================================================================

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { MemberIdentity } from "@/components/shared/MemberIdentity";
import { PagerNav } from "@/components/shared/PagerNav";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Badge } from "@/components/ui/badge";
import {
  MODERATION_PAGE_SIZE,
  adminPageCount,
  adminSkipOf,
  moderationHref,
  type ModerationFilterState,
} from "@/lib/admin-filters";
import { getViewer } from "@/lib/auth";
import { ReportStatus } from "@/lib/enums";
import {
  reportEntityTypeLabel,
  reportReasonLabel,
  reportStatusLabel,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import {
  countReportQueue,
  countReportsByStatus,
  isAccessibilityReport,
  listReportQueue,
  type ReportQueueItem,
} from "@/services/moderation.service";
import { exactDateTime } from "@/utils/date";

import { AdminPageHeader } from "./AdminPageHeader";
import {
  BulkActionBar,
  ModerationSelectionProvider,
  ReportSelectCheckbox,
} from "./BulkModeration";
import { ReportActions } from "./ReportActions";
import { ReportFilters } from "./ReportFilters";

const HIDEABLE_TYPES: readonly string[] = ["POST", "COMMENT", "MEMORY"];
const CLOSED_STATUSES: readonly string[] = [ReportStatus.RESOLVED, ReportStatus.REJECTED];

interface ReportQueueProps {
  filters: ModerationFilterState;
}

export async function ReportQueue({ filters }: ReportQueueProps) {
  const viewer = await getViewer();
  const skip = adminSkipOf(filters.page, MODERATION_PAGE_SIZE);

  const [items, total, counts] = await Promise.all([
    listReportQueue(viewer, filters, MODERATION_PAGE_SIZE, skip),
    countReportQueue(viewer, filters),
    countReportsByStatus(viewer),
  ]);

  const pageCount = adminPageCount(total, MODERATION_PAGE_SIZE);

  // Yalnız AÇIQ şikayətlər toplu əməliyyata girə bilər — bağlanmış status
  // geri açılmır (`decideReport` → `ALREADY_CLOSED`).
  const selectableIds = items
    .filter((item) => !CLOSED_STATUSES.includes(item.status))
    .map((item) => item.id);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Şikayət növbəsi"
        description="Növbə şikayətin ÖZÜNÜ göstərir, şikayət olunan məzmunu yox. Məzmun «Moderasiya baxışı» düyməsi ilə açılır və hər açılış audit jurnalına yazılır."
      />

      <ReportFilters filters={filters} counts={counts} />

      {items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Bu filtrlərlə şikayət yoxdur"
          description="Filtrləri dəyişin və ya bütün statusları göstərin."
          action={{ href: "/admin/moderation", label: "Filtrləri sıfırla" }}
        />
      ) : (
        <ModerationSelectionProvider selectableIds={selectableIds}>
          <p className="text-small text-text-secondary">
            {total} şikayət · səhifə {Math.min(filters.page, pageCount)} / {pageCount}
          </p>

          <BulkActionBar />

          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <ReportRow key={item.id} item={item} />
            ))}
          </ul>

          <PagerNav
            page={filters.page}
            pageCount={pageCount}
            hrefFor={(page) => moderationHref({ ...filters, page })}
            label="Şikayət səhifələri"
          />
        </ModerationSelectionProvider>
      )}
    </div>
  );
}

function ReportRow({ item }: { item: ReportQueueItem }) {
  const accessibility = isAccessibilityReport(item.entityType);
  const closed = CLOSED_STATUSES.includes(item.status);

  return (
    <li
      className={cn(
        "flex flex-col gap-4 rounded-card border bg-surface p-6 shadow-sm-kuds",
        // ⚠️ Əlçatanlıq bileti AYRI TONDADIR — moderator onu məzmun şikayəti
        // ilə qarışdırmamalıdır (fərqli həll yolu, fərqli düymələr).
        accessibility ? "border-ku-blue bg-ku-blue/20" : "border-border",
      )}
    >
      {/* Bağlanmış şikayət seçilə bilmir — serverin rədd edəcəyi seçimi
          UI-da mümkün göstərmək mənasız gözləntidir (qoruma yenə serverdədir). */}
      {closed ? null : (
        <ReportSelectCheckbox
          reportId={item.id}
          label={`Toplu əməliyyat üçün seç — ${reportEntityTypeLabel(item.entityType)}`}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {reportEntityTypeLabel(item.entityType)}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {reportReasonLabel(item.reason)}
            </Badge>
            <Badge variant="outline" className="font-normal">
              {reportStatusLabel(item.status)}
            </Badge>

            {/* Hədəfin GÖRÜNÜRLÜK SƏVİYYƏSİ — məzmunu açmadan prioritet qurmaq
                üçün. Səviyyə var, mətn yoxdur. */}
            {item.target.visibility === null ? null : (
              <VisibilityBadge level={item.target.visibility} />
            )}

            {item.target.exists ? null : (
              <Badge variant="outline" className="font-normal">
                Obyekt silinib
              </Badge>
            )}
          </div>

          {/* ⚠️ Bu, ŞİKAYƏTÇİNİN öz mətnidir — şikayət olunan məzmun DEYİL. */}
          {item.details === null ? null : (
            <p className="text-small text-text-primary">{item.details}</p>
          )}

          <p className="text-caption text-text-secondary">
            {accessibility ? (
              <>
                Səhifə:{" "}
                <Link href={item.entityId} className="text-ku-green hover:underline">
                  {item.entityId}
                </Link>
              </>
            ) : (
              <>Obyekt id: {item.entityId}</>
            )}
            {" · "}
            {exactDateTime(item.createdAt)}
          </p>

          {item.resolution === null ? null : (
            <p className="text-caption text-text-secondary">
              Qərar: {item.resolution}
              {item.resolvedBy === null
                ? ""
                : ` — ${item.resolvedBy.firstName} ${item.resolvedBy.lastName}`}
            </p>
          )}
        </div>

        <MemberIdentity
          id={item.reporter.id}
          firstName={item.reporter.firstName}
          lastName={item.reporter.lastName}
          avatarUrl={item.reporter.avatarUrl}
          subtitle="Şikayətçi"
        />
      </div>

      <ReportActions
        reportId={item.id}
        closed={closed}
        accessibility={accessibility}
        hideable={HIDEABLE_TYPES.includes(item.entityType)}
        targetExists={item.target.exists}
      />
    </li>
  );
}
