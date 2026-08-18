// ============================================================================
// src/features/content/ContentRouteView.tsx
// İctimai məzmun səhifələrinin YEGANƏ görünüşü — `/about`, `/history`,
// `/mission`, `/campus-life`, `/clubs`, `/services`, `/newcomers`.
//
// 🔴 SƏHİFƏLƏR NAZİKDİR (CLAUDE.md §8): `app/(public)/about/page.tsx` yalnız
// `<ContentRouteView path="/about" />` render edir. Marşrut → məzmun xəritəsi
// `lib/content-routes.ts`-dədir, sorğu isə `content.service`-dən.
//
// 🔴 `isPublished = false` QARALAMA HEÇ KİMƏ GÖRÜNMÜR: şərt servisdədir
// (`getContentPage` / `listSectionPages`) və burada TƏKRAR YAZILMIR. Səhifə
// tapılmasa `notFound()` — "gizli məzmun" üçün ayrıca 403 yoxdur, çünki
// qaralamanın MÖVCUDLUĞU da redaksiya məlumatıdır.
//
// 🔴 MARKDOWN HTML KİMİ YERİDİLMİR. `Markdown` komponenti blokları React
// elementlərinə çevirir (`dangerouslySetInnerHTML` yoxdur) — gövdəni Blok
// 11B-dəki admin CMS-i yazacaq və o, etibarsız giriş sayılır.
//
// ⚠️ İKİ NÖV: `page` (bir yazı) və `section` (bölmənin bütün yazıları, hər biri
// `#<slug>` anchor-lu + məzmun cədvəli). Fərqin səbəbi `lib/content-routes.ts`
// başlığındadır.
// ============================================================================

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowRight, FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Markdown } from "@/components/shared/Markdown";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import {
  contentRouteOf,
  excludeLegal,
  siblingRoutes,
  type ContentRoute,
} from "@/lib/content-routes";
import type { ContentSection } from "@/lib/enums";
import { contentSectionLabel } from "@/lib/labels";
import {
  getContentPage,
  listSectionPages,
  type ContentPageDetail,
} from "@/services/content.service";
import { shortDate } from "@/utils/date";

import { PageHeader } from "./PageHeader";

interface ContentRouteViewProps {
  /** `lib/content-routes.ts`-dəki yol — komponent özü marşrutu tapır. */
  path: string;
}

export async function ContentRouteView({ path }: ContentRouteViewProps) {
  const route = contentRouteOf(path);

  // Marşrut xəritədə yoxdursa səhifə ümumiyyətlə mövcud olmamalıdır.
  // (Praktikada baş vermir — `page.tsx` sabit yol ötürür — amma xəritə
  // redaktə olunanda səhv 404 kimi görünsün, boş ekran kimi yox.)
  if (!route) notFound();

  return route.kind === "page" ? (
    <SinglePage route={route} />
  ) : (
    <SectionPage route={route} />
  );
}

// ---------------------------------------------------------------------------
// Bir yazı
// ---------------------------------------------------------------------------

/**
 * 🔴 STATUS QAPISI AXINDAN ƏVVƏLDİR (Blok 12D · TƏLƏ A).
 *
 * `getContentPage` həm MƏZMUNDUR, həm də 404 QƏRARIDIR (dərc olunmamış
 * qaralama heç kimə görünmür). Ona görə o, `<Suspense>`-dən KƏNARDA gözlənilir
 * — sərhədin arxasına salınsaydı cavab başlığı artıq getmiş olar və silinmiş
 * səhifə 404 əvəzinə 200 qaytarardı.
 *
 * Sərhədə YALNIZ statusa təsir etməyən sorğu düşür: bölmə yoldaşlarının sayı.
 */
