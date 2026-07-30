// ============================================================================
// src/services/auth.service.ts
// Qeydiyyat — hesabın yaradılması.
//
// ⚠️ CLAUDE.md §4 qaydası ("hər servis funksiyası ilk arqument kimi `Viewer`
// alır") burada tətbiq olunmur: qeydiyyat AUTENTİFİKASİYADAN ƏVVƏLKİ axındır,
// `Viewer` tərifinə görə `ANONYMOUS`-dur və heç bir mövcud məlumat oxunmur.
// Yaradılan sətirlərin hamısı yeni istifadəçinin özünə aiddir.
// ============================================================================

import { hashSync } from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { BCRYPT_ROUNDS, normalizeEmail } from "@/lib/constants";
import { CohortRole, CohortScope, SystemRole, SystemRoleSchema } from "@/lib/enums";
import { resolveStage } from "@/lib/stage";
import { CONTROLLED_PROFILE_FIELDS, defaultLevelFor } from "@/lib/visibility";

export interface RegisterUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  programId: string;
  admissionYear: number;
}

export type RegisterUserResult =
  | { ok: true; userId: string; cohortSlug: string }
  | { ok: false; reason: "EMAIL_TAKEN" | "COHORT_NOT_FOUND" };

/**
 * Yeni istifadəçi yaradır — hamısı TƏK transaksiyada:
 *   1. e-poçt unikallığı
 *   2. uyğun Cohort (scope=PROGRAM + programId + admissionYear)
 *   3. User
 *   4. CohortMembership (isPrimary: true, role: MEMBER)
 *   5. default FieldVisibility sətirləri
 *
 * Transaksiya vacibdir: yarımçıq hesab (məsələn üzvlüksüz və ya məxfilik
 * sətirləri olmayan istifadəçi) yaranmamalıdır — `redactProfile` sətir
 * tapmasa `defaultLevelFor()`-a düşür, amma istifadəçi öz məxfilik panelində
 * heç nə görməzdi.
 */
export async function registerUser(
  input: RegisterUserInput,
): Promise<RegisterUserResult> {
  const email = normalizeEmail(input.email);

  // ⚠️ Duz TƏSADÜFİdir. prisma/seed.ts-dəki sabit duz YALNIZ seed-in
  // deterministik qalması üçündür — istehsal axınına KOPYALANMIR.
  const passwordHash = hashSync(input.password, BCRYPT_ROUNDS);

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) return { ok: false, reason: "EMAIL_TAKEN" } as const;

      const cohort = await tx.cohort.findFirst({
        where: {
          scope: CohortScope.PROGRAM,
          programId: input.programId,
          admissionYear: input.admissionYear,
        },
        select: {
          id: true,
          slug: true,
          academicStartsAt: true,
          graduatesAt: true,
        },
      });
      if (!cohort) return { ok: false, reason: "COHORT_NOT_FOUND" } as const;

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          systemRole: SystemRole.USER,
          // `stage` yalnız keşdir — həqiqət mənbəyi cohort tarixləridir.
          stage: resolveStage(cohort),
          memberships: {
            create: {
              cohortId: cohort.id,
              role: CohortRole.MEMBER,
              isPrimary: true,
            },
          },
          fieldVisibility: {
            // ⚠️ Sahə siyahısı `src/lib/visibility.ts`-dən gəlir — vahid mənbə.
            // `phone` və `personalEmail` `defaultLevelFor()` sayəsində PRIVATE,
            // qalanları CLAUDE.md §"Məxfilik" qaydasına görə CLASS olur.
            create: CONTROLLED_PROFILE_FIELDS.map((field) => ({
              field,
              level: defaultLevelFor(field),
            })),
          },
        },
        select: { id: true },
      });

      return { ok: true, userId: user.id, cohortSlug: cohort.slug } as const;
    });
  } catch (error) {
    // Eyni e-poçtla paralel iki qeydiyyat → unikal indeks pozuntusu (P2002).
    // Yuxarıdakı yoxlama yarışı (race) bağlamır, indeks bağlayır.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, reason: "EMAIL_TAKEN" };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Girişdən SONRAKI xülasə — `POST /api/v1/auth/login` cavabı
// ---------------------------------------------------------------------------

export interface AuthenticatedSummary {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: string;
  /** `User.stage` keşi — həqiqət mənbəyi cohort tarixləridir. */
  stage: string;
  cohortIds: string[];
  /** `CLASS_MODERATOR` olduğu siniflər. */
  moderatedCohortIds: string[];
}

/**
 * 🔴 NİYƏ BU FUNKSİYA VAR (Blok 9S tələsi).
 *
 * `POST /api/v1/auth/login` uğurla `signIn()` çağırdıqdan SONRA cavabda
 * istifadəçi xülasəsini qaytarmalıdır. İlk yanaşma `getViewer()` idi və
 * SINDI: Auth.js sessiya kukisini CAVAB başlıqlarına (`Set-Cookie`) yazır,
 * `auth()` isə SORĞU kukilərini oxuyur. Yəni eyni sorğu daxilində sessiya
 * hələ "yoxdur" — endpoint 500 verirdi ("sessiya qurulmadı").
 *
 * Həll: xülasə DB-dən BİRBAŞA oxunur. Bu, məxfilik qaydasını POZMUR —
 * `registerUser` ilə eyni səbəb (fayl başlığı): axın autentifikasiyanın ÖZÜDÜR,
 * `signIn` şifrəni artıq yoxlayıb və oxunan sətir MƏHZ giriş edən istifadəçiyə
 * aiddir. Buna görə funksiya `Viewer` ALMIR — hələ mövcud deyil.
 *
 * ⚠️ Funksiya YALNIZ uğurlu `signIn`-dən SONRA çağırılmalıdır. Onu doğrudan
 * çağırmaq "e-poçtu ver, profili al" deməkdir və sızma olardı.
 *
 * ⚠️ Sahələr `getViewer()`-in qurduğu `Viewer` ilə EYNİ mənbədən gəlir
 * (`CohortMembership`), yəni iki səth fərqli cavab verə bilməz.
 */
export async function getAuthenticatedSummary(
  rawEmail: string,
): Promise<AuthenticatedSummary | null> {
  const email = normalizeEmail(rawEmail);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      systemRole: true,
      stage: true,
      memberships: { select: { cohortId: true, role: true } },
    },
  });

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    // Naməlum rol dəyəri qalıbsa ən aşağı səlahiyyət (fail closed) —
    // `lib/viewer.ts` ilə eyni davranış.
    systemRole: SystemRoleSchema.catch(SystemRole.USER).parse(user.systemRole),
    stage: user.stage,
    cohortIds: user.memberships.map((m) => m.cohortId),
    moderatedCohortIds: user.memberships
      .filter((m) => m.role === CohortRole.CLASS_MODERATOR)
      .map((m) => m.cohortId),
  };
}
