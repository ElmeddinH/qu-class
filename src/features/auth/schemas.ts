// ============================================================================
// src/features/auth/schemas.ts
// Giriş və qeydiyyat sxemləri — client (RHF resolver) və server (Server Action)
// EYNİ sxemi işlədir. Doğrulama qaydası bir yerdə saxlanılır.
//
// ⚠️ Bu fayl `src/auth.ts` (Credentials provider) tərəfindən də import olunur —
// Prisma / bcrypt / React İMPORT ETMƏ, təmiz Zod qalsın.
// ============================================================================

import { z } from "zod";

import {
  MIN_PASSWORD_LENGTH,
  MIN_ADMISSION_YEAR,
  UNIVERSITY_EMAIL_DOMAIN,
  isUniversityEmail,
} from "@/lib/constants";

/** Universitet e-poçtu — domen sabiti `src/lib/constants.ts`-dədir. */
export const universityEmailSchema = z
  .string()
  .min(1, "E-poçt tələb olunur")
  .email("E-poçt düzgün formatda deyil")
  .refine(isUniversityEmail, {
    message: `E-poçt @${UNIVERSITY_EMAIL_DOMAIN} ilə bitməlidir`,
  });

/** Şifrə: ən azı 8 simvol, ən azı bir hərf və bir rəqəm. */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Şifrə ən azı ${MIN_PASSWORD_LENGTH} simvol olmalıdır`)
  .regex(/[0-9]/, "Şifrədə ən azı bir rəqəm olmalıdır")
  .regex(/[A-Za-zƏəĞğIıİiÖöŞşÇçÜü]/, "Şifrədə ən azı bir hərf olmalıdır");

const nameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} ən azı 2 simvol olmalıdır`)
    .max(60, `${label} 60 simvoldan uzun ola bilməz`);

// ---------------------------------------------------------------------------
// Giriş
// ---------------------------------------------------------------------------

/**
 * Auth.js Credentials provider-inin `authorize()` girişi.
 * Burada domen yoxlaması QƏSDƏN yoxdur: mövcud hesabın e-poçtu dəyişsə belə
 * giriş bloklanmamalıdır. Domen qaydası qeydiyyat qapısındadır.
 */
export const credentialsSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().min(1, "E-poçt tələb olunur").email("E-poçt düzgün formatda deyil"),
  password: z.string().min(1, "Şifrə tələb olunur"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Qeydiyyat
// ---------------------------------------------------------------------------

/** Qəbul ili seçimi üçün yuxarı hədd — gələn tədris ili də seçilə bilər. */
export function maxAdmissionYear(now: Date = new Date()): number {
  return now.getFullYear() + 1;
}

export function isValidAdmissionYear(value: string): boolean {
  const year = Number(value);
  return (
    Number.isInteger(year) &&
    year >= MIN_ADMISSION_YEAR &&
    year <= maxAdmissionYear()
  );
}

/** Formadan gələn sətri ədədə çevirir (sxem artıq doğrulayıb). */
export function toAdmissionYear(value: string): number {
  return Number.parseInt(value, 10);
}

export const registerSchema = z
  .object({
    firstName: nameSchema("Ad"),
    lastName: nameSchema("Soyad"),
    email: universityEmailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Şifrəni təkrarlayın"),
    facultyId: z.string().min(1, "Fakültə seçin"),
    programId: z.string().min(1, "İxtisas seçin"),
    // ⚠️ `<Select>` sətir qaytarır və `z.coerce.number()` sxemin GİRİŞ tipini
    // `unknown`-a çevirir (RHF sahə tipləri dağılır). Buna görə sətir kimi
    // doğrulanır, ədədə çevirmə `toAdmissionYear()` ilə serverdə olur.
    admissionYear: z
      .string()
      .min(1, "Qəbul ili seçin")
      .refine(isValidAdmissionYear, "Qəbul ili düzgün deyil"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifrələr uyğun gəlmir",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/** Server Action-ların ümumi cavab forması. */
export interface ActionResult {
  ok: boolean;
  /** İstifadəçiyə göstərilən azərbaycanca mesaj. */
  message?: string;
  /** Sahəyə bağlı xəta — RHF `setError` ilə uyğun sahəyə yerləşdirilir. */
  field?: string;
}
