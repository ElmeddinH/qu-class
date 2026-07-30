// ============================================================================
// src/features/welcome/FaqAccordion.tsx
// FAQ akkordeonu — yalnız DƏRC OLUNMUŞ suallar (`isPublished`).
//
// ⚠️ Sual mətni `AccordionTrigger`-dədir və `<h3>` DEYİL: trigger `<button>`-dur
// və shadcn onu `<h3>` içinə sarır (`AccordionHeader`). Ayrıca heading əlavə
// etsək iyerarxiya iki dəfə elan olunar.
//
// ⚠️ `type="single" collapsible` — bir dəfədə bir sual açıqdır. Uzun cavablar
// üçün "hamısı açıq" variantı mobil ekranda bölməni onlarla ekran uzunluğuna
// çevirərdi.
// ============================================================================

import { CircleQuestionMark } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqCategoryLabel } from "@/lib/labels";
import type { FaqItem } from "@/services/content.service";

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CircleQuestionMark}
        title="Sual yoxdur"
        description="Tez-tez verilən suallar hələ dərc olunmayıb."
      />
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      className="rounded-card border border-border bg-surface px-6"
    >
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id}>
          <AccordionTrigger className="text-left text-body font-medium text-text-primary">
            {item.question}
          </AccordionTrigger>

          <AccordionContent>
            <div className="flex flex-col gap-2 pb-2">
              <span className="w-fit rounded-badge bg-ku-blue px-3 py-1 text-caption text-text-primary">
                {faqCategoryLabel(item.category)}
              </span>
              <p className="text-body text-text-secondary">{item.answer}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
