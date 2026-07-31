// ============================================================================
// src/components/shared/filter-chip.ts
// Filtr «çipi»nin aktiv/passiv tonu — TƏK MƏNBƏ.
//
// 🔴 NİYƏ AYRICA MODUL: eyni sinif sətri beş ayrı ekranda (FAQ, Xankəndi
// bələdçisi, ictimai tədbirlər, bildirişlər, hüquqi səhifələr) KOPYALANMIŞDI və
// beşi də eyni WCAG pozuntusunu daşıyırdı. Bir yerdə düzəldib qalan dördünü
// unutmaq bu quruluşda mümkün deyil.
//
// 🔴 POZUNTU NƏ İDİ: passiv çip `bg-muted` (#E2E8F0) fonunda
// `text-text-secondary` (#64748B) işlədirdi → **3.86:1**, WCAG AA-nın 4.5:1
// həddindən aşağı (axe `color-contrast`, serious — Blok 12C ölçüsü).
//
// DÜZƏLİŞ İKİ QAT FAYDALIDIR:
//   · `bg-surface` (ağ) üzərində eyni mətn rəngi **4.76:1** verir ✓
//   · KUDS §11 «Secondary = Outline / Transparent Background» — passiv çipin
//     əsl KUDS forması onsuz da doldurulmuş boz deyil, sərhədli səthdir.
//
// ⚠️ Aktiv çipdə `border-transparent` var: sərhəd EN-i hər iki vəziyyətdə
// eynidir, yəni filtri dəyişəndə sətir 1px sürüşmür.
// ============================================================================

/** Çipin ölçü/forma hissəsi — hər iki vəziyyətdə eyni. */
export const FILTER_CHIP_BASE =
  "rounded-badge border px-3 py-1 text-small transition-colors";

/** Vəziyyətdən asılı rəng tonu. */
export function filterChipTone(active: boolean): string {
  return active
    ? "border-transparent bg-ku-green font-medium text-white"
    : "border-border bg-surface text-text-secondary hover:bg-ku-soft hover:text-ku-dark";
}
