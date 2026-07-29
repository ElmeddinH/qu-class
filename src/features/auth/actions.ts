"use server";

// ============================================================================
// src/features/auth/actions.ts
// Giriş, qeydiyyat və çıxış Server Action-ları.
//
// ⚠️ `signIn()` uğur halında NEXT_REDIRECT atır — bu, xəta DEYİL, naviqasiyadır.
// `try/catch` içində onu UDMA: yalnız `AuthError`-u tut, qalanını yenidən at.
// ============================================================================

import { AuthError } from "next-auth";
import { unstable_rethrow } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { normalizeEmail, UNIVERSITY_EMAIL_DOMAIN } from "@/lib/constants";
import { AFTER_LOGIN_PATH, AFTER_LOGOUT_PATH, safeCallbackUrl } from "@/lib/routes";
import { registerUser } from "@/services/auth.service";
import {
  loginSchema,
  registerSchema,
  toAdmissionYear,
  type ActionResult,
} from "./schemas";

const GENERIC_ERROR = "Gözlənilməz xəta baş verdi. Bir azdan yenidən cəhd edin.";

/**
 * ⚠️ Səbəb qəsdən ayırd edilmir ("istifadəçi yoxdur" / "şifrə səhvdir") —
 * fərqli mesaj hansı e-poçtun sistemdə olduğunu ifşa edərdi.
 */
const INVALID_CREDENTIALS = "E-poçt və ya şifrə yanlışdır.";

export async function loginAction(
  values: unknown,
  callbackUrl?: string,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, message: "Formada xəta var, məlumatları yoxlayın." };
  }

  try {
    await signIn("credentials", {
      email: normalizeEmail(parsed.data.email),
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(callbackUrl),
    });
  } catch (error) {
    // Uğurlu giriş → yönləndirmə. Bunu xəta kimi göstərmə.
    unstable_rethrow(error);
    if (error instanceof AuthError) return { ok: false, message: INVALID_CREDENTIALS };
    console.error("[auth] loginAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }

  // Bura normalda çatmır (signIn yönləndirir).
  return { ok: true };
}

export async function registerAction(values: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      message: first?.message ?? "Formada xəta var, məlumatları yoxlayın.",
      field: typeof first?.path[0] === "string" ? first.path[0] : undefined,
    };
  }

  const data = parsed.data;

  try {
    const result = await registerUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      programId: data.programId,
      admissionYear: toAdmissionYear(data.admissionYear),
    });

    if (!result.ok) {
      if (result.reason === "EMAIL_TAKEN") {
        return {
          ok: false,
          field: "email",
          message: `Bu ${UNIVERSITY_EMAIL_DOMAIN} e-poçtu artıq qeydiyyatdan keçib. Daxil olun və ya başqa e-poçt işlədin.`,
        };
      }
      return {
        ok: false,
        field: "admissionYear",
        message:
          "Bu ixtisas/il üzrə sinif səhifəsi hələ yaradılmayıb, administratora müraciət edin.",
      };
    }

    // Qeydiyyatdan sonra dərhal giriş — istifadəçi yenidən forma doldurmasın.
    // Hədəf `/home`-dur; sinif səhifəsinə yönləndirməni orada tək məntiq edir.
    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirectTo: AFTER_LOGIN_PATH,
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      // Hesab yaradıldı, avtomatik giriş alınmadı → əl ilə daxil olsun.
      return {
        ok: false,
        message: "Hesab yaradıldı, lakin avtomatik giriş alınmadı. Daxil olun.",
      };
    }
    console.error("[auth] registerAction:", error);
    return { ok: false, message: GENERIC_ERROR };
  }

  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: AFTER_LOGOUT_PATH });
}
