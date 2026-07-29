"use client";

// ============================================================================
// src/features/feed/MediaUploader.tsx
// Şəkil yükləmə sahəsi — sürüklə-burax, çoxlu fayl, önizləmə, sıralama.
//
// Fayllar `POST /api/upload`-a bir-bir göndərilir və cavab (`MediaAsset`
// sahələri) formada saxlanılır. Sətir `createPost` transaksiyasında yaranır —
// istifadəçi formu yarımçıq qoyarsa DB-də asılı qalmış media qeydi olmur
// (diskdə fayl qalır, təmizləmə Blok 12-nin işidir).
//
// ⚠️ Sıralama düymələrlə (yuxarı/aşağı) edilir, sürükləyərək yox: klaviatura
// ilə istifadə pulsuz alınır və `MediaAsset.order` serverdə massivin
// ARDICILLIĞINDAN hesablanır (bax actions.ts → `toMediaData`).
// ============================================================================

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaType } from "@/lib/enums";
import { cn } from "@/lib/utils";

import { formatBytes } from "./format";
import {
  MAX_MEDIA_PER_POST,
  uploadResponseSchema,
  type MediaAssetInput,
} from "./schemas";

interface MediaUploaderProps {
  /** Xarici `<Label htmlFor>` ilə bağlanan fayl input-unun `id`-si. */
  inputId: string;
  value: MediaAssetInput[];
  onChange: (next: MediaAssetInput[]) => void;
  onCaptionChange: (index: number, caption: string) => void;
  disabled?: boolean;
  /** Zod-dan gələn səhv (məs. "Ən azı bir şəkil əlavə edin."). */
  error?: string;
}

export function MediaUploader({
  inputId,
  value,
  onChange,
  onCaptionChange,
  disabled = false,
  error,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);

  const isBusy = uploadingCount > 0;
  const remaining = MAX_MEDIA_PER_POST - value.length;

  async function uploadOne(file: File): Promise<MediaAssetInput | null> {
    const body = new FormData();
    body.append("file", file);

    const response = await fetch("/api/upload", { method: "POST", body });

    if (!response.ok) {
      // Sessiya bitibsə Next `/login`-ə yönləndirir — cavab JSON olmur.
      const message = await response
        .json()
        .then((data: { error?: string }) => data.error)
        .catch(() => null);
      toast.error(message ?? `«${file.name}» yüklənmədi.`);
      return null;
    }

    const parsed = uploadResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      toast.error(`«${file.name}» üçün cavab tanınmadı.`);
      return null;
    }

    return { ...parsed.data, caption: "", order: 0 };
  }

  async function handleFiles(files: FileList | File[]) {
    const picked = Array.from(files);
    if (picked.length === 0) return;

    if (remaining <= 0) {
      toast.error(`Bir paylaşımda maksimum ${MAX_MEDIA_PER_POST} şəkil ola bilər.`);
      return;
    }

    const accepted = picked.slice(0, remaining);
    if (accepted.length < picked.length) {
      toast.warning(`Yalnız ${accepted.length} şəkil qəbul edildi (limit ${MAX_MEDIA_PER_POST}).`);
    }

    setUploadingCount((count) => count + accepted.length);

    // Ardıcıl yüklənir: paralel getsə istifadəçinin seçdiyi sıra pozula bilər.
    const uploaded: MediaAssetInput[] = [];
    for (const file of accepted) {
      const asset = await uploadOne(file);
      if (asset) uploaded.push(asset);
      setUploadingCount((count) => count - 1);
    }

    if (uploaded.length > 0) onChange([...value, ...uploaded]);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* --- Buraxma sahəsi --- */}
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) void handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-card border border-dashed",
          "border-border bg-background px-6 py-8 text-center transition-colors",
          isDragging && "border-ku-green bg-ku-soft/40",
          error && "border-danger",
          disabled && "opacity-50",
        )}
      >
        <ImagePlus className="h-6 w-6 text-text-secondary" aria-hidden />
        <p className="text-small text-text-secondary">
          Şəkilləri bura sürüşdürün və ya faylları seçin
        </p>
        <p className="text-caption text-text-secondary">
          JPEG, PNG, WebP, GIF · maksimum 10 MB · {MAX_MEDIA_PER_POST} şəkilə qədər
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isBusy || remaining <= 0}
          onClick={() => inputRef.current?.click()}
        >
          {isBusy ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              Yüklənir…
            </>
          ) : (
            "Şəkil seç"
          )}
        </Button>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            if (event.target.files) void handleFiles(event.target.files);
            // Eyni faylı təkrar seçmək mümkün olsun deyə input sıfırlanır.
            event.target.value = "";
          }}
        />
      </div>

      {error ? <p className="text-small text-danger-strong">{error}</p> : null}

      {/* --- Önizləmə və sıralama --- */}
      {value.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {value.map((asset, index) => (
            <li
              key={asset.url}
              className="flex items-start gap-3 rounded-card border border-border bg-surface p-3"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-input bg-background">
                <Image
                  src={asset.thumbUrl || asset.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-caption text-text-secondary">
                  {index + 1}. şəkil · {asset.width}×{asset.height} ·{" "}
                  {formatBytes(asset.sizeBytes)}
                  {asset.type === MediaType.IMAGE ? "" : ` · ${asset.type}`}
                </p>
                <Input
                  value={asset.caption}
                  placeholder="Şəkil altyazısı (istəyə bağlı)"
                  aria-label={`${index + 1}. şəklin altyazısı`}
                  disabled={disabled}
                  onChange={(event) => onCaptionChange(index, event.target.value)}
                />
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`${index + 1}. şəkli yuxarı daşı`}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  <ChevronUp className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`${index + 1}. şəkli aşağı daşı`}
                  disabled={disabled || index === value.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-danger-strong"
                  aria-label={`${index + 1}. şəkli sil`}
                  disabled={disabled}
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
