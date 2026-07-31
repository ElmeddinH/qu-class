// ============================================================================
// src/features/content/LegalPageView.tsx
// Hüquqi sənədin görünüşü — `/legal/[slug]`.
//
// ⚠️ Məzmun səhifələrindən (`ContentRouteView`) FƏRQLİ karkas işlədir və bu,
// qəsdəndir: hüquqi sənədin üz şəkli OLMUR (rəsmi mətn bəzək qəbul etmir),
// əvəzində sənədlər arası keçid zolağı var — istifadəçi «şərtləri oxudum,
// indi məxfiliyə baxım» axınında hərəkət edir.
//
// 🔴 `isPublished = false` sənəd HEÇ KİMƏ görünmür — şərt `getContentPage`
// servisindədir və burada təkrarlanmır.
//
// ⚠️ Mətn Markdown-dur və HTML kimi YERİDİLMİR (`components/shared/Markdown`).
// ============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { ScrollText } from "lucide-react";

import { Markdown } from "@/components/shared/Markdown";
import { LEGAL_PAGES, legalHref, type LegalSlug } from "@/lib/content-routes";
import { FILTER_CHIP_BASE, filterChipTone } from "@/components/shared/filter-chip";
import { cn } from "@/lib/utils";
import { getContentPage } from "@/services/content.service";
import { shortDate } from "@/utils/date";

import { PageHeader } from "./PageHeader";

export async function LegalPageView({ slug }: { slug: LegalSlug }) {
  const page = await getContentPage(slug);
  if (!page) notFound();

  const current = LEGAL_PAGES.find((entry) => entry.slug === slug);

  return (
    <article className="flex flex-col gap-8 py-8">
      <PageHeader
        eyebrow="Hüquqi sənədlər"
        title={current?.label ?? page.title}
        breadcrumbs={[
          { href: "/", label: "Ana səhifə" },
          { href: legalHref(slug), label: current?.label ?? page.title },
        ]}
      >
        <nav aria-label="Hüquqi sənədlər" className="flex flex-wrap gap-2">
          {LEGAL_PAGES.map((entry) => (
            <Link
              key={entry.slug}
              href={legalHref(entry.slug)}
              aria-current={entry.slug === slug ? "page" : undefined}
              className={cn(
                FILTER_CHIP_BASE,
                filterChipTone(entry.slug === slug),
              )}
            >
              {entry.label}
            </Link>
          ))}
        </nav>
      </PageHeader>

      <div className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 sm:p-8">
        {page.excerpt ? (
          <p className="rounded-card bg-ku-blue p-4 text-body text-text-primary">
            {page.excerpt}
          </p>
        ) : null}

        <Markdown source={page.body} />

        <p className="flex items-center gap-2 text-caption text-text-secondary">
          <ScrollText className="h-4 w-4 shrink-0" aria-hidden />
          Son yenilənmə: {shortDate(page.updatedAt)}
        </p>
      </div>

      <p className="text-small text-text-secondary">
        Əlçatanlıqla bağlı maneə görmüsünüzsə{" "}
        <Link href="/accessibility" className="kuds-prose-link">
          əlçatanlıq bəyanatı
        </Link>{" "}
        səhifəsindən bildirin.
      </p>
    </article>
  );
}
