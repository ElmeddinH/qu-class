"use client";

// ============================================================================
// src/components/kuds/use-dialog-focus-restore.ts
// Modal bağlananda fokusu ONU AÇAN elementə qaytarır (WCAG 2.4.3 — Fokus sırası).
//
// 🔴 TƏLƏ T44 — RADIX `Dialog` FOKUSU YALNIZ `DialogTrigger` OLANDA QAYTARIR.
// Radix-in `DialogContent`-i daxilində belə yazılıb:
//     onCloseAutoFocus = (event) => { event.preventDefault();
//                                     context.triggerRef.current?.focus(); }
// Yəni brauzerin ÖZ bərpasını LƏĞV EDİR və fokusu `DialogTrigger`-ə qaytarır.
// `<DialogTrigger>` işlədilmirsə (bizdə 7 modaldan 6-sı `open`/`onOpenChange`
// ilə İDARƏ OLUNUR — tetikləyici ya başqa komponentdədir, ya da modal
// klaviatura qısayolu ilə açılır) `triggerRef` NULL olur: `preventDefault()`
// işləyir, `focus()` isə heç kimə getmir → fokus `<body>`-yə düşür.
//
// Nəticə istifadəçi üçün: Esc-dən sonra növbəti Tab səhifənin ƏN BAŞINDAN
// başlayır — klaviatura istifadəçisi hər modal bağlayanda yerini itirir.
// Blok 12C bunu ölçdü (`tests/e2e/a11y-keyboard.spec.ts`).
//
// 🔴 NİYƏ `useEffect` İLƏ «AÇILANDA activeElement-i yadda saxla» İŞLƏMİR:
// Radix fokusu modalın İÇİNƏ öz effektində keçirir, valideynin effekti isə
// UŞAQLARDAN SONRA işləyir — yəni `open` dəyişəndə oxunan `document.activeElement`
// ARTIQ modalın içindədir. Ona görə burada `focusin` dinlənilir və modaldan
// KƏNARDA fokuslanan SON element yadda saxlanılır. Bu, tetikləyicinin harada
// olmasından asılı deyil.
//
// ⚠️ Element DOM-dan çıxıbsa (`isConnected === false`) heç nə edilmir —
// `preventDefault()` çağırılmır və Radix-in davranışı olduğu kimi qalır.
// ⚠️ `src/components/ui/` TOXUNULMUR: düzəliş çağırış nöqtəsindəki
// `onCloseAutoFocus` prop-u ilə verilir.
// ============================================================================

import { useCallback, useEffect, useRef } from "react";

/** Modal səthlərinin selektoru — Radix `Dialog` və `Sheet` hər ikisi bu roldadır. */
const OVERLAY_SELECTOR = '[role="dialog"], [role="alertdialog"]';

/**
 * `DialogContent`-in `onCloseAutoFocus` prop-una verilən idarəedici qaytarır.
 *
 * ```tsx
 * const restoreFocus = useDialogFocusRestore();
 * <DialogContent onCloseAutoFocus={restoreFocus}> … </DialogContent>
 * ```
 */
export function useDialogFocusRestore() {
  const lastOutside = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function remember(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      // Modalın İÇİNDƏKİ fokus yadda saxlanılmır — geri qayıdış nöqtəsi
      // yalnız kənardakı elementdir.
      if (target.closest(OVERLAY_SELECTOR)) return;
      lastOutside.current = target;
    }

    // `capture: true` — `focusin` qabarır, amma tutma fazasında dinləmək
    // aradakı komponentlərin `stopPropagation()` çağırışından qoruyur.
    document.addEventListener("focusin", remember, true);
    return () => document.removeEventListener("focusin", remember, true);
  }, []);

  return useCallback((event: Event) => {
    const node = lastOutside.current;
    if (!node || !node.isConnected) return;

    event.preventDefault();
    node.focus();
  }, []);
}
