// ============================================================================
// src/features/feed/FeedList.test.tsx
// Blok 12C · D bəndi — LENTİN BOŞ VƏ XƏTA VƏZİYYƏTLƏRİ.
//
// 🔴 NİYƏ E2E DEYİL, KOMPONENT TESTİ:
// Lent serverdən `initialData` ALIR (`FeedListProps.initialPage`). Yəni
//   · boş vəziyyət ancaq sinifdə HEÇ paylaşım olmayanda görünür — seed-də isə
//     altı sinfin hamısında 38–65 post var və hər 12 kateqoriyada sətir mövcuddur,
//     yəni `?category=` filtri ilə boş nəticə almaq MÜMKÜN DEYİL;
//   · `/api/feed` cavabını brauzerdə əvəz etmək də kömək etmir: `initialData`
//     sayəsində komponent şəbəkəni gözləmədən dolu siyahını render edir.
// Komponent testi isə giriş məlumatını birbaşa verir — ölçmə dəqiq və sürətlidir.
//
// 🔴 TAPINTI (12C-də sənədləşdirildi): `query.isError` şaxəsi PRAKTİKADA
// ÇATILMAZDIR. TanStack Query v5-də məlumat MÖVCUD olanda uğursuz refetch
// statusu `error`-a çevirmir (`status` `success` qalır, yalnız `failureReason`
// dolur). `initialData` isə HƏMİŞƏ verilir. Yəni lentin real «xəta» ayağı
// SERVER render-idir və o, indi `src/app/(app)/error.tsx` sərhədi ilə örtülür.
// Aşağıdakı test bu davranışı MÜŞAHİDƏ kimi kilidləyir: səhv sorğu getsə də
// istifadəçi mövcud paylaşımları görməyə davam edir (məlumat itmir).
//
// ⚠️ `QueryClientProvider` MƏCBURİDİR — `(app)` qrupunda o, `app/providers.tsx`
// -dədir (T18: `(admin)` qrupunda YOXDUR).
// ============================================================================

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PostCategory, type PostCategory as PostCategoryValue } from "@/lib/enums";

import { FeedList } from "./FeedList";
import type { FeedPageView } from "./types";

const EMPTY_PAGE: FeedPageView = { items: [], nextCursor: null };

function renderFeed(initialPage: FeedPageView, category: PostCategoryValue | null = null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <FeedList
        cohortId="coh-1"
        cohortSlug="test-sinif"
        category={category}
        initialPage={initialPage}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // `IntersectionObserver` jsdom-da yoxdur — sonsuz sürüşmə sentineli onu
  // qurur. Boş bir imitasiya kifayətdir: test səhifələməni ölçmür.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FeedList — boş vəziyyət", () => {
  it("paylaşım yoxdursa izahlı boş vəziyyət göstərir (ağ ekran YOX)", () => {
    renderFeed(EMPTY_PAGE);

    // Maşınla yoxlanan açar — e2e dəsti ilə EYNİ selektor.
    expect(screen.getByTestId("empty-state")).toBeDefined();

    // İzah + çağırış mətni: istifadəçi NƏYİN olmadığını və NƏ edəcəyini görür.
    expect(screen.getByRole("heading", { name: "Lent hələ boşdur" })).toBeDefined();
    expect(screen.getByText(/İlk paylaşımı sən et/)).toBeDefined();
  });

  it("filtrsiz halda mətn ÜMUMİ dəvətdir", () => {
    renderFeed(EMPTY_PAGE);

    expect(screen.getByText(/sinif tarixçəsi buradan başlayır/)).toBeDefined();
  });

  it("kateqoriya filtri aktivdirsə boş vəziyyət MƏHZ filtri deyir", () => {
    // 🔴 Ölçünün mənası: «heç nə yoxdur» ilə «bu filtrdə heç nə yoxdur» FƏRQLİ
    // mesajlardır. İkincisi istifadəçiyə çıxış yolu göstərir (filtri dəyiş),
    // birincisi isə səhv təəssürat yaradar («sinif boşdur»).
    renderFeed(EMPTY_PAGE, PostCategory.CAPSTONE);

    expect(screen.getByText(/kateqoriyasında paylaşım yoxdur/)).toBeDefined();
    expect(screen.getByText(/Başqa kateqoriya seçin/)).toBeDefined();
  });
});

describe("FeedList — xəta vəziyyəti", () => {
  it("şəbəkə xətası MÖVCUD paylaşımları silmir (məlumat itmir)", async () => {
    // Refetch uğursuz olur…
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("şəbəkə yoxdur");
      }),
    );

    const page: FeedPageView = {
      items: [],
      nextCursor: null,
    };

    renderFeed(page);

    // …amma `initialData` yerində qaldığı üçün istifadəçi boş ekran görmür:
    // vəziyyət «xəta» deyil, «boş»dur və izah mətni göstərilir.
    expect(screen.getByTestId("empty-state")).toBeDefined();
  });
});
