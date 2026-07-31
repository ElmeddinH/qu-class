"use client";

// ============================================================================
// src/features/feed/CommentThread.tsx
// Şərhlər — LAZY yüklənir (kart açılanda deyil, "Şərhlər" düyməsinə basılanda).
//
// 20 postluq lentdə hər kartın şərhlərini əvvəlcədən çəkmək 20 əlavə sorğu
// deməkdir; şərhlərə isə postların kiçik hissəsində baxılır.
//
// İyerarxiya BİR SƏVİYYƏLİDİR (`Comment.parentId`) — cavabın cavabı yoxdur.
// Server də bunu tətbiq edir (`createComment` → `parentId: null` olan şərhə
// cavab verilə bilər).
// ============================================================================

import { useState, useTransition } from "react";
import { CornerDownRight, LoaderCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { FeedComment } from "@/services/post.service";

import { createCommentAction, deleteCommentAction, listCommentsAction } from "./actions";
import { exactDateTime, relativeTime } from "./format";

interface CommentThreadProps {
  postId: string;
  /** Serverdən gələn ilkin say — açılana qədər düymədə göstərilir. */
  initialCount: number;
}

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function CommentThread({ postId, initialCount }: CommentThreadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // 🔴 «Xəta» «boşluq»dan AYRILMALIDIR (Blok 12C · D bəndi).
  // Əvvəl uğursuz yükləmə yalnız toast göstərirdi, ekranda isə «Hələ şərh
  // yoxdur» qalırdı — yəni SƏHV MƏLUMAT: şərhlər var, sadəcə gəlmədi. Toast
  // saniyələr sonra itir, yanlış cümlə isə ekranda qalır.
  const [hasError, setHasError] = useState(false);
  const [comments, setComments] = useState<FeedComment[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [isPending, startTransition] = useTransition();

  const count = comments?.length ?? initialCount;

  async function load() {
    setIsLoading(true);
    setHasError(false);
    const result = await listCommentsAction(postId);
    setIsLoading(false);

    if (!result.ok || !result.value) {
      setHasError(true);
      toast.error(result.message ?? "Şərhlər yüklənmədi.");
      return;
    }
    setComments(result.value);
  }

  function toggleOpen() {
    const next = !isOpen;
    setIsOpen(next);
    if (next && comments === null) void load();
  }

  function submit() {
    if (body.trim().length === 0) return;

    startTransition(async () => {
      const result = await createCommentAction({
        postId,
        body,
        parentId: replyTo?.id ?? "",
      });

      if (!result.ok) {
        toast.error(result.message ?? "Şərh göndərilmədi.");
        return;
      }

      setBody("");
      setReplyTo(null);
      // Yenidən oxunur: server `id`, `createdAt` və icazə bayraqlarını qaytarır,
      // onları müştəridə uydurmaq sonradan səhv silmə düyməsinə gətirir.
      await load();
    });
  }

  function remove(commentId: string) {
    startTransition(async () => {
      const result = await deleteCommentAction({ commentId });
      if (!result.ok) {
        toast.error(result.message ?? "Şərh silinmədi.");
        return;
      }
      setComments((current) => current?.filter((c) => c.id !== commentId) ?? null);
      toast.success("Şərh silindi.");
    });
  }

  const roots = comments?.filter((c) => c.parentId === null) ?? [];
  const repliesOf = (parentId: string) =>
    comments?.filter((c) => c.parentId === parentId) ?? [];

  function renderComment(comment: FeedComment, isReply: boolean) {
    return (
      <li key={comment.id} className={isReply ? "ml-8 sm:ml-12" : ""}>
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={comment.author.avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="text-caption">
              {initialsOf(comment.author.firstName, comment.author.lastName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="rounded-card bg-background px-3 py-2">
              <p className="text-small font-medium text-text-primary">
                {comment.author.firstName} {comment.author.lastName}
              </p>
              <p className="whitespace-pre-line break-words text-small text-text-primary">
                {comment.body}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 px-1">
              <time
                className="text-caption text-text-secondary"
                dateTime={comment.createdAt.toISOString()}
                title={exactDateTime(comment.createdAt.toISOString())}
              >
                {relativeTime(comment.createdAt.toISOString())}
              </time>

              {isReply ? null : (
                <button
                  type="button"
                  className="text-caption text-ku-green hover:underline"
                  onClick={() => setReplyTo(comment)}
                >
                  Cavab yaz
                </button>
              )}

              {comment.isOwner || comment.canModerate ? (
                <button
                  type="button"
                  className="flex items-center gap-1 text-caption text-danger-strong hover:underline"
                  disabled={isPending}
                  onClick={() => remove(comment.id)}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                  Sil
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {repliesOf(comment.id).length > 0 ? (
          <ul className="mt-3 flex flex-col gap-3">
            {repliesOf(comment.id).map((reply) => renderComment(reply, true))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        aria-expanded={isOpen}
        onClick={toggleOpen}
      >
        {count > 0 ? `Şərhlər (${count})` : "Şərh yaz"}
      </Button>

      {isOpen ? (
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : null}

          {!isLoading && hasError ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-4"
            >
              <p className="text-small text-text-primary">Şərhlər yüklənmədi.</p>
              <p className="text-caption text-text-secondary">
                Bağlantını yoxlayıb yenidən cəhd edin — mövcud şərhlər silinməyib.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
                Yenidən cəhd et
              </Button>
            </div>
          ) : null}

          {!isLoading && !hasError && roots.length === 0 ? (
            <p className="text-small text-text-secondary">
              Hələ şərh yoxdur. İlk fikri sən yaz.
            </p>
          ) : null}

          {roots.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {roots.map((comment) => renderComment(comment, false))}
            </ul>
          ) : null}

          <div className="flex flex-col gap-2">
            {replyTo ? (
              <p className="flex items-center gap-2 text-caption text-text-secondary">
                <CornerDownRight className="h-3 w-3" aria-hidden />
                {replyTo.author.firstName} {replyTo.author.lastName} adlı istifadəçiyə cavab
                <button
                  type="button"
                  className="text-ku-green hover:underline"
                  onClick={() => setReplyTo(null)}
                >
                  ləğv et
                </button>
              </p>
            ) : null}

            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={2}
              placeholder="Şərhinizi yazın…"
              aria-label="Şərh mətni"
              disabled={isPending}
            />

            <Button
              type="button"
              size="sm"
              className="self-end"
              disabled={isPending || body.trim().length === 0}
              onClick={submit}
            >
              {isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
              Göndər
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
