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
import { CohortRole, CohortScope, SystemRole } from "@/lib/enums";
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
