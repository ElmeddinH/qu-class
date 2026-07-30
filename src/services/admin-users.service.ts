// ============================================================================
// src/services/admin-users.service.ts
// İstifadəçi və rol idarəsi (spec §17, KUDS §14 cədvəl tələbləri).
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ C — ADMİN ÖZÜNÜ KİLİDLƏYƏ BİLƏR
// ────────────────────────────────────────────────────────────────────────────
// Üç qoruma SERVERDƏ tətbiq olunur (UI-da düymə gizlətmək qoruma deyil):
//   1. admin ÖZ sistem rolunu endirə bilməz
//   2. SONUNCU `UNIVERSITY_ADMIN` endirilə bilməz
//   3. admin öz hesabını deaktiv edə bilməz
//
// Qaydaların özü SAF funksiyalardadır (`lib/admin-rules.ts`) və orada hər
// kombinasiya üçün testlə örtülüb; burada yalnız DB kontekstı yığılır.
//
// 🔴 `adminCount` TRANSAKSİYANIN İÇİNDƏN oxunur. Kənarda oxusaydıq iki eyni
// anlı sorğu (son iki admini paralel endirmək) hər ikisi "2 admin var" görüb
// keçərdi və sistemdə admin qalmazdı — klassik TOCTOU. SQLite tək yazıcıya
// icazə verdiyi üçün transaksiya bunu praktikada da bağlayır.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 CSV EXPORT — ADMİN OLMAQ `PRIVATE` TELEFONU GÖRMƏK DEYİL
// ────────────────────────────────────────────────────────────────────────────
// İxrac edilən sütunlar AĞ SİYAHIDIR (`ADMIN_USER_EXPORT_COLUMNS`) və idarə
// olunan profil sahələri həmin siyahıya BİRBAŞA yazılmır — onlar
// `redactProfile(user, viewer, fieldVisibility)`-dən keçir. Yəni `PRIVATE`
// telefon, `CLASS` səviyyəli şəhər (admin həmin sinifdə deyilsə) ixracda BOŞ
// qalır. `phone` / `personalEmail` ÜMUMİYYƏTLƏ sorğulanmır.
// ============================================================================

import type { Prisma } from "@prisma/client";

import {
  ADMIN_USER_PAGE_SIZE,
  type AdminUserFilterState,
  type AdminUserSort,
} from "@/lib/admin-filters";
import { assertFreshAdmin } from "@/lib/admin-guard";
import {
  ADMIN_RULE_MESSAGES,
  checkDeactivation,
  checkSystemRoleChange,
  type AdminRuleRejection,
} from "@/lib/admin-rules";
import { prisma } from "@/lib/db";
import {
  AuditAction,
  CohortRole,
  NotificationType,
  SystemRole,
  SystemRoleSchema,
  type CohortRole as CohortRoleValue,
  type SystemRole as SystemRoleValue,
} from "@/lib/enums";
import { cohortRoleLabel, stageLabel } from "@/lib/labels";
import { resolveStage } from "@/lib/stage";
import { tokenizedContains } from "@/lib/text-search";
import { redactProfile, type ProfileView, type Viewer } from "@/lib/visibility";
import { recordAudit } from "@/services/audit.service";

// ---------------------------------------------------------------------------
// Siyahı
// ---------------------------------------------------------------------------

export interface AdminUserCohort {
  id: string;
  slug: string;
  displayName: string;
  role: string;
  /** Cohort tarixlərindən HESABLANIR — `User.stage` keşinə güvənilmir. */
  stage: string;
}

export interface AdminUserRow {
  id: string;
  firstName: string;
  lastName: string;
  /** Universitet e-poçtu — idarə olunan profil sahəsi DEYİL (hesab açarıdır). */
  email: string;
  avatarUrl: string | null;
  systemRole: string;
  deactivatedAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  cohorts: AdminUserCohort[];
  /** `redactProfile`-dan keçmiş şəhər — görünmürsə `null`. */
  currentCity: string | null;
}

