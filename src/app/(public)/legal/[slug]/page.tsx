// ============================================================================
// src/app/(public)/legal/[slug]/page.tsx
// /legal/privacy · /legal/terms · /legal/copyright · /legal/equal-opportunity
//
// 🔴 NİYƏ BU SƏHİFƏLƏR VAR (GW analizi #13): QU CLASS-ın texniki nüvəsi
// MƏXFİLİK mühərrikidir (dörd səviyyə, sahə-səviyyə görünürlük, aqreqasiya
// razılığı). Öz məxfilik bildirişi olmayan məxfilik platforması ziddiyyətdir —
// müdafiədə birinci soruşulacaq yerdir. README-də də qeyd olunub.
//
// ⚠️ Slug AĞ SİYAHIDADIR (`LEGAL_SLUGS`): xəritədə olmayan slug DB-yə
// ÜMUMİYYƏTLƏ getmir. Səbəb — `/legal/<istənilən-ContentPage-slug>` ünvanı
// hüquqi olmayan səhifəni hüquqi sənəd kimi göstərərdi (məs.
// `/legal/kampus-heyati`), yəni eyni məzmun iki ünvanda yaşayardı (dublikat
// kanonik ünvan).
//
// ⚠️ `force-dynamic` — mətn DB-dədir (Blok 11B-nin CMS-i redaktə edəcək).
// ============================================================================

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalPageView } from "@/features/content/LegalPageView";
import { LEGAL_PAGES, isLegalSlug } from "@/lib/content-routes";

export const dynamic = "force-dynamic";

interface LegalPageProps {
  params: Promise<{ slug: string }>;
}

// ⚠️ `generateStaticParams` QƏSDƏN YOXDUR. Onunla birlikdə Next səhifəni
// `force-dynamic`-ə baxmayaraq PRERENDER edir (build çıxışında ● SSG kimi
// görünür) və hüquqi mətn admin CMS-də (Blok 11B) redaktə olunandan sonra
// köhnə halda qalar. Dörd sənəd üçün statik generasiyanın qazancı yoxdur.

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = LEGAL_PAGES.find((entry) => entry.slug === slug);

  return page ? { title: `${page.label} — QU CLASS` } : {};
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();

  return <LegalPageView slug={slug} />;
}
