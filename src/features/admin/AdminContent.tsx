// ============================================================================
// src/features/admin/AdminContent.tsx
// `/admin/content` — CMS: `ContentPage` · `Faq` · `GuidePlace`.
//
// ⚠️ Qaralamalar BURADA görünür (`isPublished = false`), ictimai səthdə isə
// YOX: `content.service.ts` hər sorğuya `isPublished: true` qoyur və oraya
// `includeDrafts` bayrağı qəsdən əlavə edilməyib.
//
// ⚠️ Hər redaktə AuditLog yazır (servis transaksiyasında).
//
// ⚠️ Blok 12B — hər üç bölmədə «YARAT» forması var (`ContentCreateForms.tsx`).
// Əvvəl yalnız redaktə mümkün idi: yeni səhifə/sual/məkan üçün seed-i dəyişib
// bazanı yenidən qurmaq lazım gəlirdi. Yaratma da AuditLog yazır
// (`AuditAction.CREATE`).
// ============================================================================

import { SectionCard } from "@/components/kuds/SectionCard";
import { getViewer } from "@/lib/auth";
import { contentSectionLabel, faqCategoryLabel, guideCategoryLabel } from "@/lib/labels";
import {
  listAdminContentPages,
  listAdminFaqs,
  listAdminGuidePlaces,
} from "@/services/admin-content.service";

import { AdminPageHeader } from "./AdminPageHeader";
import {
  ContentPageCreateForm,
  FaqCreateForm,
  GuidePlaceCreateForm,
} from "./ContentCreateForms";
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

      {/* T22: `SectionCard` başlığı `role="heading" aria-level` ilə verir —
          `<h1>` (AdminPageHeader) → kart `<h2>` → element `<h3>`. */}
      <SectionCard title={`Səhifələr (${pages.length})`}>
        <ContentPageCreateForm />

        {pages.map((page) => (
          <div
            key={page.id}
            className="flex flex-col gap-3 rounded-card border border-border p-4"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-h4 font-medium text-text-primary">{page.title}</h3>
              <span className="text-caption text-text-secondary">
                {contentSectionLabel(page.section)} · <code>{page.slug}</code>
              </span>
            </div>
            <ContentEditor page={page} />
          </div>
        ))}
      </SectionCard>

      <SectionCard title={`Tez-tez verilən suallar (${faqs.length})`}>
        <FaqCreateForm />

        {faqs.map((faq) => (
          <div
            key={faq.id}
            className="flex flex-col gap-3 rounded-card border border-border p-4"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-small font-medium text-text-primary">{faq.question}</h3>
              <span className="text-caption text-text-secondary">
                {faqCategoryLabel(faq.category)}
              </span>
            </div>
            <FaqEditor faq={faq} />
          </div>
        ))}
      </SectionCard>

      <SectionCard title={`Xankəndi bələdçisi (${places.length})`}>
        <GuidePlaceCreateForm />

        {places.map((place) => (
          <div
            key={place.id}
            className="flex flex-col gap-3 rounded-card border border-border p-4"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-small font-medium text-text-primary">{place.title}</h3>
              <span className="text-caption text-text-secondary">
                {guideCategoryLabel(place.category)}
                {place.isEmergency ? " · təcili" : ""}
              </span>
            </div>
            <GuidePlaceEditor place={place} />
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
