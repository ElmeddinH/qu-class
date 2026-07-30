// ============================================================================
// src/features/admin/AdminContent.tsx
// `/admin/content` — CMS: `ContentPage` · `Faq` · `GuidePlace`.
//
// ⚠️ Qaralamalar BURADA görünür (`isPublished = false`), ictimai səthdə isə
// YOX: `content.service.ts` hər sorğuya `isPublished: true` qoyur və oraya
// `includeDrafts` bayrağı qəsdən əlavə edilməyib.
//
// ⚠️ Hər redaktə AuditLog yazır (servis transaksiyasında).
// ============================================================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/lib/auth";
import { contentSectionLabel, faqCategoryLabel, guideCategoryLabel } from "@/lib/labels";
import {
  listAdminContentPages,
  listAdminFaqs,
  listAdminGuidePlaces,
} from "@/services/admin-content.service";

import { AdminPageHeader } from "./AdminPageHeader";
import { ContentEditor } from "./ContentEditor";
import { FaqEditor } from "./FaqEditor";
import { GuidePlaceEditor } from "./GuidePlaceEditor";

export async function AdminContent() {
  const viewer = await getViewer();

  const [pages, faqs, places] = await Promise.all([
    listAdminContentPages(viewer),
    listAdminFaqs(viewer),
    listAdminGuidePlaces(viewer),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Məzmun idarəsi"
        description="İctimai səhifələr, FAQ və Xankəndi bələdçisi. Gövdə Markdown-dur və HTML kimi yeridilmir — mətndəki teqlər ekranda mətn kimi görünür."
      />

      <Card>
        <CardHeader>
          <CardTitle>Səhifələr ({pages.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex flex-col gap-3 rounded-card border border-border p-4"
            >
              <div className="flex flex-col gap-1">
                <span className="text-h4 font-medium text-text-primary">
                  {page.title}
                </span>
                <span className="text-caption text-text-secondary">
                  {contentSectionLabel(page.section)} · <code>{page.slug}</code>
                </span>
              </div>
              <ContentEditor page={page} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tez-tez verilən suallar ({faqs.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="flex flex-col gap-3 rounded-card border border-border p-4"
            >
              <div className="flex flex-col gap-1">
                <span className="text-small font-medium text-text-primary">
                  {faq.question}
                </span>
                <span className="text-caption text-text-secondary">
                  {faqCategoryLabel(faq.category)}
                </span>
              </div>
              <FaqEditor faq={faq} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Xankəndi bələdçisi ({places.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {places.map((place) => (
            <div
              key={place.id}
              className="flex flex-col gap-3 rounded-card border border-border p-4"
            >
              <div className="flex flex-col gap-1">
                <span className="text-small font-medium text-text-primary">
                  {place.title}
                </span>
                <span className="text-caption text-text-secondary">
                  {guideCategoryLabel(place.category)}
                  {place.isEmergency ? " · təcili" : ""}
                </span>
              </div>
              <GuidePlaceEditor place={place} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
