"use client";

// ============================================================================
// src/features/admin/GuidePlaceEditor.tsx
// Xankəndi bələdçisi məkanının MƏTN sahələri.
//
// ⚠️ `latitude` / `longitude` BURADA YOXDUR: xəritə mövqeyi səhvən dəyişdirilsə
// istifadəçi mövcud olmayan ünvana gedər. Koordinat redaktəsi xəritə seçicisi
// tələb edir və ayrıca işdir (səbəb `services/admin-content.service.ts`-dədir).
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { updateGuidePlaceAction } from "./actions";

interface GuidePlaceEditorProps {
  place: {
    id: string;
    title: string;
    description: string;
    address: string | null;
    phone: string | null;
  };
}

export function GuidePlaceEditor({ place }: GuidePlaceEditorProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(place.title);
  const [description, setDescription] = useState(place.description);
  const [address, setAddress] = useState(place.address ?? "");
  const [phone, setPhone] = useState(place.phone ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    startTransition(async () => {
      const result = await updateGuidePlaceAction({
        id: place.id,
        title,
        description,
        address,
        phone,
      });

      if (!result.ok) {
        toast.error(result.message ?? "Yenilənmədi.");
        return;
      }

      toast.success(result.message ?? "Məkan yeniləndi.");
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => setOpen(true)}
        aria-label={`${place.title} məkanını redaktə et`}
      >
        Redaktə et
      </Button>
    );
  }

  const fieldId = (name: string) => `place-${place.id}-${name}`;

  return (
    <form
      aria-label="Bələdçi məkanı redaktə formu"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3 rounded-card border border-border bg-background p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("title")}>Başlıq</Label>
          <Input
            id={fieldId("title")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId("phone")}>Telefon</Label>
          <Input
            id={fieldId("phone")}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor={fieldId("address")}>Ünvan</Label>
          <Input
            id={fieldId("address")}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="rounded-input"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor={fieldId("description")}>Təsvir</Label>
          <Textarea
            id={fieldId("description")}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="rounded-input"
          />
        </div>
      </div>

      <p className="text-caption text-text-secondary">
        Xəritə koordinatları buradan dəyişdirilmir — səhv mövqe ziyarətçini
        mövcud olmayan ünvana aparardı.
      </p>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Yadda saxla
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Ləğv et
        </Button>
      </div>
    </form>
  );
}
