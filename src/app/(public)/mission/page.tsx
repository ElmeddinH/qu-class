// ============================================================================
// src/app/(public)/mission/page.tsx
// /mission — ictimai məzmun səhifəsi (spec §2) [M2].
//
// Səhifə NAZİKDİR (CLAUDE.md §8): başlıq, sorğu və render
// `features/content/ContentRouteView.tsx`-dədir; marşrut → `ContentPage`
// xəritəsi isə `lib/content-routes.ts`-də.
//
// ⚠️ `force-dynamic` — məzmun DB-dən gəlir və admin CMS-i (Blok 11B) onu
// dəyişəcək. Statik render redaktədən sonra köhnə mətni əbədi göstərərdi.
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentRouteView } from "@/features/content/ContentRouteView";
import { contentRouteOf } from "@/lib/content-routes";

export const dynamic = "force-dynamic";

const ROUTE_PATH = "/mission";

export function generateMetadata(): Metadata {
  const route = contentRouteOf(ROUTE_PATH);
  if (!route) return {};

  return {
    title: `${route.title} — QU CLASS`,
    description: route.description,
  };
}

export default function Page() {
  // Xəritə redaktə olunub yol silinsə səhifə 404 verməlidir, boş ekran yox.
  if (!contentRouteOf(ROUTE_PATH)) notFound();

  return <ContentRouteView path={ROUTE_PATH} />;
}
