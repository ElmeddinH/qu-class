// ============================================================================
// src/features/welcome/WelcomePage.tsx
// Açılış səhifəsinin bütün məzmunu — `(public)/page.tsx` YALNIZ bunu render edir
// (CLAUDE.md §8: səhifə nazikdir, məntiq `features/`-dədir).
//
// 🔴 TƏLƏ E — SƏHİFƏ ANONİM VIEWER-LƏ OXUYUR.
// `ANONYMOUS` sabiti `lib/visibility.ts`-dəndir və `getViewer()` ÇAĞIRILMIR.
// Səbəb: `/` ictimai səhifədir və məzmunu ziyarətçidən ziyarətçiyə
// DƏYİŞMƏMƏLİDİR. Giriş etmiş istifadəçi üçün də anonim viewer işlədilir —
// sinif məzmunu `/home`-dadır. Bu, "girişdən sonra açılışda sinif postu
// göründü" tipli sızmanı STRUKTUR olaraq bağlayır: mühərrikə (`visibilityWhere`)
// anonim viewer verilir, o da yalnız `PUBLIC` seçir. Səhifədə ƏLAVƏ filtr
// YOXDUR.
//
// ⚠️ Sorğular PARALELDİR (`Promise.all`): yeddi ardıcıl `await` açılış
// səhifəsini SQLite-da lüzumsuz yavaşladardı.
//
// ⚠️ BÖLMƏ SIRASI ilə `LANDING_SECTIONS` SIRASI eyni olmaq MƏCBURİYYƏTİNDƏ
// deyil — anchor `id`-yə bağlıdır, sıraya yox. Amma hər `LANDING_SECTIONS`
// qeydinin bu səhifədə KARŞILIĞI OLMALIDIR, əks halda naviqasiya linki heç
// yerə aparar (`tests/e2e/public-nav.spec.ts` bunu bərkidir).
//
// ⚠️ «Qarşıdan gələn tədbirlər» bölməsi BOŞ HALDA DA render olunur (EmptyState
// ilə). Prompt "boşdursa gizlət" deyirdi, amma bölmə həm də `/#events`
// naviqasiya linkinin HƏDƏFİDİR (`nav.ts` → `PUBLIC_NAV`, `FOOTER_NAV`):
// gizlətsək link mövcud olmayan anchor-a apararlı — 404-dən pisdir, çünki
// səssizdir. Boş vəziyyət EmptyState ilə göstərilir, başlıq və anchor qalır.
// ============================================================================

import Link from "next/link";

import { PublicEventCards } from "@/components/shared/PublicEventCards";
import { ContentSection, MemoryType } from "@/lib/enums";
import { ANONYMOUS } from "@/lib/visibility";
import { getStructureCounts, listRegistrationCatalog } from "@/services/academic.service";
import {
  listContentPages,
  listFaqs,
  listGuidePlaces,
} from "@/services/content.service";
import { listEvents } from "@/services/event.service";
import { listMemories } from "@/services/memory.service";
import { listFeed } from "@/services/post.service";

import { AlumniQuote } from "./AlumniQuote";
import { ClosingCta } from "./ClosingCta";
import { CommunityStories } from "./CommunityStories";
import { ContentPageCards } from "./ContentPageCards";
import { FacultyAccordion } from "./FacultiesSection";
import { FaqAccordion } from "./FaqAccordion";
import { GuidePreviewCards } from "./GuidePreviewCards";
import { LatestNews } from "./LatestNews";
import { StructureStats } from "./StructureStats";
import { WelcomeHero } from "./WelcomeHero";
import { WelcomeSection } from "./WelcomeSection";
import {
  FAQ_PREVIEW_LIMIT,
  NEWS_LIMIT,
  NEWS_SECTION,
  NUMBERS_SECTION,
  PREVIEW_CARD_LIMIT,
  QUOTE_POOL_LIMIT,
  QUOTE_SECTION,
  STORIES_SECTION,
  STORY_LIMIT,
  landingSection,
} from "./sections";