const ADMIN_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  systemRole: true,
  deactivatedAt: true,
  createdAt: true,
  lastSeenAt: true,
  currentCity: true,
  fieldVisibility: { select: { field: true, level: true } },
  memberships: {
    select: {
      role: true,
      cohortId: true,
      cohort: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          academicStartsAt: true,
          graduatesAt: true,
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { joinedAt: "desc" }],
  },
} satisfies Prisma.UserSelect;

type AdminUserDbRow = Prisma.UserGetPayload<{ select: typeof ADMIN_USER_SELECT }>;

const SORT_ORDER: Record<AdminUserSort, Prisma.UserOrderByWithRelationInput[]> = {
  name: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
  email: [{ email: "asc" }, { id: "asc" }],
  recent: [{ createdAt: "desc" }, { id: "desc" }],
  stage: [{ stage: "asc" }, { firstName: "asc" }, { id: "asc" }],
};

function adminUserWhere(filters: AdminUserFilterState): Prisma.UserWhereInput {
  const search =
    filters.q === null
      ? null
      : // 🔴 TƏLƏ T14 — SQLite hərf həssaslığı; `foldForSearch`/`textVariants`
        // azərbaycan hərflərinin böyük-kiçik variantlarını qurur.
        tokenizedContains<Prisma.UserWhereInput>(
          ["firstName", "lastName", "email"],
          filters.q,
        );

  return {
    AND: [
      ...(search !== null ? [search] : []),
      ...(filters.role !== null ? [{ systemRole: filters.role }] : []),
      ...(filters.cohort !== null
        ? [{ memberships: { some: { cohort: { slug: filters.cohort } } } }]
        : []),
      // ⚠️ Mərhələ `User.stage` KEŞİNƏ görə süzülür və bu, kataloqdakı
      // davranışdan (cohort tarixləri) FƏRQLİDİR — səbəb: admin cədvəli
      // 125 istifadəçi üzərində işləyir və keşin nə vaxt köhnəldiyini
      // GÖRMƏK admin üçün faydalıdır (sütunda hesablanmış dəyər göstərilir).
      ...(filters.stage !== null ? [{ stage: filters.stage }] : []),
    ],
  };
}

function toAdminUserRow(row: AdminUserDbRow, viewer: Viewer, now: Date): AdminUserRow {
  // 🔴 Şəhər `redactProfile`-dan KEÇİR: admin olmaq `CLASS` səviyyəli sahəni
  // görmək demək deyil (bax fayl başlığı).
  const profile: ProfileView = {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    cohortIds: row.memberships.map((m) => m.cohortId),
    currentCity: row.currentCity,
  };
  const redacted = redactProfile(profile, viewer, row.fieldVisibility);

  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    avatarUrl: row.avatarUrl,
    systemRole: row.systemRole,
    deactivatedAt: row.deactivatedAt,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    currentCity: (redacted.currentCity as string | null | undefined) ?? null,
    cohorts: row.memberships.map((m) => ({
      id: m.cohort.id,
      slug: m.cohort.slug,
      displayName: m.cohort.displayName,
      role: m.role,
      stage: resolveStage(
        { academicStartsAt: m.cohort.academicStartsAt, graduatesAt: m.cohort.graduatesAt },
        now,
      ),
    })),
  };
}

export interface AdminUserPage {
  items: AdminUserRow[];
  total: number;
}

/** İstifadəçi cədvəli — axtarış · filtr · çeşidləmə · səhifələmə (KUDS §14). */
export async function listAdminUsers(
  viewer: Viewer,
  filters: AdminUserFilterState,
  take: number = ADMIN_USER_PAGE_SIZE,
  skip = 0,
  now: Date = new Date(),
): Promise<AdminUserPage> {
  const admin = await assertFreshAdmin(viewer);
  const where = adminUserWhere(filters);

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: SORT_ORDER[filters.sort],
      take,
      skip,
      select: ADMIN_USER_SELECT,
    }),
  ]);

  return { items: rows.map((row) => toAdminUserRow(row, admin, now)), total };
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/**
 * İxrac sütunları — AĞ SİYAHI.
 *
 * 🔴 `phone` / `personalEmail` BURADA YOXDUR və `ADMIN_USER_SELECT`-də də
 * SORĞULANMIR. Onların defolt səviyyəsi `PRIVATE`-dir, yəni `redactProfile`
 * onları onsuz da atardı — amma sorğulanmaması daha güclü zəmanətdir: sahə
 * yaddaşa belə gəlmir.
 */
