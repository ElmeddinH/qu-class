// ============================================================================
// src/lib/admin-guard.ts
// Servis qatının admin qapısı — HTTP-dən ASILI DEYİL.
//
// 🔴 NİYƏ `requireAdmin()` KİFAYƏT ETMİR: `lib/viewer.ts` → `requireAdmin()`
// `next/navigation` → `forbidden()` çağırır, yəni SƏHİFƏ kontekstinə bağlıdır.
// Servis funksiyaları isə üç yerdən çağırılır — server komponenti, server
// action və `/api/v1` route handler-i. Sonuncuda `forbidden()` HTML 403
// verərdi (JSON zərfi gözlənilən yerdə), inteqrasiya testində isə Next-in
// daxili idarəetmə xətasını udmaq lazım gələrdi.
//
// Ona görə servis qatı ADİ XƏTA atır (`AdminForbiddenError`) və hər çağıran
// onu öz formasına çevirir. Eyni nümunə Blok 8-də var:
// `achievement.service.ts` → `ModerationForbiddenError`.
//
// 🔴 ROL HƏR ÇAĞIRIŞDA BAZADAN OXUNUR (TƏLƏ B). `viewer.systemRole` sahəsinə
// GÜVƏNİLMİR: `Viewer` obyektini çağıran tərəf qurur və o, köhnə JWT-dən
// gələ bilər. Qapının gücü məhz burada, DB sorğusundadır.
// ============================================================================

import { prisma } from "@/lib/db";
import { SystemRole, SystemRoleSchema } from "@/lib/enums";
import type { Viewer } from "@/lib/visibility";

export type AdminViewer = Extract<Viewer, { kind: "USER" }>;

/** Admin olmayan çağırış. Səhifə 403, `/api/v1` isə JSON zərfi qaytarır. */
export class AdminForbiddenError extends Error {
  constructor() {
    super("Universitet administratoru səlahiyyəti tələb olunur");
    this.name = "AdminForbiddenError";
  }
}

/**
 * Viewer HAZIRDA (bazaya görə) universitet administratorudurmu?
 *
 * ⚠️ Deaktiv hesab `false` qaytarır — deaktivasiya rolu silmir, girişi bağlayır.
 */
export async function isFreshAdmin(viewer: Viewer): Promise<boolean> {
  if (viewer.kind !== "USER") return false;

  const row = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { systemRole: true, deactivatedAt: true },
  });

  if (!row || row.deactivatedAt !== null) return false;

  return (
    SystemRoleSchema.catch(SystemRole.USER).parse(row.systemRole) ===
    SystemRole.UNIVERSITY_ADMIN
  );
}

/**
 * Admin deyilsə `AdminForbiddenError` atır; adminsə TƏZƏLƏNMİŞ viewer qaytarır.
 *
 * Qaytarılan obyektin `systemRole`-u DB-dən gələn dəyərdir — çağıran tərəf
 * bundan sonra köhnə token dəyəri ilə işləmir.
 */
export async function assertFreshAdmin(viewer: Viewer): Promise<AdminViewer> {
  if (viewer.kind !== "USER") throw new AdminForbiddenError();
  if (!(await isFreshAdmin(viewer))) throw new AdminForbiddenError();

  return { ...viewer, systemRole: SystemRole.UNIVERSITY_ADMIN };
}
