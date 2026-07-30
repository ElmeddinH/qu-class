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
import {
  CohortRole,
  SystemRole,
  SystemRoleSchema,
  type CohortRole as CohortRoleType,
  type SystemRole as SystemRoleType,
} from "@/lib/enums";
import { LOGIN_PATH } from "@/lib/routes";
import { ANONYMOUS, type Viewer } from "@/lib/visibility";

/** Giriş etmiş istifadəçiyə daraldılmış `Viewer` — `require*` qapılarının çıxışı. */
export type AuthenticatedViewer = Extract<Viewer, { kind: "USER" }>;

/**
 * 🔴 SİSTEM ROLUNUN CANLI DƏYƏRİ — TOKEN-DƏN DEYİL, BAZADAN (Blok 11B, TƏLƏ B).
 *
 * JWT strategiyasında `systemRole` TOKEN-İN İÇİNDƏDİR (`Session` cədvəli
 * yoxdur — bax `prisma/schema.prisma`). Bu, klassik SƏLAHİYYƏT QALXMASI
 * PƏNCƏRƏSİ yaradır: admin birini `USER`-ə endirdikdən sonra həmin adamın
 * brauzerindəki token HƏLƏ DƏ `UNIVERSITY_ADMIN` deyir və o, token bitənə
 * qədər `/admin`-ə girməyə davam edər. Sessiyanı serverdən ləğv etmək mümkün
 * deyil, çünki saxlanılan sessiya yoxdur.
 *
 * Həll: rol hər sorğuda DB-dən oxunur. Qiymət bir `findUnique`-dir və
 * `cache()` sayəsində render başına BİR dəfə ödənilir — qapı isə məhz
 * buradadır.
 *
 * ⚠️ Sətir tapılmasa (hesab silinib) və ya hesab DEAKTİVDİRSƏ ən aşağı
 * səlahiyyət qaytarılır (fail closed).
 *
 * ⚠️ Token-dəki `systemRole` SİLİNMİR: `src/middleware.ts` Edge-dədir və
 * Prisma-ya çıxa bilmir, yəni BİRİNCİ süzgəc hələ də token-dədir. Middleware
 * tez və ucuzdur, bu funksiya isə AVTORİTETDİR — köhnə token yalnız
 * yönləndirməni "gecikdirə" bilər, səhifəni AÇA bilməz.
 */
export const readSystemRole = cache(async (userId: string): Promise<SystemRoleType> => {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true, deactivatedAt: true },
  });

  if (!row || row.deactivatedAt !== null) return SystemRole.USER;

  // Naməlum rol dəyəri DB-də qalıbsa ən aşağı səlahiyyət (fail closed).
  return SystemRoleSchema.catch(SystemRole.USER).parse(row.systemRole);
});

/**
 * Cari sorğunun `Viewer`-i.
 *
 * ⚠️ React `cache()` ilə sarılıb: eyni render ağacında neçə dəfə çağırılsa da
 * DB-yə YALNIZ BİR sorğu gedir. Layout, səhifə və hər servis funksiyası onu
 * sərbəst çağıra bilər.
 *
 * `cohortIds`, `moderatedCohortIds` VƏ `systemRole` token-dən DEYİL, hər
 * sorğuda DB-dən oxunur — JWT uzunömürlüdür və üzvlük / rol dəyişikliyi orada
 * dərhal əks olunmazdı (bax `readSystemRole` yuxarıda və `src/auth.config.ts`).
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return ANONYMOUS;

  const [memberships, systemRole] = await Promise.all([
    prisma.cohortMembership.findMany({
      where: { userId },
      select: { cohortId: true, role: true },
    }),
    readSystemRole(userId),
  ]);

  return {
    kind: "USER",
    userId,
    cohortIds: memberships.map((m) => m.cohortId),
    systemRole,
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        systemRole: true,
        stage: true,
        deactivatedAt: true,
      },
    });

    // 🔴 DEAKTİV HESAB "SESSİYASI OLMAYAN" KİMİ DAVRANIR (Blok 11B).
    // `(app)` / `(admin)` layout-ları `null` gördükdə `SESSION_EXPIRED_PATH`-ə
    // yönləndirir — o route kukini SİLİR, yəni açıq sessiya növbəti sorğuda
    // bağlanır. Deaktivasiya yalnız girişi bağlasaydı (src/auth.ts), artıq
    // açıq olan brauzer token bitənə qədər işləməyə davam edərdi.
    if (!user || user.deactivatedAt !== null) return null;

    // ⚠️ `deactivatedAt` ÇIXIŞA DÜŞMÜR: bu funksiyanın nəticəsi header və
    // naviqasiya üçündür və `null` qaytarması onsuz da yeganə siqnaldır.
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      systemRole: user.systemRole,
      stage: user.stage,
    };
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

/**
 * `UNIVERSITY_ADMIN` tələb edir. Əks halda 403 (`forbidden.tsx` render olunur).
 *
 * 🔴 ROL BAZADAN OXUNUR, TOKEN-DƏN YOX (TƏLƏ B — `readSystemRole` şərhinə bax).
 * İmza dəyişməyib; içi bərkidilib. Yoxlama `viewer.systemRole`-a GÜVƏNMİR və
 * `readSystemRole`-u AÇIQ çağırır: qapı burada olduğu üçün o, viewer-in necə
 * qurulduğundan asılı olmamalıdır (servis testi əl ilə `Viewer` qura bilər).
 */
export async function requireAdmin(): Promise<AuthenticatedViewer> {
  const viewer = await requireUser();
  const role = await readSystemRole(viewer.userId);
  if (role !== SystemRole.UNIVERSITY_ADMIN) forbidden();
  return { ...viewer, systemRole: role };
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
