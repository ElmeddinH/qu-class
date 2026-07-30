"use client";

// ============================================================================
// src/features/events/manage/BulkNotify.tsx
// Toplu bildiriş göndərmə (spec §14) — koordinator paneli.
//
// ⚠️ Alıcılar RSVP STATUSUNA görə seçilir, cohort üzvlüyünə görə YOX:
// "qeydiyyatdan keçənlərə" yazanda sinfin qalan hissəsi mesaj almamalıdır
// (bax `services/event.service.ts` → `notifyAttendees`).
//
// ⚠️ Göndərmə GERİ QAYTARILA BİLMƏZ — bildirişlər dərhal yaranır. Ona görə
// düymənin yanında alıcı sayı GÖSTƏRİLİR və mətn təsdiq tələb edir.
// ============================================================================

import { useState, useTransition } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RsvpStatus as RsvpStatusType } from "@/lib/enums";
import { rsvpStatusLabel } from "@/lib/labels";

import { DEFAULT_NOTIFY_STATUSES, NOTIFY_STATUS_OPTIONS } from "../catalog";
import { notifyAttendeesAction } from "../actions";

interface BulkNotifyProps {
  eventId: string;
  /** Status → say; qrup etiketinin yanında göstərilir. */
  byStatus: Record<string, number>;
}

export function BulkNotify({ eventId, byStatus }: BulkNotifyProps) {
  const [isPending, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<RsvpStatusType[]>([
    ...DEFAULT_NOTIFY_STATUSES,
  ]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const recipients = statuses.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0);

  function toggle(status: RsvpStatusType) {
    setStatuses((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    );
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const result = await notifyAttendeesAction({ eventId, statuses, title, body });

      if (!result.ok) {
        toast.error(result.message ?? "Bildiriş göndərilmədi.");
        return;
      }

      toast.success(result.message);
      setTitle("");
      setBody("");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-sm-kuds"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-h4 font-medium text-text-primary">Toplu bildiriş</h2>
        <p className="text-small text-text-secondary">
          Seçilmiş qruplara bildiriş göndərilir. Göndərilən bildiriş geri
          qaytarıla bilməz.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2" disabled={isPending}>
        <legend className="text-small font-medium text-text-primary">Alıcılar</legend>
        <div className="flex flex-wrap gap-4">
          {NOTIFY_STATUS_OPTIONS.map((status) => {
            const id = `notify-${status}`;
            return (
              <div key={status} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={statuses.includes(status)}
                  onCheckedChange={() => toggle(status)}
                />
                <Label htmlFor={id} className="text-small font-normal text-text-secondary">
                  {rsvpStatusLabel(status)} ({byStatus[status] ?? 0})
                </Label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notify-title">Başlıq</Label>
        <Input
          id="notify-title"
          value={title}
          maxLength={160}
          disabled={isPending}
          placeholder="Məsələn: Tədbir bir saat gecikir"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notify-body">Mesaj</Label>
        <Textarea
          id="notify-body"
          rows={4}
          maxLength={1000}
          disabled={isPending}
          placeholder="Qısa və konkret yazın — bildiriş siyahısında bir-iki sətir görünür."
          onChange={(event) => setBody(event.target.value)}
          value={body}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-text-secondary" aria-live="polite">
          {recipients} nəfərə göndəriləcək
        </p>

        <Button
          type="submit"
          className="gap-2"
          disabled={isPending || recipients === 0 || statuses.length === 0}
        >
          {isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          Göndər
        </Button>
      </div>
    </form>
  );
}
