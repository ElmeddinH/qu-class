// ============================================================================
// src/lib/auth.ts
// Auth üçün VAHİD import nöqtəsi (barrel).
//
// Auth.js v5 konfiqi layihə kökündə olmalıdır (`src/auth.ts`), çünki
// `src/middleware.ts` və route handler onu oradan gözləyir. Qalan server kodu
// isə CLAUDE.md-dəki qovluq strukturuna uyğun olaraq bu faylı işlədir:
//
//   import { auth, getViewer, requireAdmin } from "@/lib/auth";
//
// ⚠️ NODE runtime — dolayısı ilə Prisma və bcrypt gətirir.
// Middleware / Edge kodu bunu İMPORT ETMƏMƏLİDİR (bax `src/auth.config.ts`).
// ============================================================================

export { auth, signIn, signOut, handlers } from "@/auth";

export {
  getViewer,
  getSessionUser,
  getPrimaryCohort,
  requireUser,
  requireAdmin,
  requireCohortRole,
  type AuthenticatedViewer,
} from "@/lib/viewer";
