"use client";

// ============================================================================
// src/features/admin/FaqEditor.tsx
// FAQ sualının redaktəsi. Dərc vəziyyəti də buradan idarə olunur.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { updateFaqAction } from "./actions";

interface FaqEditorProps {
  faq: { id: string; question: string; answer: string; isPublished: boolean };
}

export function FaqEditor({ faq }: FaqEditorProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [isPublished, setPublished] = useState(faq.isPublished);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    startTransition(async () => {
      const result = await updateFaqAction({ id: faq.id, question, answer, isPublished });
      if (!result.ok) {
        toast.error(result.message ?? "Yenilənmədi.");
        return;
      }
      toast.success(result.message ?? "Sual yeniləndi.");
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-normal">
          {faq.isPublished ? "Dərc olunub" : "Qaralama"}
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          aria-label={`«${faq.question}» sualını redaktə et`}
        >
          Redaktə et
        </Button>
      </div>
    );
  }

  const fieldId = (name: string) => `faq-${faq.id}-${name}`;

  return (
    <form
      aria-label="FAQ redaktə formu"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3 rounded-card border border-border bg-background p-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId("question")}>Sual</Label>
        <Input
          id={fieldId("question")}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="rounded-input"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId("answer")}>Cavab</Label>
        <Textarea
          id={fieldId("answer")}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          rows={4}
          className="rounded-input"
        />
      </div>

      <label className="flex items-center gap-2 text-small text-text-primary">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(event) => setPublished(event.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Dərc olunub
      </label>

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
