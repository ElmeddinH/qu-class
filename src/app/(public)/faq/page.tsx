// ============================================================================
// src/app/(public)/faq/page.tsx
// /faq — tez-tez verilən suallar (spec §2, 9-cu bənd).
//
// Səhifə NAZİKDİR (CLAUDE.md §8): URL-i `parseFaqParams` ilə oxuyur və
// `features/content/FaqScreen`-ə ötürür.
//
// ⚠️ İCTİMAİ SƏHİFƏ — `getViewer()` ÇAĞIRILMIR. FAQ redaksiya məzmunudur və
// `content.service` onsuz da `Viewer` almır (məxfilik süzgəci istifadəçi
// məzmununa aiddir, universitetin sənədinə yox).
//
// ⚠️ `force-dynamic` — məzmun DB-dən gəlir və `?q=` / `?category=` filtrləri
// hər sorğuda dəyişir.
// ============================================================================

import type { Metadata } from "next";

import { FaqScreen } from "@/features/content/FaqScreen";
import { parseFaqParams } from "@/lib/faq-filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tez-tez verilən suallar — QU CLASS",
  description:
    "Qəbul, kampus həyatı, sinif səhifəsi və məxfilik parametrləri ilə bağlı suallar.",
};

interface FaqPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FaqPage({ searchParams }: FaqPageProps) {
  // Naməlum açar / dəyər 404 vermir — filtr sadəcə nəzərə alınmır.
  const filters = parseFaqParams(await searchParams);

  return <FaqScreen filters={filters} />;
}
