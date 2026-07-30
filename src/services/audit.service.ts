// ============================================================================
// src/services/audit.service.ts
// Audit jurnalı — YALNIZ ƏLAVƏ OLUNUR (append-only).
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ D — BU MODULDA `delete` / `update` FUNKSİYASI YOXDUR VƏ OLMAYACAQ
// ────────────────────────────────────────────────────────────────────────────
// Audit jurnalını silə bilən admin auditin ÖZÜNÜ mənasız edir: səhv (və ya
// qəsdli) əməliyyatdan sonra izi təmizləmək mümkün olsaydı, jurnal yalnız
// "unudulmamış" hadisələri göstərərdi və heç bir sual ona istinad edə bilməzdi.
//
// Qadağa ÜÇ QATDA saxlanılır:
//   1. bu modul silmə/redaktə funksiyası İXRAC ETMİR (`audit.service.test.ts`
//      modul ixraclarını gəzib bunu bərkidir);
//   2. `/admin/audit` səhifəsi YALNIZ oxu formasıdır — düymə yoxdur;
//   3. `/api/v1/admin/audit` yalnız `GET` ixrac edir — `POST` / `DELETE`
//      route-u mövcud deyil (`openapi.test.ts` yoxlayır).
//
// ⚠️ `prisma.auditLog.deleteMany()` seed-də İŞLƏDİLİR (`prisma/seed.ts` bazanı
// təmizləyir) və bu, istisna deyil — seed servis qatından keçmir, bazanı
// sıfırdan qurur. Tətbiq içində belə çağırış YOXDUR.
//
// ────────────────────────────────────────────────────────────────────────────
// `metadata` — AĞ SİYAHI
// ────────────────────────────────────────────────────────────────────────────
// `recordAudit` metadata-nı `safeAuditMetadata()`-dan keçirir: jurnal
// `/admin/audit`-də GÖSTƏRİLİR, yəni ora yazılan mətn adminə göstərilən mətndir.
// Şikayət edilmiş `PRIVATE` paylaşımın gövdəsi metadata-ya düşsəydi, məzmun
// moderasiya qapısından YAN KEÇİB jurnalda peyda olardı (bax TƏLƏ A).
// ============================================================================

import type { Prisma, PrismaClient } from "@prisma/client";

import { AUDIT_PAGE_SIZE, auditDateRange, type AuditFilterState } from "@/lib/admin-filters";
import { safeAuditMetadata, type AuditMetadataKey } from "@/lib/admin-rules";
import { assertFreshAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/db";
import type { AuditAction } from "@/lib/enums";
import type { Viewer } from "@/lib/visibility";

/**
 * Transaksiya klienti — `prisma.$transaction(async (tx) => …)` içindəki obyekt.
 * Audit sətri HƏR ZAMAN əməliyyatla EYNİ transaksiyada yazılmalıdır, ona görə
 * `recordAudit` `tx`-i arqument kimi alır.
 */
export type AuditClient = Prisma.TransactionClient | PrismaClient;

export interface AuditInput {
  actorId: string | null;
  action: AuditAction;
  /** Model adı (`Report`, `User`, `Cohort`…) və ya enum dəyəri. */
  entityType: string;
  entityId: string;
  metadata?: Partial<Record<AuditMetadataKey, unknown>>;
}

/**
 * Audit sətri yazır. TƏK YAZMA YOLUDUR.
 *
 * ⚠️ Çağıran tərəf `tx`-i ötürməlidir — audit ilə əməliyyat ATOMİK olmalıdır.
 * Ayrı yazılsaydı, əməliyyat uğurlu olub audit sətri sınan hal mümkün olardı
 * (və ya əksi: jurnalda baş verməmiş hadisə).
 */
export async function recordAudit(tx: AuditClient, input: AuditInput): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata:
        input.metadata === undefined
          ? null
          : JSON.stringify(safeAuditMetadata(input.metadata)),
    },
  });
}

