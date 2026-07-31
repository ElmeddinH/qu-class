// ============================================================================
// src/features/content/FaqScreen.tsx
// `/faq` — dörd kateqoriya, akkordeon, axtarış (spec §2, 9-cu bənd).
//
// 🔴 SÜZGƏC BURADA, DB-DƏ DEYİL — və bu, CLAUDE.md §5-ə ZİDD DEYİL.
// §5 qadağası MƏXFİLİK süzgəcinə aiddir: orada JS filtri həm sızma, həm sınmış
// səhifələmə deməkdir. FAQ isə tamamilə ictimai redaksiya məzmunudur (20
// sətir), məxfilik şərti YOXDUR və səhifələmə də yoxdur — bütün suallar tək
// sorğu ilə gəlir. Səbəb faylın oxunduğu yerdə yazılıb ki, gələcəkdə bu, "belə
// də olar" nümunəsi kimi başa düşülməsin.
//
// ⚠️ Kateqoriya süzgəci DB-yə ötürülür (`listFaqs(category)`), mətn axtarışı
// isə yaddaşda (`filterFaqs`) — hər ikisi eyni SAF moduldan (`lib/faq-filters`)
// gəlir, yəni URL ↔ nəticə uyğunluğu testlə ölçülür.
//
// ⚠️ Akkordeon `type="single" collapsible`: bir dəfədə bir cavab açıqdır
// (açılış səhifəsindəki FAQ ilə eyni davranış).
// ============================================================================

import Link from "next/link";
import { CircleQuestionMark } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  faqHref,
  filterFaqs,
  groupFaqsByCategory,
  type FaqFilterState,
} from "@/lib/faq-filters";
import { FAQ_CATEGORY_VALUES } from "@/lib/enums";
import { faqCategoryLabel } from "@/lib/labels";
import { FILTER_CHIP_BASE, filterChipTone } from "@/components/shared/filter-chip";
import { cn } from "@/lib/utils";
import { listFaqs } from "@/services/content.service";

import { FaqSearch } from "./FaqSearch";
import { PageHeader } from "./PageHeader";

/** Bütün suallar tək sorğu ilə gəlir — seed-də 20 sətir var. */
const FAQ_LIMIT = 100;

interface FaqScreenProps {
  filters: FaqFilterState;
}

export async function FaqScreen({ filters }: FaqScreenProps) {
  // Kateqoriya DB-yə ötürülür; mətn axtarışı yaddaşdadır (başlıqdaki qeyd).
  const all = await listFaqs(filters.category ?? undefined, FAQ_LIMIT);
  const matched = filterFaqs(all, filters);
  const groups = groupFaqsByCategory(matched);

  return (
    <div className="flex flex-col gap-8 py-8">
      <PageHeader
        eyebrow="Kömək"
        title="Tez-tez verilən suallar"
        description="Qeydiyyat, kampus həyatı, sinif səhifəsi və məxfilik parametrləri ilə bağlı ən çox verilən suallar."
        breadcrumbs={[
          { href: "/", label: "Ana səhifə" },
          { href: "/faq", label: "FAQ" },
        ]}
      />

      <div className="flex flex-col gap-6 rounded-card border border-border bg-surface p-6">
        <FaqSearch filters={filters} />

        <nav aria-label="Kateqoriya filtri" className="flex flex-wrap gap-2">
          <CategoryChip
            href={faqHref({ ...filters, category: null })}
            label="Hamısı"
            active={filters.category === null}
          />
          {FAQ_CATEGORY_VALUES.map((category) => (
            <CategoryChip
              key={category}
              href={faqHref({ ...filters, category })}
              label={faqCategoryLabel(category)}
              active={filters.category === category}
            />
          ))}
        </nav>

        <p className="text-small text-text-secondary" role="status">
          {matched.length} sual tapıldı
          {filters.query ? ` — «${filters.query}» üzrə` : ""}.
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={CircleQuestionMark}
          title="Uyğun sual tapılmadı"
          description="Başqa açar söz yoxlayın və ya kateqoriya filtrini sıfırlayın. Sualınız siyahıda yoxdursa dekanlığa yazın."
          action={{ href: faqHref({ category: null, query: null }), label: "Filtri sıfırla" }}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section
              key={group.category}
              aria-labelledby={`faq-${group.category}`}
              className="flex scroll-mt-24 flex-col gap-4"
              id={group.category.toLowerCase()}
            >
              <h2
                id={`faq-${group.category}`}
                className="text-h3 font-semibold text-text-primary"
              >
                {faqCategoryLabel(group.category)}
              </h2>

              <Accordion
                type="single"
                collapsible
                className="rounded-card border border-border bg-surface px-6"
              >
                {group.items.map((item) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger className="text-left text-body font-medium text-text-primary">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="pb-2 text-body text-text-secondary">{item.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      )}

      <p className="text-small text-text-secondary">
        Cavabını tapmadın?{" "}
        <Link href="/newcomers" className="kuds-prose-link">
          Yeni tələbələr üçün bələdçiyə
        </Link>{" "}
        bax və ya{" "}
        <Link href="/services" className="kuds-prose-link">
          tələbə xidmətləri
        </Link>{" "}
        səhifəsindən əlaqə saxla.
      </p>
    </div>
  );
}

function CategoryChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        FILTER_CHIP_BASE,
        filterChipTone(active),
      )}
    >
      {label}
    </Link>
  );
}