async function SinglePage({ route }: { route: Extract<ContentRoute, { kind: "page" }> }) {
  const page = await getContentPage(route.slug);

  if (!page) notFound();

  const siblings = siblingRoutes(route.path);

  return (
    <article className="flex flex-col gap-8 py-8">
      <PageHeader
        eyebrow={contentSectionLabel(route.section)}
        title={route.title}
        description={route.description}
        breadcrumbs={[
          { href: "/", label: "Ana səhifə" },
          { href: route.path, label: route.title },
        ]}
      />

      {page.coverUrl ? (
        <div className="relative aspect-[12/5] w-full overflow-hidden rounded-card bg-muted">
          <Image
            src={page.coverUrl}
            alt={page.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6 sm:p-8">
        <Markdown source={page.body} />

        <p className="text-caption text-text-secondary">
          Son yenilənmə: {shortDate(page.updatedAt)}
        </p>
      </div>

      {siblings.length > 0 ? (
        <RelatedRoutes routes={siblings} sectionLabel={contentSectionLabel(route.section)} />
      ) : null}

      {/* ⚠️ Bölmədə xəritədə OLMAYAN yazılar da ola bilər (CMS-dən əlavə edilib).
          Onlar `page` marşrutuna bağlı deyil, yəni ayrıca ünvanları yoxdur —
          buna görə sadəcə başlıq siyahısı kimi göstərilmir, bölmə səhifəsində
          görünürlər. Hüquqi sənədlər isə `excludeLegal` ilə kənarlaşdırılır. */}
      <Suspense fallback={null}>
        <SectionFootnote
          section={route.section}
          sectionLabel={contentSectionLabel(route.section)}
        />
      </Suspense>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Bölmə (anchor-lu yazılar)
// ---------------------------------------------------------------------------

/**
 * 🔴 BÖLMƏ SƏHİFƏSİNDƏ `notFound()` YOXDUR — bu, onu digər məzmun
 * səhifələrindən ayıran haldır (Blok 12D · A/B bölgüsü).
 *
 * `listSectionPages` boş qayıtsa səhifə 404 vermir, «məzmun hazırlanır»
 * vəziyyətini göstərir. Yəni sorğu STATUSA TƏSİR ETMİR və bütöv gövdə
 * `<Suspense>` arxasına salına bilər: başlıq və çörək qırıntıları DƏRHAL
 * görünür, siyahı axınla gəlir.
 *
 * ⚠️ Marşrutun özünün mövcudluğu (`contentRouteOf`) `ContentRouteView`-də,
 * sərhəddən ƏVVƏL və SİNXRON yoxlanılır — o qapı toxunulmazdır.
 */
function SectionPage({ route }: { route: Extract<ContentRoute, { kind: "section" }> }) {
  return (
    <div className="flex flex-col gap-8 py-8">
      <PageHeader
        eyebrow={contentSectionLabel(route.section)}
        title={route.title}
        description={route.description}
        breadcrumbs={[
          { href: "/", label: "Ana səhifə" },
          { href: route.path, label: route.title },
        ]}
      />

      {/* Fallback: məzmun cədvəli + iki uzun məqalə bloku ≈ real hündürlük. */}
      <Suspense fallback={<PageSkeleton variant="article" count={4} header={false} announce={false} />}>
        <SectionBody route={route} />
      </Suspense>
    </div>
  );
}

/** ⚠️ TƏLƏ C: sorğu sərhədin İÇİNDƏ — valideyn onu gözləmir. */
async function SectionBody({ route }: { route: Extract<ContentRoute, { kind: "section" }> }) {
  const pages = excludeLegal(await listSectionPages(route.section));

  return (
    <>
      {pages.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Məzmun hazırlanır"
          description="Bu bölmənin səhifələri hələ dərc olunmayıb."
          action={{ href: "/", label: "Açılış səhifəsi" }}
        />
      ) : (
        <>
          {/* Məzmun cədvəli — anchor-lar `#<slug>`. Uzun bölmədə ziyarətçi
              axtardığı başlığa birbaşa keçir; link paylaşıla biləndir. */}
          <nav aria-label="Bu səhifədə" className="rounded-card bg-ku-soft p-6">
            <p className="mb-3 text-small font-semibold text-ku-dark">Bu səhifədə</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {pages.map((page) => (
                <li key={page.id}>
                  <a
                    href={`#${page.slug}`}
                    className="text-small text-ku-dark underline-offset-4 hover:underline"
                  >
                    {page.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-8">
            {pages.map((page) => (
              <SectionArticle key={page.id} page={page} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function SectionArticle({ page }: { page: ContentPageDetail }) {
  const headingId = `${page.slug}-heading`;

  return (
    <article
      id={page.slug}
      aria-labelledby={headingId}
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-6 sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <h2 id={headingId} className="text-h2 font-semibold text-text-primary">
          {page.title}
        </h2>
        {page.excerpt ? (
          <p className="text-body text-text-secondary">{page.excerpt}</p>
        ) : null}
      </div>

      {/* ⚠️ `headingOffset={1}`: bölmə başlığı `<h2>`-dir, mətindəki `##` ona
          görə `<h3>` kimi render olunur — səviyyə atlanmır (WCAG 1.3.1). */}
      <Markdown source={page.body} headingOffset={1} />

      <p className="text-caption text-text-secondary">
        Son yenilənmə: {shortDate(page.updatedAt)}
      </p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Köməkçi bloklar
// ---------------------------------------------------------------------------

function RelatedRoutes({
  routes,
  sectionLabel,
}: {
  routes: ContentRoute[];
  sectionLabel: string;
}) {
  return (
    <section aria-labelledby="related-heading" className="flex flex-col gap-4">
      <h2 id="related-heading" className="text-h3 font-semibold text-text-primary">
        {sectionLabel} bölməsində daha nə var?
      </h2>

      <ul className="grid gap-4 sm:grid-cols-2">
        {routes.map((route) => (
          <li key={route.path}>
            <Link
              href={route.path}
              className="flex h-full flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-sm-kuds transition-colors hover:border-ku-green"
            >
              <span className="flex items-center gap-2 text-h4 font-medium text-text-primary">
                {route.title}
                <ArrowRight className="h-4 w-4 shrink-0 text-ku-green" aria-hidden />
              </span>
              <span className="text-small text-text-secondary">{route.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * ⚠️ TƏLƏ C: sorğu MƏHZ BURADA edilir. Valideyndə `await` edilib `count` prop
 * kimi ötürülsəydi yuxarıdakı `<Suspense>` heç nə etməzdi — data artıq
 * gözlənilmiş olardı və məqalə yenə də onu gözləyərdi.
 *
 * `fallback={null}` — qeyd bir sətirlik əlavə məlumatdır və çox vaxt
 * ümumiyyətlə göstərilmir (`count <= 1`). Boş yer saxlamaq real məzmun
 * gəlməyəndə DAİMİ boşluq qoyardı.
 */
async function SectionFootnote({
  section,
  sectionLabel,
}: {
  section: ContentSection;
  sectionLabel: string;
}) {
  const count = excludeLegal(await listSectionPages(section)).length;

  if (count <= 1) return null;

  return (
    <p className="text-caption text-text-secondary">
      «{sectionLabel}» bölməsində dərc olunmuş {count} səhifə var.
    </p>
  );
}