export const ADMIN_USER_EXPORT_COLUMNS = [
  "Ad",
  "Soyad",
  "Universitet e-poçtu",
  "Sistem rolu",
  "Sinif",
  "Sinif rolu",
  "Mərhələ",
  "Şəhər",
  "Qeydiyyat tarixi",
  "Status",
] as const;

const EXPORT_LIMIT = 2000;

/** Cədvəlin CSV sətirləri — `lib/csv.ts` → `buildCsv` üçün hazır. */
export async function exportAdminUsers(
  viewer: Viewer,
  filters: AdminUserFilterState,
  now: Date = new Date(),
): Promise<{ headers: readonly string[]; rows: string[][] }> {
  const { items } = await listAdminUsers(viewer, filters, EXPORT_LIMIT, 0, now);

  const rows = items.map((user) => {
    const primary = user.cohorts[0] ?? null;

    return [
      user.firstName,
      user.lastName,
      user.email,
      user.systemRole === SystemRole.UNIVERSITY_ADMIN ? "Administrator" : "İstifadəçi",
      primary?.displayName ?? "",
      primary === null ? "" : cohortRoleLabel(primary.role),
      primary === null ? "" : stageLabel(primary.stage),
      user.currentCity ?? "",
      user.createdAt.toISOString().slice(0, 10),
      user.deactivatedAt === null ? "Aktiv" : "Deaktiv",
    ];
  });

  return { headers: ADMIN_USER_EXPORT_COLUMNS, rows };
}

// ---------------------------------------------------------------------------
// Rol dəyişikliyi (TƏLƏ B + C)
// ---------------------------------------------------------------------------

export type AdminUserFailure = "NOT_FOUND" | AdminRuleRejection;

export type AdminUserResult<T> = { ok: true; value: T } | { ok: false; reason: AdminUserFailure };

export const ADMIN_USER_MESSAGES: Record<AdminUserFailure, string> = {
  NOT_FOUND: "İstifadəçi tapılmadı.",
  ...ADMIN_RULE_MESSAGES,
};

/**
 * Sistem rolunu dəyişir.
 *
 * TƏK TRANSAKSİYA:
 *   1. admin sayı transaksiya İÇİNDƏ oxunur (TOCTOU — fayl başlığı)
 *   2. qayda yoxlanılır (`checkSystemRoleChange`) — pozulubsa ROLLBACK
 *   3. `User.systemRole`
 *   4. AuditLog (köhnə → yeni)
 *   5. hədəfə Notification
 *
 * 🔴 TƏLƏ B — DƏYİŞİKLİK DƏRHAL QÜVVƏYƏ MİNMİR (JWT). Hədəfin brauzerindəki
 * token hələ köhnə rolu daşıyır və middleware ONA baxır. Buna görə:
 *   · server tərəfdə qapı `readSystemRole()` (DB) ilə bərkidilib — köhnə token
 *     `/admin`-i AÇA BİLMİR, yalnız yönləndirməni gecikdirə bilər;
 *   · istifadəçiyə bildiriş göndərilir və UI-da izah göstərilir.
 */
