"use client";

// ============================================================================
// src/features/admin/ContentCreateForms.tsx
// CMS «YARAT» formaları — `ContentPage` · `Faq` · `GuidePlace` (Blok 12B).
//
// Bu vaxta qədər `/admin/content` YALNIZ redaktə edirdi: yeni ictimai səhifə,
// yeni FAQ və ya yeni bələdçi məkanı əlavə etmək üçün seed-i dəyişib bazanı
// yenidən qurmaq lazım gəlirdi.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 SXEM REDAKTƏ İLƏ PAYLAŞILIR
// ────────────────────────────────────────────────────────────────────────────
// `schemas.ts`-də sahə təyinləri BİR dəfə yazılıb (`contentPageFields`,
// `faqFields`, `guidePlaceFields`) və hər iki sxem onları spread edir. İki
// ayrı sxem saxlansaydı biri sərtləşəndə digəri köhnə qalar, yaratma yolu
// redaktədən ZƏİF olardı.
//
// 🔴 SLUG BURADA YAZILMIR — başlıqdan DETERMİSTİK qurulur (`lib/slugify.ts`).
// Forma yalnız ÖNİZLƏMƏ göstərir ki, admin ünvanın nə olacağını yazarkən
// görsün. Unikallıq serverdə yoxlanılır və `@unique` indeksi (`P2002`)
// yarışı bağlayır — istifadəçiyə azərbaycanca mesaj qayıdır.
//
// ⚠️ Doğrulama SERVER action-dadır (sxem orada `safeParse` olunur). Burada
// `required` kimi brauzer yoxlamaları YALNIZ rahatlıqdır — qoruma deyil.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTENT_SECTION_VALUES,
  FAQ_CATEGORY_VALUES,
  GUIDE_CATEGORY_VALUES,
} from "@/lib/enums";
import {
  contentSectionLabel,
  faqCategoryLabel,
  guideCategoryLabel,
} from "@/lib/labels";
import { slugify } from "@/lib/slugify";

import {
  createContentPageAction,
  createFaqAction,
  createGuidePlaceAction,
} from "./actions";

// ---------------------------------------------------------------------------
// Ortaq qabıq: «Yeni …» düyməsi → forma
// ---------------------------------------------------------------------------

interface CreatePanelProps {
  label: string;
  formLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
}

function CreatePanel({
  label,
  formLabel,
  open,
  onOpenChange,
  pending,
  onSubmit,
  children,
}: CreatePanelProps) {
  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit gap-2"
        onClick={() => onOpenChange(true)}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <form
      aria-label={formLabel}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-3 rounded-card border border-border bg-background p-4"
    >
      {children}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Yarat
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Ləğv et
        </Button>
      </div>
    </form>
  );
}

/** Sıra nömrəsi sahəsi — üç formada eynidir. */
function OrderField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Sıra nömrəsi</Label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-input"
      />
    </div>
  );
}

