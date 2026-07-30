// ============================================================================
// src/app/api/v1/auth/register/route.ts
// POST /api/v1/auth/register — yeni hesab.
//
// ⚠️ Endpoint SIFIR yeni sorğu yazır: mövcud `services/auth.service.ts` →
// `registerUser()` çağırılır (CLAUDE.md §4). İstifadəçi, sinif üzvlüyü və
// default `FieldVisibility` sətirləri orada TƏK transaksiyada yaranır.
//
// ⚠️ `requireJson` burada DA tətbiq olunur (TƏLƏ B ilə eyni səbəb): qeydiyyat
// da vəziyyət dəyişdirən əməliyyatdır və cross-site form POST-u ilə istənilməz
// hesab yaradılması mümkün olmamalıdır.
//
// ⚠️ Cavabda ŞİFRƏ və `passwordHash` YOXDUR — yalnız kimlik xülasəsi və sinfin
// `slug`-ı (müştəri dərhal sinif səhifəsinə keçə bilir).
//
// 🔴 Qeydiyyat AVTOMATİK GİRİŞ ETMİR. Server Action variantı
// (`features/auth/actions.ts`) edir, çünki forma istifadəçini dərhal `/home`-a
// aparmalıdır. REST müştərisi isə açıq addım gözləyir: `POST /auth/login`.
// İki səthin fərqi sənəddə yazılıb — gizli davranış yoxdur.
// ============================================================================

import { parseJsonBody, requireJson } from "@/lib/api/guard";
import { created, fail } from "@/lib/api/respond";
import { RegisterBodySchema } from "@/lib/api/schemas";
import { normalizeEmail, UNIVERSITY_EMAIL_DOMAIN } from "@/lib/constants";
import { registerUser } from "@/services/auth.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const mediaTypeError = requireJson(request);
  if (mediaTypeError) return mediaTypeError;

  const body = await parseJsonBody(RegisterBodySchema, request);
  if (!body.ok) return body.response;

  const input = body.data;

  const result = await registerUser({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    password: input.password,
    programId: input.programId,
    admissionYear: input.admissionYear,
  });

  if (!result.ok) {
    if (result.reason === "EMAIL_TAKEN") {
      // 409 — resurs artıq var. 422 DEYİL: göndərilən məlumat FORMA olaraq
      // düzgündür, sadəcə toqquşur.
      return fail("VALIDATION_FAILED", {
        status: 409,
        message: `Bu ${UNIVERSITY_EMAIL_DOMAIN} e-poçtu artıq qeydiyyatdan keçib.`,
      });
    }

    // Uyğun cohort yoxdur → göndərilən `programId` / `admissionYear` cütü
    // etibarsızdır, yəni doğrulama xətasıdır.
    return fail("VALIDATION_FAILED", {
      message:
        "Bu ixtisas/il üzrə sinif səhifəsi hələ yaradılmayıb — kataloqdan " +
        "mövcud qəbul ilini seçin.",
      details: [{ path: "admissionYear", message: "Uyğun sinif tapılmadı" }],
    });
  }

  return created({
    userId: result.userId,
    email: normalizeEmail(input.email),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    cohortSlug: result.cohortSlug,
  });
}
