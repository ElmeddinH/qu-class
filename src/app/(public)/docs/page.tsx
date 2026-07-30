// ============================================================================
// src/app/(public)/docs/page.tsx
// /docs — interaktiv API sənədi (Swagger UI).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): bütün məntiq `features/docs/ApiDocs.tsx`-dədir.
//
// ⚠️ `(public)` qrupundadır və auth TƏLƏB ETMİR — sənəd özü gizli məlumat
// daşımır (yalnız endpoint müqaviləsi). Qorunan endpoint-lər sənəddə görünür,
// amma «Try it out» onlarda 401 verir; istifadəçi əvvəlcə
// `POST /api/v1/auth/login` işlədir.
//
// ⚠️ `lib/routes.ts` → `APP_ROUTE_PREFIXES`-də `/docs` YOXDUR, yəni middleware
// onu qorumur. Bu, QƏSDƏNDİR: sənəd səhifəsi girişdən əvvəl də oxunmalıdır.
//
// ⚠️ `force-dynamic` DEYİL: səhifə DB-yə toxunmur, statik render tamamilə
// düzgündür. Sənədin özü (`/api/v1/openapi.json`) ayrı route-dur.
// ============================================================================

import type { Metadata } from "next";

import { ApiDocs, OPENAPI_URL } from "@/features/docs/ApiDocs";

export const metadata: Metadata = {
  title: "API sənədləri",
  description:
    "QU CLASS REST API-nin interaktiv sənədi — OpenAPI 3.0, Swagger UI ilə " +
    "birbaşa test edilə bilər.",
};

export default function ApiDocsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-text-primary">API sənədləri</h1>
        <p className="max-w-3xl text-body text-text-secondary">
          QU CLASS-ın versiyalanmış REST səthi (<code>/api/v1</code>). Sənəd Zod
          sxemlərindən avtomatik törəyir — kod dəyişəndə bu səhifə də dəyişir.
          Xam OpenAPI faylı: <code>{OPENAPI_URL}</code>
        </p>
        <p className="max-w-3xl text-small text-text-secondary">
          Qorunan endpoint-ləri sınamaq üçün əvvəlcə{" "}
          <code>POST /api/v1/auth/login</code> əməliyyatını işlədin — sessiya
          kukisi brauzerə qoyulur və sonrakı sorğular onu avtomatik göndərir.
        </p>
      </header>

      <ApiDocs />
    </div>
  );
}
