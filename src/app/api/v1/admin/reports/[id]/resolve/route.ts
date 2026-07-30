// ============================================================================
// src/app/api/v1/admin/reports/{id}/resolve/route.ts
// POST — şikayət üzrə qərar.
//
// ⚠️ `requireJson` MƏCBURİDİR (yazma əməliyyatı): brauzerin `<form>` elementi
// `application/json` göndərə bilmir, yəni cross-site POST kəsilir (bax
// `lib/api/guard.ts` → `requireJson` başlığı).
//
// Servis TƏK TRANSAKSİYADA: `Report.status` + AuditLog + şikayətçiyə
// Notification. Qərar mətnini (`resolution`) `RESOLVED` / `REJECTED` üçün
// MƏCBURİ edən qayda servisdə də təkrarlanır — endpoint tək qapı deyil.
// ============================================================================

import { parseJsonBody, requireJson, withAdmin } from "@/lib/api/guard";
import { fail, notFound, ok } from "@/lib/api/respond";
import { AdminResolveBodySchema } from "@/lib/api/schemas";
import { decideReport } from "@/services/moderation.service";

export const dynamic = "force-dynamic";

export const POST = withAdmin<{ id: string }>(async ({ request, viewer, params }) => {
  const mediaTypeError = requireJson(request);
  if (mediaTypeError) return mediaTypeError;

  const body = await parseJsonBody(AdminResolveBodySchema, request);
  if (!body.ok) return body.response;

  const result = await decideReport(viewer, {
    reportId: params.id,
    decision: body.data.decision,
    resolution: body.data.resolution ?? null,
  });

  if (!result.ok) {
    if (result.reason === "NOT_FOUND") return notFound("Şikayət tapılmadı.");

    return fail("VALIDATION_FAILED", {
      message:
        result.reason === "RESOLUTION_REQUIRED"
          ? "«RESOLVED» və «REJECTED» qərarları üçün «resolution» tələb olunur."
          : "Bu şikayət artıq bağlanıb — status yalnız bir istiqamətdə dəyişir.",
    });
  }

  return ok(result.value);
});
