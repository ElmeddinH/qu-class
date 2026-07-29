// ============================================================================
// src/features/directory/labels.ts
// Kataloq filtrlərinin azərbaycanca etiketləri (CLAUDE.md §9).
//
// Facet dəyərlərinin etiketi ÜÇ mənbədən gəlir və prioritet bu sıradadır:
//   1. ENUM tərcüməsi — `industry`, `status` (dəyər `TECHNOLOGY`, etiket
//      "Texnologiya"). Servis enum-u tərcümə ETMİR: UI mətni servis qatına
//      aid deyil.
//   2. DB-dən gələn ad — fakültə, ixtisas, taq, klub (`option.label`).
//   3. Dəyərin özü — şəhər, ölkə, şirkət, il (onsuz da insan oxuyan mətndir).
//
// Modul SAFDIR: Prisma və React import etmir, `DirectoryFilters` (client) və
// çiplər (server) ikisi də işlədə bilir.
// ============================================================================

import { STAGE_META } from "@/features/class-home/catalog";
import type { DirectoryFilterKey } from "@/lib/directory-filters";
import { UserStageSchema } from "@/lib/enums";
import { industryLabel } from "@/lib/labels";
import type { DirectoryFacetOption } from "@/services/user.service";

/** Enum dəyəri olan facet-lər — tərcümə tələb edənlər. */
function enumLabel(key: DirectoryFilterKey, value: string): string | null {
  if (key === "industry") return industryLabel(value);

  if (key === "status") {
    const parsed = UserStageSchema.safeParse(value);
    return parsed.success ? STAGE_META[parsed.data].label : null;
  }

  return null;
}

/** Facet seçiminin göstərilən adı. */
export function facetOptionLabel(
  key: DirectoryFilterKey,
  option: DirectoryFacetOption,
): string {
  return enumLabel(key, option.value) ?? option.label ?? option.value;
}

/**
 * Aktiv filtr çipinin mətni — facet siyahısı OLMADAN da işləməlidir.
 *
 * ⚠️ Səbəb: URL-də elə bir dəyər ola bilər ki, cari filtr kombinasiyasında
 * facet-lər arasında yoxdur (məs. şəhər + klub birlikdə heç kimə uyğun gəlmir).
 * O zaman çip "naməlum" yazmamalıdır — dəyərin özünü göstərir, çünki
 * istifadəçi onu URL-dən görür.
 */
export function activeValueLabel(
  key: DirectoryFilterKey,
  value: string,
  facets: DirectoryFacetOption[],
): string {
  const known = facets.find((option) => option.value === value);
  if (known) return facetOptionLabel(key, known);

  return enumLabel(key, value) ?? value;
}
