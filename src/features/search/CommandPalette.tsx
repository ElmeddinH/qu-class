"use client";

// ============================================================================
// src/features/search/CommandPalette.tsx
// ⌘K / Ctrl+K qlobal axtarış palitrası [M16] — shadcn `command` (cmdk) üzərində.
//
// Header-dəki axtarış sahəsi ARTIQ İNPUT DEYİL: o, bu palitranı açan düymədir
// (`DashboardShell`). Səbəb — iki ayrı axtarış sahəsi (header input + palitra)
// istifadəçini çaşdırır və ikisini sinxron saxlamaq lazım gəlir.
//
// ⚠️ `shouldFilter={false}` MƏCBURİDİR: cmdk standart olaraq nəticələri
// ÖZÜ süzür (fuzzy match). Bizim nəticələr serverdən artıq süzülmüş gəlir və
// məxfilik şərtindən keçmişdir; cmdk-nın öz süzgəci onları ikinci dəfə ataraq
// "server tapdı, ekranda yoxdur" vəziyyəti yaradır.
//
// ⚠️ `DialogContent` özündə başlıq render etmir; Radix isə `DialogTitle`
// tələb edir (əks halda konsolda a11y xəbərdarlığı çıxır). Ona görə
// `CommandDialog` primitivi əvəzinə Dialog + Command əl ilə birləşdirilir —
// `ui/` faylına toxunmadan (CLAUDE.md §1).
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MIN_SEARCH_LENGTH, searchResultCount } from "@/lib/search";
import { useDialogFocusRestore } from "@/components/kuds/use-dialog-focus-restore";

import { SEARCH_GROUPS, SEARCH_ICONS } from "./catalog";
import { useSearchQuery } from "./useSearchQuery";

interface CommandPaletteProps {
  /** Header düyməsində görünən mətn. */
  placeholder?: string;
}

export function CommandPalette({ placeholder = "Axtar..." }: CommandPaletteProps) {
  // TƏLƏ T44 — modal bağlananda fokus tetikləyiciyə qayıtsın.
  const restoreFocus = useDialogFocusRestore();

  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const { results, isLoading, isTooShort } = useSearchQuery(term);
  const total = searchResultCount(results);

  // ⌘K (macOS) / Ctrl+K (Windows, Linux)
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;

      event.preventDefault();
      setOpen((previous) => !previous);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={placeholder}
        className="flex h-9 w-full items-center gap-2 rounded-input border border-border bg-surface px-3 text-small text-text-secondary transition-colors hover:border-ku-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ku-green"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{placeholder}</span>
        <kbd className="ml-auto hidden shrink-0 rounded-btn border border-border px-1.5 text-caption text-text-secondary lg:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-2xl" onCloseAutoFocus={restoreFocus}>
          <DialogTitle className="sr-only">Qlobal axtarış</DialogTitle>

          <Command shouldFilter={false} className="rounded-modal">
            <CommandInput
              value={term}
              onValueChange={setTerm}
              placeholder="Sinif yoldaşı, paylaşım, tədbir və ya nailiyyət axtar..."
            />

            <CommandList>
              {isTooShort ? (
                <div className="px-4 py-6 text-center text-small text-text-secondary">
                  Axtarmaq üçün ən azı {MIN_SEARCH_LENGTH} hərf yazın.
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-small text-text-secondary">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  Axtarılır...
                </div>
              ) : total === 0 ? (
                <CommandEmpty>Nəticə tapılmadı.</CommandEmpty>
              ) : (
                <>
                  {SEARCH_GROUPS.map((group) => {
                    const hits = results[group.key];
                    if (hits.length === 0) return null;

                    const Icon = SEARCH_ICONS[group.icon];

                    return (
                      <CommandGroup key={group.key} heading={group.label}>
                        {hits.map((hit) => (
                          <CommandItem
                            key={`${group.key}:${hit.id}`}
                            value={`${group.key}:${hit.id}`}
                            onSelect={() => go(hit.href)}
                            className="cursor-pointer gap-3"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-text-primary">{hit.title}</span>
                              {hit.subtitle ? (
                                <span className="truncate text-caption text-text-secondary">
                                  {hit.subtitle}
                                </span>
                              ) : null}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    );
                  })}

                  <CommandSeparator />

                  <CommandGroup>
                    <CommandItem
                      value="__all__"
                      onSelect={() => go(`/search?q=${encodeURIComponent(term.trim())}`)}
                      className="cursor-pointer gap-3"
                    >
                      <ArrowRight className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                      Hamısına bax
                      <CommandShortcut>Enter</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
