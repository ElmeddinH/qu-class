// ============================================================================
// src/features/class-home/registry.ts
// Widget id → SERVER komponenti uyğunluğu.
//
// Sıra və en məlumatı burada DEYİL — `order.ts`-dədir (o, komponent import
// etmir və vahid testlə örtülüdür). Bu fayl yalnız naqilləmədir.
//
// ⚠️ Cədvəl `Record<ClassHomeWidgetId, …>` tipindədir: `order.ts`-ə yeni widget
// id-si əlavə edilsə `tsc` MƏHZ BURADA dayanır və widget səssizcə render
// olunmamış qalmır.
//
// ⚠️ Komponentlər burada FUNKSİYA kimi saxlanılır (ikon reyestrlərindən fərqli
// olaraq) və bu təhlükəsizdir: reyestri yalnız server komponentləri oxuyur,
// server → client sərhədi keçilmir (CLAUDE.md §12). Bu faylı client
// komponentinə İMPORT ETMƏ.
// ============================================================================

import { CampusPrep } from "./incoming/CampusPrep";
import { IntroWizard } from "./incoming/IntroWizard";
import { KhankendiGuideCard } from "./incoming/KhankendiGuideCard";
import { SimilarMembers } from "./incoming/SimilarMembers";
import type { ClassHomeWidgetId } from "./order";
import type { ClassHomeWidgetProps } from "./types";
import { CreateEventCta } from "./widgets/CreateEventCta";
import { CreatePostCta } from "./widgets/CreatePostCta";
import { DirectoryLink } from "./widgets/DirectoryLink";
import { FeedPreview } from "./widgets/FeedPreview";
import { NewMembers } from "./widgets/NewMembers";
import { RecentAchievements } from "./widgets/RecentAchievements";
import { RecentMemories } from "./widgets/RecentMemories";
import { RecentTimeline } from "./widgets/RecentTimeline";
import { Reunions } from "./widgets/Reunions";
import { SupportOffers } from "./widgets/SupportOffers";
import { UpcomingEvents } from "./widgets/UpcomingEvents";
import { WelcomeMessage } from "./widgets/WelcomeMessage";
import { WhereAreWeNowSummary } from "./widgets/WhereAreWeNowSummary";

/** Async server komponenti də qaytara bilər — `Suspense` onu tutur. */
export type ClassHomeWidgetComponent = (
  props: ClassHomeWidgetProps,
) => React.ReactNode | Promise<React.ReactNode>;

export const CLASS_HOME_WIDGET_COMPONENTS: Record<
  ClassHomeWidgetId,
  ClassHomeWidgetComponent
> = {
  // --- spec §16 blok 4-14 ---
  "welcome-message": WelcomeMessage,
  "upcoming-events": UpcomingEvents,
  "feed-preview": FeedPreview,
  "recent-achievements": RecentAchievements,
  "recent-timeline": RecentTimeline,
  "new-members": NewMembers,
  "recent-memories": RecentMemories,
  "directory-link": DirectoryLink,
  "where-are-we-now": WhereAreWeNowSummary,
  "create-event": CreateEventCta,
  "create-post": CreatePostCta,

  // --- INCOMING ---
  "intro-wizard": IntroWizard,
  "similar-members": SimilarMembers,
  "campus-prep": CampusPrep,
  "khankendi-guide": KhankendiGuideCard,

  // --- ALUMNI ---
  "reunions": Reunions,
  "support-offers": SupportOffers,
};
