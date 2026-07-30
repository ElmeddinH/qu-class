// ============================================================================
// src/features/where-are-we-now/StatsTable.tsx
// 🔴 ƏLÇATANLIQ (KUDS §21 / WCAG 2.2 — 1.1.1 və 1.4.1):
// XƏRİTƏ VƏ QRAFİK TƏK MƏLUMAT MƏNBƏYİ OLA BİLMƏZ.
//
// SVG xəritə ekran oxuyucusu üçün praktiki olaraq boşdur, rəng şkalası isə
// rəng görmə fərqi olan istifadəçi üçün oxunmur. Ona görə HƏR vizualın altında
// EYNİ məlumatın `<table>` versiyası var (açılan «Cədvəl kimi göstər»).
//
// ⚠️ Cədvəl vizualdan TÖRƏMİR, İKİSİ DƏ eyni `StatsCell`-dən gəlir — ayrı
// hesablama olsaydı iki mənbə bir müddət sonra fərqlənərdi.
//
// ⚠️ «Açıqlanmayan» sətri həmişə göstərilir (sıfır olsa da): oxucu cəmin
// respondent sayına bərabər olduğunu YOXLAYA bilməlidir — bu, məxfilik
// mexanizminin şəffaflığıdır, gizlədilmiş sətirlərin səssizcə atılması deyil.
// ============================================================================

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UNDISCLOSED_LABEL } from "@/lib/career-stats";

export interface StatsTableRow {
  label: string;
  count: number;
}

interface StatsTableProps {
  caption: string;
  /** İlk sütunun başlığı — "Şəhər", "Ölkə", "Şirkət"… */
  columnLabel: string;
  rows: StatsTableRow[];
  /** k-anonimliklə gizlədilmiş + məlumat bildirilməyən sətirlərin cəmi. */
  undisclosedCount: number;
  /** Bütün sətirlərin cəmi — cədvəlin altındaki yekun. */
  total: number;
}

export function StatsTable({
  caption,
  columnLabel,
  rows,
  undisclosedCount,
  total,
}: StatsTableProps) {
  return (
    <Table>
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{columnLabel}</TableHead>
          <TableHead scope="col" className="text-right">
            Nəfər
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item) => (
          <TableRow key={item.label}>
            <TableCell className="font-medium text-text-primary">{item.label}</TableCell>
            <TableCell className="text-right tabular-nums">{item.count}</TableCell>
          </TableRow>
        ))}

        <TableRow>
          <TableCell className="text-text-secondary">{UNDISCLOSED_LABEL}</TableCell>
          <TableCell className="text-right tabular-nums text-text-secondary">
            {undisclosedCount}
          </TableCell>
        </TableRow>

        <TableRow>
          <TableCell className="font-semibold text-text-primary">Cəmi</TableCell>
          <TableCell className="text-right font-semibold tabular-nums text-text-primary">
            {total}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