export async function changeSystemRole(
  viewer: Viewer,
  input: { targetId: string; nextRole: SystemRoleValue },
): Promise<AdminUserResult<{ targetId: string; from: string; to: string }>> {
  const admin = await assertFreshAdmin(viewer);

  const target = await prisma.user.findUnique({
    where: { id: input.targetId },
    select: {
      id: true,
      systemRole: true,
      firstName: true,
      lastName: true,
      deactivatedAt: true,
    },
  });
  if (!target) return { ok: false, reason: "NOT_FOUND" };

  const currentRole = SystemRoleSchema.catch(SystemRole.USER).parse(target.systemRole);

  let rejection: AdminRuleRejection | null = null;

  await prisma.$transaction(async (tx) => {
    // (1) SAY TRANSAKSİYA İÇİNDƏ — bax fayl başlığındakı TOCTOU qeydi.
    const adminCount = await tx.user.count({
      where: { systemRole: SystemRole.UNIVERSITY_ADMIN, deactivatedAt: null },
    });

    rejection = checkSystemRoleChange({
      actorId: admin.userId,
      targetId: target.id,
      currentRole,
      nextRole: input.nextRole,
      adminCount,
      targetIsActive: target.deactivatedAt === null,
    });
    if (rejection !== null) return;

    await tx.user.update({
      where: { id: target.id },
      data: { systemRole: input.nextRole },
    });

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.ROLE_CHANGE,
      entityType: "User",
      entityId: target.id,
      metadata: {
        operation: "changeSystemRole",
        from: currentRole,
        to: input.nextRole,
        targetId: target.id,
      },
    });

    await tx.notification.create({
      data: {
        recipientId: target.id,
        actorId: admin.userId,
        type: NotificationType.SYSTEM,
        title:
          input.nextRole === SystemRole.UNIVERSITY_ADMIN
            ? "Sizə administrator səlahiyyəti verildi"
            : "Administrator səlahiyyətiniz ləğv edildi",
        body:
          "Dəyişiklik növbəti girişdə tam qüvvəyə minir — cari sessiyanız köhnə " +
          "məlumatı daşıya bilər.",
      },
    });
  });

  if (rejection !== null) return { ok: false, reason: rejection };

  return {
    ok: true,
    value: { targetId: target.id, from: currentRole, to: input.nextRole },
  };
}

/**
 * Cohort daxilindəki rolu dəyişir.
 *
 * ⚠️ Sistem rolundan FƏRQLİDİR və qarışdırılmamalıdır: cohort rolu YALNIZ
 * həmin sinifdə keçərlidir (CLAUDE.md «Rollar»). "Son admin" qoruması burada
 * TƏTBİQ EDİLMİR — sinifdə moderator qalmaması sistemi kilidləmir.
 */
export async function changeCohortRole(
  viewer: Viewer,
  input: { targetId: string; cohortId: string; nextRole: CohortRoleValue },
): Promise<AdminUserResult<{ targetId: string; from: string; to: string }>> {
  const admin = await assertFreshAdmin(viewer);

  const membership = await prisma.cohortMembership.findUnique({
    where: { userId_cohortId: { userId: input.targetId, cohortId: input.cohortId } },
    select: { id: true, role: true, cohort: { select: { displayName: true, slug: true } } },
  });
  if (!membership) return { ok: false, reason: "NOT_FOUND" };
  if (membership.role === input.nextRole) return { ok: false, reason: "ALREADY_APPLIED" };

  await prisma.$transaction(async (tx) => {
    await tx.cohortMembership.update({
      where: { id: membership.id },
      data: { role: input.nextRole },
    });

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.ROLE_CHANGE,
      entityType: "CohortMembership",
      entityId: membership.id,
      metadata: {
        operation: "changeCohortRole",
        from: membership.role,
        to: input.nextRole,
        targetId: input.targetId,
        cohortId: input.cohortId,
      },
    });

    await tx.notification.create({
      data: {
        recipientId: input.targetId,
        actorId: admin.userId,
        type: NotificationType.SYSTEM,
        title: "Sinif rolunuz dəyişdi",
        body: `${membership.cohort.displayName}: ${cohortRoleLabel(
          input.nextRole,
        )} təyin edildiniz.`,
        url: `/class/${membership.cohort.slug}`,
      },
    });
  });

  return {
    ok: true,
    value: { targetId: input.targetId, from: membership.role, to: input.nextRole },
  };
}