/** Nəşr olunsun? — qaralama defolt DEYİL, açıq seçimdir. */
function PublishedField({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
      />
      <Label htmlFor={id} className="font-normal">
        Dərhal nəşr olunsun (işarələnməsə qaralama kimi saxlanılır)
      </Label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContentPage
// ---------------------------------------------------------------------------

export function ContentPageCreateForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [section, setSection] = useState<string>(CONTENT_SECTION_VALUES[0]);
  const [order, setOrder] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // 🔴 Önizləmə SERVERDƏKİ İLƏ EYNİ funksiyadan gəlir — iki fərqli slug
  // qaydası olsaydı admin gördüyündən başqa ünvan alardı.
  const slugPreview = slugify(title);

  function submit() {
    startTransition(async () => {
      const result = await createContentPageAction({
        title,
        excerpt,
        body,
        section,
        order,
        isPublished,
      });

      if (!result.ok) {
        toast.error(result.message ?? "Səhifə yaradılmadı.");
        return;
      }

      toast.success(result.message ?? "Səhifə yaradıldı.");
      setTitle("");
      setExcerpt("");
      setBody("");
      setOrder("");
      setIsPublished(false);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <CreatePanel
      label="Yeni səhifə"
      formLabel="Yeni məzmun səhifəsi formu"
      open={open}
      onOpenChange={setOpen}
      pending={pending}
      onSubmit={submit}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="new-page-title">Başlıq</Label>
          <Input
            id="new-page-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-input"
          />
          <p className="text-caption text-text-secondary">
            Ünvan başlıqdan avtomatik qurulur:{" "}
            <code>{slugPreview === "" ? "—" : `/${slugPreview}`}</code>. Eyni ünvan
            artıq varsa səhifə yaradılmır və xəbərdarlıq göstərilir.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-page-section">Bölmə</Label>
          <select
            id="new-page-section"
            value={section}
            onChange={(event) => setSection(event.target.value)}
            className="h-10 rounded-input border border-border bg-surface px-3 text-small text-text-primary"
          >
            {CONTENT_SECTION_VALUES.map((value) => (
              <option key={value} value={value}>
                {contentSectionLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <OrderField id="new-page-order" value={order} onChange={setOrder} />

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="new-page-excerpt">Qısa təsvir</Label>
          <Input
            id="new-page-excerpt"
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="new-page-body">Gövdə (Markdown)</Label>
          <Textarea
            id="new-page-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            className="rounded-input"
          />
          <p className="text-caption text-text-secondary">
            Markdown HTML kimi yeridilmir — mətndəki teqlər ekranda mətn kimi görünür.
          </p>
        </div>
      </div>

      <PublishedField
        id="new-page-published"
        checked={isPublished}
        onChange={setIsPublished}
      />
    </CreatePanel>
  );
}

// ---------------------------------------------------------------------------
// Faq
// ---------------------------------------------------------------------------

export function FaqCreateForm() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState<string>(FAQ_CATEGORY_VALUES[0]);
  const [order, setOrder] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      const result = await createFaqAction({
        question,
        answer,
        category,
        order,
        isPublished,
      });

      if (!result.ok) {
        toast.error(result.message ?? "Sual əlavə edilmədi.");
        return;
      }

      toast.success(result.message ?? "Sual əlavə edildi.");
      setQuestion("");
      setAnswer("");
      setOrder("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <CreatePanel
      label="Yeni sual"
      formLabel="Yeni FAQ formu"
      open={open}
      onOpenChange={setOpen}
      pending={pending}
      onSubmit={submit}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="new-faq-question">Sual</Label>
          <Input
            id="new-faq-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-faq-category">Kateqoriya</Label>
          <select
            id="new-faq-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-input border border-border bg-surface px-3 text-small text-text-primary"
          >
            {FAQ_CATEGORY_VALUES.map((value) => (
              <option key={value} value={value}>
                {faqCategoryLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <OrderField id="new-faq-order" value={order} onChange={setOrder} />

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="new-faq-answer">Cavab</Label>
          <Textarea
            id="new-faq-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={4}
            className="rounded-input"
          />
        </div>
      </div>

      <PublishedField
        id="new-faq-published"
        checked={isPublished}
        onChange={setIsPublished}
      />
    </CreatePanel>
  );
}

// ---------------------------------------------------------------------------
// GuidePlace
// ---------------------------------------------------------------------------

export function GuidePlaceCreateForm() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(GUIDE_CATEGORY_VALUES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [order, setOrder] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      const result = await createGuidePlaceAction({
        category,
        title,
        description,
        address,
        phone,
        latitude,
        longitude,
        isEmergency,
        order,
      });

      if (!result.ok) {
        toast.error(result.message ?? "Məkan əlavə edilmədi.");
        return;
      }

      toast.success(result.message ?? "Məkan əlavə edildi.");
      setTitle("");
      setDescription("");
      setAddress("");
      setPhone("");
      setLatitude("");
      setLongitude("");
      setIsEmergency(false);
      setOrder("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <CreatePanel
      label="Yeni məkan"
      formLabel="Yeni bələdçi məkanı formu"
      open={open}
      onOpenChange={setOpen}
      pending={pending}
      onSubmit={submit}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="new-place-category">Kateqoriya</Label>
          <select
            id="new-place-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-input border border-border bg-surface px-3 text-small text-text-primary"
          >
            {/* 11 kateqoriyanın hamısı — siyahı `lib/enums.ts`-dəndir. */}
            {GUIDE_CATEGORY_VALUES.map((value) => (
              <option key={value} value={value}>
                {guideCategoryLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <OrderField id="new-place-order" value={order} onChange={setOrder} />

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="new-place-title">Başlıq</Label>
          <Input
            id="new-place-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-place-address">Ünvan</Label>
          <Input
            id="new-place-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-place-phone">Telefon</Label>
          <Input
            id="new-place-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-place-latitude">Enlik (latitude)</Label>
          <Input
            id="new-place-latitude"
            inputMode="decimal"
            placeholder="39.8154"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-place-longitude">Uzunluq (longitude)</Label>
          <Input
            id="new-place-longitude"
            inputMode="decimal"
            placeholder="46.7519"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="new-place-description">Təsvir</Label>
          <Textarea
            id="new-place-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="rounded-input"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="new-place-emergency"
          checked={isEmergency}
          onCheckedChange={(next) => setIsEmergency(next === true)}
        />
        <Label htmlFor="new-place-emergency" className="font-normal">
          Təcili əlaqə məkanıdır (bələdçidə ayrıca bölmədə göstərilir)
        </Label>
      </div>

      <p className="text-caption text-text-secondary">
        Koordinatların HƏR İKİSİNİ yazın və ya hər ikisini boş buraxın — yalnız biri
        xəritədə mövqe vermir. Koordinat verilməsə məkan siyahıda qalır, xəritədə
        görünmür.
      </p>
    </CreatePanel>
  );
}
