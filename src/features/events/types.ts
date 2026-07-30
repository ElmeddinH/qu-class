// ============================================================================
// src/features/events/types.ts
// Tədbir özəlliyinin CLIENT ↔ SERVER sərhədini keçən yüngül tipləri.
//
// ⚠️ Client komponentləri `services/event.service.ts`-dən TİP import etməyə
// bilər — `import type` kompilyasiyada silinir, amma eyni fayldan qeyri-tip
// bir şey də götürülsə Prisma client paketi brauzer bundle-ına düşər. Seçim
// siyahıları kimi sadə formalar burada saxlanılır (eyni nümunə:
// `features/feed/types.ts`, `lib/search.ts`).
// ============================================================================

/** Formadakı açılan siyahıların ortaq forması (fakültə / klub / şəxs). */
export interface EventComposerOption {
  id: string;
  label: string;
}
