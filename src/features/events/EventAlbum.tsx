"use client";

// ============================================================================
// src/features/events/EventAlbum.tsx
// Tədbirdən sonra foto albom (spec §14) — `MediaAsset(eventId)`.
//
// ⚠️ Fayllar `POST /api/upload`-a bir-bir göndərilir (lentdəki `MediaUploader`
// ilə eyni endpoint və eyni limitlər); `MediaAsset` sətri isə YALNIZ server
// action-da yaranır. İstifadəçi səhifəni yarımçıq bağlasa DB-də asılı qalmış
// media qeydi olmur.
//
// ⚠️ Yükləmə düyməsi YALNIZ idarə edənlərə göstərilir; albomun ÖZÜ hər kəsə
// açıqdır (tədbir onsuz da görünürlük filtrindən keçib).
// ============================================================================

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { addEventPhotosAction, removeEventPhotoAction } from "./actions";
import { MAX_EVENT_PHOTOS, eventPhotoSchema, type EventPhotoFormInput } from "./schemas";

interface AlbumPhoto {
  id: string;
  url: string;
  thumbUrl: string | null;
  caption: string | null;
}

interface EventAlbumProps {
  eventId: string;
  photos: AlbumPhoto[];
  canManage: boolean;
}

export function EventAlbum({ eventId, photos, canManage }: EventAlbumProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const busy = uploading || isPending;

  async function uploadOne(file: File): Promise<EventPhotoFormInput | null> {
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

    const parsed = eventPhotoSchema
      .omit({ caption: true })
      .safeParse(await response.json());

    if (!parsed.success) {
      toast.error(`«${file.name}» üçün cavab tanınmadı.`);
      return null;
    }

    return { ...parsed.data, caption: "" };
  }

  async function handleFiles(files: FileList | File[]) {
    const picked = Array.from(files).slice(0, MAX_EVENT_PHOTOS);
    if (picked.length === 0) return;

    setUploading(true);

    // Ardıcıl yüklənir: paralel getsə seçilmiş sıra pozula bilər.
    const uploaded: EventPhotoFormInput[] = [];
    for (const file of picked) {
      const photo = await uploadOne(file);
      if (photo) uploaded.push(photo);
    }

    setUploading(false);
    if (uploaded.length === 0) return;

    startTransition(async () => {
      const result = await addEventPhotosAction({ eventId, photos: uploaded });
      if (!result.ok) {
        toast.error(result.message ?? "Şəkillər əlavə edilmədi.");
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function remove(mediaId: string) {
    startTransition(async () => {
      const result = await removeEventPhotoAction({ eventId, mediaId });
      if (!result.ok) {
        toast.error(result.message ?? "Şəkil silinmədi.");
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="event-album"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="event-album" className="text-h4 font-medium text-text-primary">
            Foto albom
          </h2>
          <p className="text-small text-text-secondary">
            {photos.length} şəkil · tədbirdən sonra əlavə olunur.
          </p>
        </div>

        {canManage ? (
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden />
            )}
            Şəkil yüklə
          </Button>
        ) : null}
      </div>

      {canManage ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            void handleFiles(event.dataTransfer.files);
          }}
          className={cn(
            "rounded-card border border-dashed border-border bg-background px-6 py-4 text-center",
            "text-caption text-text-secondary transition-colors",
            isDragging && "border-ku-green bg-ku-soft/40",
          )}
        >
          Şəkilləri bura sürüşdürün · JPEG, PNG, WebP, GIF · maksimum 10 MB ·{" "}
          {MAX_EVENT_PHOTOS} şəkilə qədər
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              if (event.target.files) void handleFiles(event.target.files);
              // Eyni faylı təkrar seçmək mümkün olsun deyə input sıfırlanır.
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      {photos.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title="Albom hələ boşdur"
          description={
            canManage
              ? "Tədbirdən sonra şəkilləri buraya yükləyin — sinif xronologiyasında da görünəcək."
              : "Təşkilatçı şəkilləri yükləyəndə burada görünəcək."
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="group relative">
              <div className="relative aspect-square overflow-hidden rounded-card bg-background">
                <Image
                  src={photo.thumbUrl || photo.url}
                  alt={photo.caption ?? ""}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>

              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Şəkli sil"
                  disabled={busy}
                  className="absolute right-2 top-2 h-8 w-8 bg-surface text-danger-strong"
                  onClick={() => remove(photo.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              ) : null}

              {photo.caption ? (
                <p className="mt-1 line-clamp-2 text-caption text-text-secondary">
                  {photo.caption}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
