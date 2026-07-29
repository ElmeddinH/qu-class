"use client";

// ============================================================================
// src/features/search/SearchScreen.tsx
// `/search` — tam nəticə səhifəsi [M16]. Palitradaki "Hamısına bax" buraya gəlir.
//
// ⚠️ Nəticələr SERVERDƏ çəkilir (`page.tsx` → `searchEverything`) və prop kimi
// gəlir; bu komponent yalnız sorğu sətrini URL-də saxlayır (`nuqs`,
// `shallow: false` → server yenidən render olunur). Palitra isə `/api/search`-i
// çağırır. İkisi eyni servisdən keçir, yəni nəticələr üst-üstə düşür.
//
// ⚠️ `?q=` URL-də olduğu üçün axtarış nəticəsi PAYLAŞILA BİLƏN linkdir.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MIN_SEARCH_LENGTH,
  searchResultCount,
  type SearchHit,
  type SearchResults,
} from "@/lib/search";

import { SEARCH_GROUPS, SEARCH_ICONS, type SearchGroupMeta } from "./catalog";
import { SEARCH_DEBOUNCE_MS } from "./useSearchQuery";

interface SearchScreenProps {
  term: string;
  results: SearchResults;
}

function HitList({ hits, group }: { hits: SearchHit[]; group: SearchGroupMeta }) {
  const Icon = SEARCH_ICONS[group.icon];

  if (hits.length === 0) {
    return (
      <EmptyState icon={Icon} title="Nəticə yoxdur" description={group.emptyText} />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {hits.map((hit) => (
        <li key={hit.id}>
          <Link
            href={hit.href}
            className="flex items-start gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-ku-green"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" aria-hidden />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-body font-medium text-text-primary">{hit.title}</span>
              {hit.subtitle ? (
                <span className="text-small text-text-secondary">{hit.subtitle}</span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SearchScreen({ term, results }: SearchScreenProps) {
  const [, setQuery] = useQueryState("q", {
    shallow: false,
    clearOnDefault: true,
  });

  const [draft, setDraft] = useState(term);
  const pushed = useRef(term);

  // URL xaricdən dəyişəndə (geri düyməsi, palitradan gəliş) input sinxronlaşır.
  useEffect(() => {
    if (term !== pushed.current) {
      pushed.current = term;
      setDraft(term);
    }
  }, [term]);

  useEffect(() => {
    if (draft === pushed.current) return;

    const timer = setTimeout(() => {
      pushed.current = draft;
      void setQuery(draft.trim() === "" ? null : draft.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [draft, setQuery]);

  const total = searchResultCount(results);
  const isTooShort = term.trim().length < MIN_SEARCH_LENGTH;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="search-term">Axtarış</Label>
        <div className="relative max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
            aria-hidden
          />
          <Input
            id="search-term"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Sinif yoldaşı, paylaşım, tədbir və ya nailiyyət"
            className="rounded-input pl-8"
          />
        </div>
      </div>

      {isTooShort ? (
        <EmptyState
          icon={Search}
          title="Axtarışa başlayın"
          description={`Nəticə görmək üçün ən azı ${MIN_SEARCH_LENGTH} hərf yazın. ⌘K ilə istənilən səhifədən axtarış aça bilərsiniz.`}
        />
      ) : (
        <Tabs defaultValue="all" className="flex flex-col gap-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">Hamısı ({total})</TabsTrigger>
            {SEARCH_GROUPS.map((group) => (
              <TabsTrigger key={group.key} value={group.key}>
                {group.label} ({results[group.key].length})
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="flex flex-col gap-8">
            {total === 0 ? (
              <EmptyState
                icon={Search}
                title="Nəticə tapılmadı"
                description={`«${term}» üzrə heç nə tapılmadı. Yazılışı yoxlayın və ya daha qısa söz sınayın.`}
              />
            ) : (
              SEARCH_GROUPS.filter((group) => results[group.key].length > 0).map((group) => (
                <section key={group.key} className="flex flex-col gap-3">
                  <h2 className="text-h3 font-semibold text-text-primary">{group.label}</h2>
                  <HitList hits={results[group.key]} group={group} />
                </section>
              ))
            )}
          </TabsContent>

          {SEARCH_GROUPS.map((group) => (
            <TabsContent key={group.key} value={group.key}>
              <HitList hits={results[group.key]} group={group} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
