// ============================================================================
// src/app/api/upload/route.ts
// Şəkil yükləmə endpoint-i — `multipart/form-data`.
//
// ⚠️ Route handler `prisma.*` ÇAĞIRMIR və faylla İŞLƏMİR: bütün iş
// `services/storage.ts`-dədir (CLAUDE.md §4). Burada yalnız icazə yoxlanır,
// forma oxunur və nəticə JSON-a çevrilir.
//
// Cavab: `MediaAsset` sahələri — müştəri onları formada saxlayır və
// `createPost` server action-ına ötürür. Sətir yükləmə anında yaranmır, çünki
// hələ `postId` yoxdur (bax `services/storage.ts` başlığı).
// ============================================================================

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  saveImage,
  type StorageFailureReason,
} from "@/services/storage";

// `sharp` və fayl sistemi — Edge-də işləmir.
export const runtime = "nodejs";

const FORM_FIELD = "file";

const ERROR_MESSAGES: Record<StorageFailureReason, string> = {
  EMPTY: "Fayl boşdur.",
  TOO_LARGE: `Fayl çox böyükdür. Maksimum ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
  UNSUPPORTED_TYPE: "Yalnız JPEG, PNG, WebP və GIF şəkilləri qəbul edilir.",
  DECODE_FAILED: "Şəkil oxunmadı. Fayl zədələnmiş ola bilər.",
  WRITE_FAILED: "Şəkil saxlanmadı. Bir azdan yenidən cəhd edin.",
};

/** Yükləmə limitləri — müştəri formanı serverə göndərmədən yoxlaya bilsin. */
export async function GET() {
  await requireUser();

  return NextResponse.json({
    maxBytes: MAX_UPLOAD_BYTES,
    mimeTypes: ALLOWED_UPLOAD_MIME_TYPES,
  });
}

export async function POST(request: Request) {
  // Sessiya yoxdursa `redirect()` atılır → Next 307 cavabı qaytarır, yükləmə
  // heç vaxt anonim istifadəçidən qəbul edilmir.
  await requireUser();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Sorğu multipart/form-data formatında deyil." },
      { status: 400 },
    );
  }

  const entry = form.get(FORM_FIELD);
  if (!(entry instanceof File)) {
    return NextResponse.json(
      { error: `«${FORM_FIELD}» sahəsində fayl gözlənilir.` },
      { status: 400 },
    );
  }

  const result = await saveImage(entry);

  if (!result.ok) {
    // Ölçü/format səhvi istifadəçinin girişindədir (400), yazma səhvi bizimdir (500).
    const status = result.reason === "WRITE_FAILED" ? 500 : 400;
    return NextResponse.json({ error: ERROR_MESSAGES[result.reason] }, { status });
  }

  return NextResponse.json(result.asset, { status: 201 });
}
