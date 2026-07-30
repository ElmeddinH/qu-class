"use client";

// ============================================================================
// src/features/admin/SisImportScreen.tsx
// `/admin/import` — SIS CSV importu (TƏLƏ E).
//
// ────────────────────────────────────────────────────────────────────────────
// İKİ MƏRHƏLƏ: fayl yüklə → ÖNİZLƏMƏ → «Təsdiqlə»
// ────────────────────────────────────────────────────────────────────────────
//   · Önizləmə BAZAYA YAZMIR — hər sətir üçün nəticə göstərilir (yaşıl =
//     yaradılacaq, sarı = yenilənəcək, qırmızı = rədd + SƏBƏB + SƏTİR NÖMRƏSİ).
//   · «Təsdiqlə» yalnız önizlədilən faylı yazır: `token` fayl məzmunundan
//     törəyir və serverdə yenidən hesablanır (başqa fayl seçilsə uyğunsuzluq
//     tapılır).
//   · Faylda BİR rədd edilmiş sətir varsa yazı ÜMUMİYYƏTLƏ getmir.
//
// 🔴 ŞİFRƏ SÜTUNU parse mərhələsində rədd olunur (`lib/sis-import.ts`) —
// ekranda səbəb açıq yazılır.
//
// ⚠️ Fayl BRAUZERDƏ oxunur (`File.text()`), serverə MƏTN kimi gedir: ayrıca
// yükləmə endpoint-i və orada təkrar icazə yoxlaması lazım gəlmir.
// ============================================================================

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardHeading } from "@/components/kuds/SectionCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CSV_BOM_BYTES } from "@/lib/csv";
import {
  SIS_COLUMNS,
  SIS_MAX_BYTES,
  SIS_MIME_TYPE,
  SIS_TEMPLATE_CSV,
} from "@/lib/sis-import";
import { cn } from "@/lib/utils";
import type { SisPreview, SisPreviewRow } from "@/services/sis-import.service";

import { commitImportAction, previewImportAction } from "./actions";

const OUTCOME_META: Record<
  SisPreviewRow["outcome"],
  { label: string; className: string }
> = {
  CREATE: { label: "Yaradılacaq", className: "border-success bg-success/10" },
  UPDATE: { label: "Yenilənəcək", className: "border-warning bg-warning/10" },
  REJECT: { label: "Rədd edildi", className: "border-danger bg-danger/10" },
};

export function SisImportScreen() {
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<SisPreview | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const onFile = async (file: File | null) => {
    setPreview(null);
    setCsv(null);
    setFileName(null);
    if (!file) return;

    if (file.size > SIS_MAX_BYTES) {
      toast.error(`Fayl çox böyükdür (maksimum ${SIS_MAX_BYTES / 1024 / 1024} MB).`);
      return;
    }

    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
  };

  const runPreview = () => {
    if (csv === null) return;
    startTransition(async () => {
      const result = await previewImportAction({ csv });
      if (!result.ok || result.value === undefined) {
        toast.error(result.message ?? "Fayl oxunmadı.");
        setPreview(null);
        return;
      }
      setPreview(result.value);
      toast.success("Önizləmə hazırdır. Baza HƏLƏ dəyişməyib.");
    });
  };

  const runCommit = () => {
    if (csv === null || preview === null) return;
    startTransition(async () => {
      const result = await commitImportAction({ csv, token: preview.token });
      if (!result.ok) {
        toast.error(result.message ?? "Yazı alınmadı.");
        return;
      }
      toast.success(result.message ?? "İdxal tamamlandı.");
      setPreview(null);
      setCsv(null);
      setFileName(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  };

  const downloadTemplate = () => {
    const blob = new Blob([new Uint8Array(CSV_BOM_BYTES), SIS_TEMPLATE_CSV], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qu-class-sis-sablon.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardHeading>1. Fayl seçin</CardHeading>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sis-file">CSV faylı</Label>
            <input
              ref={inputRef}
              id="sis-file"
              type="file"
              accept={SIS_MIME_TYPE}
              onChange={(event) => void onFile(event.target.files?.[0] ?? null)}
              className="rounded-input border border-border bg-surface p-2 text-small text-text-primary file:mr-3 file:rounded-btn file:border-0 file:bg-ku-green file:px-3 file:py-1 file:text-white"
            />
          </div>

          <p className="text-caption text-text-secondary">
            Sütunlar: <code>{SIS_COLUMNS.join(", ")}</code>. Şifrə sütunu{" "}
            <strong>qəbul edilmir</strong> — hesab şifrəsiz yaradılır və istifadəçi
            onu qeydiyyat / bərpa axını ilə özü təyin edir.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || csv === null}
              onClick={runPreview}
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden />
              Önizləmə
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={downloadTemplate}>
              <FileDown className="mr-2 h-4 w-4" aria-hidden />
              Nümunə fayl
            </Button>
          </div>

          {fileName === null ? null : (
            <p className="text-caption text-text-secondary">Seçilmiş fayl: {fileName}</p>
          )}
        </CardContent>
      </Card>

      {preview === null ? null : (
        <Card>
          <CardHeader>
            <CardHeading>2. Önizləmə (baza hələ dəyişməyib)</CardHeading>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-normal">
                {preview.created} yaradılacaq
              </Badge>
              <Badge variant="outline" className="font-normal">
                {preview.updated} yenilənəcək
              </Badge>
              <Badge variant="outline" className="font-normal">
                {preview.rejected} rədd edildi
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-small">
                <caption className="sr-only">İdxal önizləməsi</caption>
                <thead className="border-b border-border text-left">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Sətir
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      E-poçt
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Ad
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Sinif
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Nəticə
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => {
                    const meta = OUTCOME_META[row.outcome];
                    return (
                      <tr
                        key={`${row.line}-${row.email}`}
                        className={cn("border-b border-border/60", meta.className)}
                      >
                        <th scope="row" className="px-3 py-2 text-left font-normal">
                          {row.line}
                        </th>
                        <td className="px-3 py-2">{row.email || "—"}</td>
                        <td className="px-3 py-2">{row.fullName || "—"}</td>
                        <td className="px-3 py-2">{row.cohortName ?? "—"}</td>
                        <td className="px-3 py-2">
                          <span className="font-medium">{meta.label}</span>
                          {row.message === null ? null : (
                            <span className="block text-caption">{row.message}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {preview.rejected > 0 ? (
              <p className="rounded-card border border-danger bg-danger/10 p-4 text-small text-text-primary">
                Faylda rədd edilmiş sətirlər var. <strong>Qismən yazı edilmir</strong> —
                səhvləri düzəldib faylı yenidən yükləyin.
              </p>
            ) : (
              <Button
                type="button"
                disabled={pending}
                onClick={runCommit}
                className="w-fit"
              >
                Təsdiqlə və yaz
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
