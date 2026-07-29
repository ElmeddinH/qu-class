"use client";

// ============================================================================
// src/features/feed/ReportDialog.tsx
// Paylaşım haqqında şikayət — `Report` sətri yaradır (`entityType: "POST"`).
//
// Şikayət MƏZMUNU açmır: moderator ona `canModerate` yolu ilə çıxır və həmin
// yol AuditLog yazır (bax `services/report.service.ts` başlığı).
// ============================================================================

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASON_VALUES, ReportReason, type ReportReason as ReportReasonType } from "@/lib/enums";

import { reportPostAction } from "./actions";

const REASON_LABELS: Record<ReportReasonType, string> = {
  SPAM: "Spam və ya reklam",
  HARASSMENT: "Təhqir, təzyiq",
  INAPPROPRIATE: "Uyğunsuz məzmun",
  MISINFORMATION: "Yanlış məlumat",
  PRIVACY: "Şəxsi məlumatın paylaşılması",
  OTHER: "Digər",
};

interface ReportDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDialog({ postId, open, onOpenChange }: ReportDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState<string>(ReportReason.INAPPROPRIATE);
  const [details, setDetails] = useState("");

  function submit() {
    startTransition(async () => {
      const result = await reportPostAction({ postId, reason, details });

      if (!result.ok) {
        toast.error(result.message ?? "Şikayət göndərilmədi.");
        return;
      }

      toast.success(result.message ?? "Şikayət göndərildi.");
      setDetails("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Paylaşımı şikayət et</DialogTitle>
          <DialogDescription>
            Şikayət moderasiya növbəsinə düşür. Müəllif kimin şikayət etdiyini görmür.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`report-reason-${postId}`}>Səbəb</Label>
            <Select value={reason} onValueChange={setReason} disabled={isPending}>
              <SelectTrigger id={`report-reason-${postId}`}>
                <SelectValue placeholder="Səbəb seçin" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASON_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {REASON_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`report-details-${postId}`}>Əlavə izah (istəyə bağlı)</Label>
            <Textarea
              id={`report-details-${postId}`}
              rows={3}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Nə səhvdir?"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Ləğv et
          </Button>
          <Button type="button" onClick={submit} disabled={isPending}>
            {isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Göndər
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