// ---------------------------------------------------------------------------
// Oxu səthi
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  /** XAM JSON sətri — parse UI-da, `parseAuditMetadata` ilə (sınmır). */
  metadata: string | null;
  createdAt: Date;
  actor: { id: string; firstName: string; lastName: string; email: string } | null;
}

const AUDIT_SELECT = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true,
  actor: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.AuditLogSelect;

/** Siyahı və sayın ORTAQ şərti — ikisi ayrılsa "N nəticə" yalan olar. */
function auditWhere(filters: AuditFilterState): Prisma.AuditLogWhereInput {
  const range = auditDateRange(filters);

  return {
    AND: [
      ...(filters.actor !== null ? [{ actorId: filters.actor }] : []),
      ...(filters.entityType !== null ? [{ entityType: filters.entityType }] : []),
      ...(filters.action !== null ? [{ action: filters.action }] : []),
      ...(range.gte !== undefined || range.lt !== undefined
        ? [{ createdAt: range }]
        : []),
    ],
  };
}

/**
 * Audit jurnalı — filtr + səhifələmə.
 *
 * ⚠️ Görünürlük mühərriki BURADA İŞLƏMİR və bu, qəsdəndir: `AuditLog`-un
 * `visibility` sütunu yoxdur, çünki o, istifadəçi məzmunu deyil — sistemin öz
 * qeydidir. Qapı TAM olaraq `assertFreshAdmin`-dir.
 */
export async function listAuditLog(
  viewer: Viewer,
  filters: AuditFilterState,
  take: number = AUDIT_PAGE_SIZE,
  skip = 0,
): Promise<AuditEntry[]> {
  await assertFreshAdmin(viewer);

  return prisma.auditLog.findMany({
    where: auditWhere(filters),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    skip,
    select: AUDIT_SELECT,
  });
}

export async function countAuditLog(
  viewer: Viewer,
  filters: AuditFilterState,
): Promise<number> {
  await assertFreshAdmin(viewer);
  return prisma.auditLog.count({ where: auditWhere(filters) });
}

export interface AuditFacets {
  actors: Array<{ id: string; label: string; count: number }>;
  entityTypes: Array<{ value: string; count: number }>;
  actions: Array<{ value: string; count: number }>;
}

/**
 * Filtr seçimləri — DB-dən.
 *
 * 🔴 `entityType` ENUM-DAN GƏLMİR. `AuditLog.entityType` tarixən model adlarını
 * daşıyır (`Post`, `Cohort`, `CohortMembership`, `Report`) və Blok 8-in
 * nailiyyət qərarları oraya enum dəyəri (`ACHIEVEMENT`) yazır. Sabit siyahı
 * yazsaydıq mövcud sətirlərin bir hissəsi filtrdə görünməzdi — facet DB-dən
 * oxunur və həmişə HƏQİQƏTİ göstərir.
 */
export async function listAuditFacets(viewer: Viewer): Promise<AuditFacets> {
  await assertFreshAdmin(viewer);

  const [entityGroups, actionGroups, actorGroups] = await Promise.all([
    prisma.auditLog.groupBy({ by: ["entityType"], _count: { _all: true } }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true } }),
    prisma.auditLog.groupBy({ by: ["actorId"], _count: { _all: true } }),
  ]);

  const actorIds = actorGroups
    .map((group) => group.actorId)
    .filter((id): id is string => id !== null);

  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const nameById = new Map(actors.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

  return {
    actors: actorGroups
      .filter((group) => group.actorId !== null)
      .map((group) => ({
        id: group.actorId as string,
        label: nameById.get(group.actorId as string) ?? "Silinmiş istifadəçi",
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "az")),
    entityTypes: entityGroups
      .map((group) => ({ value: group.entityType, count: group._count._all }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    actions: actionGroups
      .map((group) => ({ value: group.action, count: group._count._all }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
  };
}

/** Dashboard-un «son hadisələr» zolağı — filtr yoxdur, sadəcə ən yenilər. */
export async function listRecentAudit(
  viewer: Viewer,
  take = 10,
): Promise<AuditEntry[]> {
  await assertFreshAdmin(viewer);

  return prisma.auditLog.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: AUDIT_SELECT,
  });
}
