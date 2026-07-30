"use client";

// ============================================================================
// src/features/admin/CsvDownloadButton.tsx
// CSV endirən ortaq düymə (KUDS §14 — cədvəl üçün məcburi «Export»).
//
// ⚠️ Fayl BRAUZERDƏ qurulur: server action yalnız MƏTNİ qaytarır. Belə olanda
// ayrıca route handler və orada TƏKRAR icazə yoxlaması lazım gəlmir (Blok 9-un
// `AttendeeTable` nümunəsi).
//
// ⚠️ BOM BAYTLARI `Blob`-un içində əlavə olunur, mətnə YOX. Səbəb `lib/csv.ts`
// → `CSV_BOM_BYTES`-dədir: U+FEFF mətn qatlarından keçəndə itir və Excel
// azərbaycan hərflərini zibil kimi göstərir.
// ============================================================================

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CSV_BOM_BYTES } from "@/lib/csv";

import type { AdminActionResult } from "./actions";

interface CsvDownloadButtonProps {
  label: string;
  /** Cari filtr vəziyyəti — ixrac EKRANDA GÖRÜNƏNİ verməlidir. */
  params: Record<string, string>;
  action: (
    input: unknown,
  ) => Promise<AdminActionResult<{ content: string; fileName: string }>>;
}

export function CsvDownloadButton({ label, params, action }: CsvDownloadButtonProps) {
  const [pending, startTransition] = useTransition();

  const download = () => {
    startTransition(async () => {
      const result = await action({ params });

      if (!result.ok || result.value === undefined) {
        toast.error(result.message ?? "İxrac alınmadı.");
        return;
      }

      const blob = new Blob([new Uint8Array(CSV_BOM_BYTES), result.value.content], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.value.fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(`${result.value.fileName} endirildi.`);
    });
  };

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={download}>
      <Download className="mr-2 h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}
