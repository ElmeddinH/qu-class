// ============================================================================
// src/lib/viewer.ts
// Sessiya → `Viewer` çevirməsi və icazə qapıları.
//
// `Viewer` məxfilik mühərrikinin (src/lib/visibility.ts) giriş tipidir. Bütün
// servis funksiyaları ilk arqument kimi məhz bu obyekti alır (CLAUDE.md §4).
//
// ⚠️ NODE runtime — Prisma import edir. Middleware bu faylı işlətməməlidir.
// ============================================================================

import { cache } from "react";
import { forbidden, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CohortRole, SystemRole, SystemRoleSchema, type CohortRole as CohortRoleType } from "@/lib/enums";
import { LOGIN_PATH } from "@/lib/routes";
import { ANONYMOUS, type Viewer } from "@/lib/visibility";

/** Giriş etmiş istifadəçiyə daraldılmış `Viewer` — `require*` qapılarının çıxışı. */
export type AuthenticatedViewer = Extract<Viewer, { kind: "USER" }>;

/**
 * Cari sorğunun `Viewer`-i.
 *
 * ⚠️ React `cache()` ilə sarılıb: eyni render ağacında neçə dəfə çağırılsa da
 * DB-yə YALNIZ BİR sorğu gedir. Layout, səhifə və hər servis funksiyası onu
 * sərbəst çağıra bilər.
 *
 * `cohortIds` və `moderatedCohortIds` token-dən DEYİL, hər sorğuda
 * `CohortMembership`-dən TƏK sorğu ilə oxunur — JWT uzunömürlüdür və üzvlük /
 * rol dəyişikliyi orada dərhal əks olunmazdı (bax `src/auth.config.ts`).
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return ANONYMOUS;

  const memberships = await prisma.cohortMembership.findMany({
    where: { userId },
    select: { cohortId: true, role: true },
  });

  return {
    kind: "USER",
    userId,
    cohortIds: memberships.map((m) => m.cohortId),
    // Naməlum rol dəyəri qalıbsa ən aşağı səlahiyyət (fail closed).
    systemRole: SystemRoleSchema.catch(SystemRole.USER).parse(session.user.systemRole),
    moderatedCohortIds: memberships
      .filter((m) => m.role === CohortRole.CLASS_MODERATOR)
      .map((m) => m.cohortId),
  };
});

/** Header və naviqasiya üçün minimal profil. Sessiya yoxdursa `null`. */
export const getSessionUser = cache(
  async (): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    systemRole: string;
    stage: string;
  } | null> => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return null;

    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        systemRole: true,
        stage: true,
      },
    });
  },
);

/**
 * İstifadəçinin ƏSAS cohort-u — `/home` yönləndirməsi və naviqasiya üçün.
 * `isPrimary` olan üstündür; yoxdursa ən son qoşulduğu cohort.
 * Heç bir üzvlük yoxdursa `null` (yeni istifadəçi / cohort-a bağlanmamış admin).
 */
export const getPrimaryCohort = cache(
  async (): Promise<{ id: string; slug: string; displayName: string } | null> => {
    const viewer = await getViewer();
    if (viewer.kind !== "USER") return null;

    const membership = await prisma.cohortMembership.findFirst({
      where: { userId: viewer.userId },
      orderBy: [{ isPrimary: "desc" }, { joinedAt: "desc" }],
      select: {
        cohort: { select: { id: true, slug: true, displayName: true } },
      },
    });

    return membership?.cohort ?? null;
  },
);

// ---------------------------------------------------------------------------
// İcazə qapıları
// ---------------------------------------------------------------------------

/**
 * Giriş tələb edir. Sessiya yoxdursa `/login`-ə yönləndirir.
 * Adətən middleware bunu qabaqlayır — bu, server tərəfdəki ikinci qatdır
 * (server action-lar və middleware matcher-inin kənarında qalan hallar üçün).
 */
export async function requireUser(): Promise<AuthenticatedViewer> {
  const viewer = await getViewer();
  if (viewer.kind !== "USER") redirect(LOGIN_PATH);
  return viewer;
}

/** `UNIVERSITY_ADMIN` tələb edir. Əks halda 403 (`forbidden.tsx` render olunur). */
export async function requireAdmin(): Promise<AuthenticatedViewer> {
  const viewer = await requireUser();
  if (viewer.systemRole !== SystemRole.UNIVERSITY_ADMIN) forbidden();
  return viewer;
}

/**
 * Həmin cohort-da sadalanan rollardan birini tələb edir.
 *
 * ⚠️ Cohort rolu YALNIZ öz cohort-unda keçərlidir (CLAUDE.md "Rollar").
 * `UNIVERSITY_ADMIN` istisnadır — universitet miqyaslı idarəetmə rolu olduğu
 * üçün bütün cohort-larda keçir.
 */
export async function requireCohortRole(
  cohortId: string,
  roles: readonly CohortRoleType[],
): Promise<AuthenticatedViewer> {
  const viewer = await requireUser();
  if (viewer.systemRole === SystemRole.UNIVERSITY_ADMIN) return viewer;

  const membership = await prisma.cohortMembership.findUnique({
    where: { userId_cohortId: { userId: viewer.userId, cohortId } },
    select: { role: true },
  });

  if (!membership || !roles.includes(membership.role as CohortRoleType)) forbidden();
  return viewer;
}