export async function WelcomePage() {
  // 🔴 Anonim viewer — fayl başlığındaki TƏLƏ E qeydinə bax.
  const viewer = ANONYMOUS;

  const [
    counts,
    faculties,
    universityPages,
    campusPages,
    events,
    guidePlaces,
    faqs,
    stories,
    news,
    messageQuotes,
    gratitudeQuotes,
  ] = await Promise.all([
    getStructureCounts(),
    listRegistrationCatalog(),
    listContentPages(ContentSection.UNIVERSITY, PREVIEW_CARD_LIMIT),
    listContentPages(ContentSection.CAMPUS, PREVIEW_CARD_LIMIT),
    // `upcoming: true` + anonim viewer → yalnız PUBLIC və gələcək tədbirlər.
    listEvents(viewer, { upcoming: true, take: PREVIEW_CARD_LIMIT }),
    listGuidePlaces(undefined, PREVIEW_CARD_LIMIT),
    listFaqs(undefined, FAQ_PREVIEW_LIMIT),
    // 🔴 Üç CANLI blok — hamısı ANONİM viewer ilə (yalnız PUBLIC məzmun).
    listMemories(viewer, { take: STORY_LIMIT }),
    listFeed(viewer, { take: NEWS_LIMIT }),
    // ⚠️ Sitat hovuzu İKİ növdən yığılır və servis TƏK `type` qəbul edir, ona
    // görə iki sorğu paralel gedir və nəticə birləşdirilir. `OR` filtri əlavə
    // etmək `MemoryFilters`-ı yalnız bu bölmə üçün genişləndirmək demək idi.
    listMemories(viewer, { type: MemoryType.MESSAGE_TO_QU, take: QUOTE_POOL_LIMIT }),
    listMemories(viewer, { type: MemoryType.WHAT_UNI_GAVE_ME, take: QUOTE_POOL_LIMIT }),
  ]);

  // Sabit sıra: `id` üzrə — sitat seçimi gün nömrəsinə bağlıdır və hovuzun
  // sırası da deterministik olmalıdır (bax `AlumniQuote.pickRotatingIndex`).
  const quotes = [...messageQuotes, ...gratitudeQuotes].sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  const about = landingSection("about");
  const facultiesSection = landingSection("faculties");
  const campusLife = landingSection("campus-life");
  const khankendi = landingSection("khankendi");
  const eventsSection = landingSection("events");
  const faq = landingSection("faq");

  return (
    <div className="flex flex-col gap-16 py-8 md:py-12">
      <WelcomeHero counts={counts} />

      <WelcomeSection id={about.id} title={about.title} description={about.description}>
        <ContentPageCards
          pages={universityPages}
          emptyDescription="Universitet haqqında səhifələr hələ dərc olunmayıb."
        />
      </WelcomeSection>

      <WelcomeSection
        id={facultiesSection.id}
        title={facultiesSection.title}
        description={facultiesSection.description}
      >
        <FacultyAccordion faculties={faculties} />
      </WelcomeSection>

      <WelcomeSection
        id={NUMBERS_SECTION.id}
        title={NUMBERS_SECTION.title}
        description={NUMBERS_SECTION.description}
      >
        <StructureStats counts={counts} />
      </WelcomeSection>

      <WelcomeSection
        id={campusLife.id}
        title={campusLife.title}
        description={campusLife.description}
      >
        <ContentPageCards
          pages={campusPages}
          emptyDescription="Kampus həyatı haqqında səhifələr hələ dərc olunmayıb."
        />
      </WelcomeSection>

      {/* 🔴 ÜÇ CANLI BLOK (GW #12) — hər biri BOŞ HALDA GİZLƏNİR.
          Bu, «Qarşıdan gələn tədbirlər» bölməsindən fərqlidir: ora naviqasiya
          anchor-unun HƏDƏFİDİR və gizlətmək linki heç yerə aparardı. Bu üçünə
          isə heç bir link yoxdur (bax `sections.ts`). */}
      {stories.length > 0 ? (
        <WelcomeSection
          id={STORIES_SECTION.id}
          title={STORIES_SECTION.title}
          description={STORIES_SECTION.description}
        >
          <CommunityStories memories={stories} />
        </WelcomeSection>
      ) : null}

      {news.items.length > 0 ? (
        <WelcomeSection
          id={NEWS_SECTION.id}
          title={NEWS_SECTION.title}
          description={NEWS_SECTION.description}
        >
          <LatestNews posts={news.items} />
        </WelcomeSection>
      ) : null}

      <WelcomeSection
        id={eventsSection.id}
        title={eventsSection.title}
        description={eventsSection.description}
        aside={
          <Link href="/events" className="text-small text-ku-green hover:underline">
            Bütün açıq tədbirlər →
          </Link>
        }
      >
        <PublicEventCards events={events} />
      </WelcomeSection>

      <WelcomeSection
        id={khankendi.id}
        title={khankendi.title}
        description={khankendi.description}
      >
        <GuidePreviewCards places={guidePlaces} />
      </WelcomeSection>

      {quotes.length > 0 ? (
        <WelcomeSection
          id={QUOTE_SECTION.id}
          title={QUOTE_SECTION.title}
          description={QUOTE_SECTION.description}
        >
          <AlumniQuote quotes={quotes} />
        </WelcomeSection>
      ) : null}

      <WelcomeSection
        id={faq.id}
        title={faq.title}
        description={faq.description}
        aside={
          <Link href="/faq" className="text-small text-ku-green hover:underline">
            Bütün suallar →
          </Link>
        }
      >
        <FaqAccordion items={faqs} />
      </WelcomeSection>

      <ClosingCta />
    </div>
  );
}