/**
 * Hesabı deaktiv edir / bərpa edir.
 *
 * 🔴 SİLMƏ YOXDUR: `User` silinsə cascade onun bütün məzmununu aparardı və
 * SİNFİN xronologiyasından başqalarının da xatirəsi yox olardı (bax
 * `lib/admin-rules.ts` → `checkDeactivation`).
 *
 * Deaktivasiya İKİ QAT işləyir:
 *   · giriş rədd olunur (`src/auth.ts`)
 *   · açıq sessiya növbəti sorğuda bağlanır (`getSessionUser` → `null` →
 *     layout `SESSION_EXPIRED_PATH`-ə yönləndirir və kukanı silir)
 */
export async function setUserActivation(
  viewer: Viewer,
  input: { targetId: string; deactivate: boolean },
): Promise<AdminUserResult<{ targetId: string; deactivated: boolean }>> {
  const admin = await assertFreshAdmin(viewer);

  const target = await prisma.user.findUnique({
    where: { id: input.targetId },
    select: { id: true, systemRole: true, deactivatedAt: true },
  });
  if (!target) return { ok: false, reason: "NOT_FOUND" };

  const targetRole = SystemRoleSchema.catch(SystemRole.USER).parse(target.systemRole);
  let rejection: AdminRuleRejection | null = null;

  await prisma.$transaction(async (tx) => {
    if (input.deactivate) {
      const adminCount = await tx.user.count({
        where: { systemRole: SystemRole.UNIVERSITY_ADMIN, deactivatedAt: null },
      });

      rejection = checkDeactivation({
        actorId: admin.userId,
        targetId: target.id,
        targetRole,
        adminCount,
        alreadyDeactivated: target.deactivatedAt !== null,
      });
      if (rejection !== null) return;
    } else if (target.deactivatedAt === null) {
      rejection = "ALREADY_APPLIED";
      return;
    }

    await tx.user.update({
      where: { id: target.id },
      data: { deactivatedAt: input.deactivate ? new Date() : null },
    });

    await recordAudit(tx, {
      actorId: admin.userId,
      action: AuditAction.UPDATE,
      entityType: "User",
      entityId: target.id,
      metadata: {
        operation: input.deactivate ? "deactivateUser" : "reactivateUser",
        from: target.deactivatedAt === null ? "ACTIVE" : "DEACTIVATED",
        to: input.deactivate ? "DEACTIVATED" : "ACTIVE",
        targetId: target.id,
      },
    });

    // ⚠️ Bərpada bildiriş göndərilir; deaktivasiyada da göndərilir, çünki
    // istifadəçi hesabını geri istəyə bilər və bildiriş tarixçəsi qalır.
    await tx.notification.create({
      data: {
        recipientId: target.id,
        actorId: admin.userId,
        type: NotificationType.SYSTEM,
        title: input.deactivate ? "Hesabınız deaktiv edildi" : "Hesabınız bərpa edildi",
        body: input.deactivate
          ? "Girişiniz bağlandı. Paylaşımlarınız və xatirələriniz silinmədi."
          : "Hesabınıza yenidən daxil ola bilərsiniz.",
      },
    });
  });

  if (rejection !== null) return { ok: false, reason: rejection };

  return { ok: true, value: { targetId: target.id, deactivated: input.deactivate } };
}

/** Filtr seçicisi üçün cohort siyahısı (ad + slug + üzv sayı). */
export async function listAdminCohortOptions(
  viewer: Viewer,
): Promise<Array<{ slug: string; displayName: string; count: number }>> {
  await assertFreshAdmin(viewer);

  const cohorts = await prisma.cohort.findMany({
    orderBy: [{ admissionYear: "desc" }, { displayName: "asc" }],
    select: {
      slug: true,
      displayName: true,
      _count: { select: { members: true } },
    },
  });

  return cohorts.map((c) => ({
    slug: c.slug,
    displayName: c.displayName,
    count: c._count.members,
  }));
}

/** UI-da seçilə bilən cohort rolları — enum-dan, sətir literal yazılmır. */
export const ASSIGNABLE_COHORT_ROLES: readonly CohortRoleValue[] = [
  CohortRole.MEMBER,
  CohortRole.CLASS_REPRESENTATIVE,
  CohortRole.EVENT_COORDINATOR,
  CohortRole.CLASS_MODERATOR,
];
