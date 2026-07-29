"use client";

// ============================================================================
// src/features/feed/PostCard.tsx
// Lentin tək paylaşım kartı.
//
// ⚠️ TƏLƏ T10: shadcn `CardTitle` <div> render edir — başlıq semantikası
// YOXDUR. Ekran oxuyucunun lenti başlıqlara görə gəzə bilməsi üçün kart
// başlığı burada ƏL İLƏ `<h3>` verilir (səhifənin `<h1>`-i və "Sinif lenti"
// `<h2>`-si ilə iyerarxiya pozulmasın deyə `<h3>`).
// ============================================================================

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  EllipsisVertical,
  ExternalLink,
  Flag,
  SlidersHorizontal,
  Trash2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { AchievementStatus, PostKind } from "@/lib/enums";

import { deletePostAction, revalidateFeedAction } from "./actions";
import {
  achievementCategoryMeta,
  FEED_ICONS,
  memoryTypeMeta,
  postCategoryMeta,
} from "./catalog";
import { CommentThread } from "./CommentThread";
import { exactDateTime, relativeTime, shortDate } from "./format";
import { MediaGallery } from "./MediaGallery";
import { PostSurfacesDialog } from "./PostSurfacesDialog";
import { ReactionBar } from "./ReactionBar";
import { ReportDialog } from "./ReportDialog";
import type { FeedPostView } from "./types";

interface PostCardProps {
  post: FeedPostView;
  cohortSlug: string;
  /** Silmə / redaktədən sonra lenti təzələmək. */
  onChanged: () => void;
}

const ACHIEVEMENT_STATUS_LABELS: Record<string, string> = {
  [AchievementStatus.SUBMITTED]: "Təsdiq gözləyir",
  [AchievementStatus.VERIFIED]: "Təsdiqlənib",
  [AchievementStatus.FEATURED]: "Seçilmiş",
  [AchievementStatus.ARCHIVED]: "Arxivdə",
};

function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function PostCard({ post, cohortSlug, onChanged }: PostCardProps) {
  const [isSurfacesOpen, setIsSurfacesOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const authorName = `${post.author.firstName} ${post.author.lastName}`;
  const category = postCategoryMeta(post.category);
  const CategoryIcon = FEED_ICONS[category.icon];

  // Kartın başlığı: nailiyyət/xatirə adı varsa o, yoxsa kateqoriya etiketi.
  const heading = post.achievement?.title ?? post.memory?.title ?? category.label;

  async function remove() {
    setIsDeleting(true);
    const result = await deletePostAction({ postId: post.id });
    setIsDeleting(false);

    if (!result.ok) {
      toast.error(result.message ?? "Paylaşım silinmədi.");
      return;
    }

    await revalidateFeedAction(cohortSlug);
    toast.success("Paylaşım silindi.");
    onChanged();
  }

  return (
    // `id` dərin keçid üçündür (`…/feed#post-<id>`) və e2e testləri kartı məhz
    // bununla tapır — mətnə görə axtarış seed məzmunu ilə toqquşur.
    <Card id={`post-${post.id}`}>
      {/* ------------------------- Başlıq ------------------------- */}
      <CardHeader className="flex-row items-start justify-between gap-3 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={post.author.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>
              {initialsOf(post.author.firstName, post.author.lastName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-1">
            {/* T10: semantik başlıq — CardTitle <div>-dir, onu işlətmirik. */}
            <h3 className="truncate text-body font-semibold text-text-primary">{heading}</h3>

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-secondary">
              <Link
                href={`/u/${post.author.id}`}
                className="font-medium text-text-primary hover:underline"
              >
                {authorName}
              </Link>
              <span aria-hidden>·</span>
              <time
                dateTime={post.createdAt}
                title={exactDateTime(post.createdAt)}
                className="whitespace-nowrap"
              >
                {relativeTime(post.createdAt)}
              </time>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* `VisibilityBadge` naməlum səviyyəni özü "Naməlum" kimi göstərir. */}
          <VisibilityBadge level={post.visibility} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Paylaşım əməliyyatları"
              >
                <EllipsisVertical className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {post.isOwner ? (
                <>
                  <DropdownMenuItem onSelect={() => setIsSurfacesOpen(true)}>
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    Görünmə yerlərini dəyiş
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}

              {post.isOwner || post.canModerate ? (
                <DropdownMenuItem
                  disabled={isDeleting}
                  onSelect={() => void remove()}
                  className="text-danger-strong focus:text-danger-strong"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {post.canModerate && !post.isOwner ? "Moderasiya ilə sil" : "Sil"}
                </DropdownMenuItem>
              ) : null}

              {post.isOwner ? null : (
                <DropdownMenuItem onSelect={() => setIsReportOpen(true)}>
                  <Flag className="h-4 w-4" aria-hidden />
                  Şikayət et
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* ------------------------- Məzmun ------------------------- */}
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <CategoryIcon className="h-3 w-3" aria-hidden />
            {category.label}
          </Badge>

          {post.showOnTimeline ? <Badge variant="outline">Xronologiyada</Badge> : null}

          {post.occurredAt.slice(0, 10) !== post.createdAt.slice(0, 10) ? (
            <span className="text-caption text-text-secondary">
              Hadisə tarixi: {shortDate(post.occurredAt)}
            </span>
          ) : null}
        </div>

        {post.body ? (
          <p className="whitespace-pre-line break-words text-body text-text-primary">
            {post.body}
          </p>
        ) : null}

        {post.media.length > 0 ? (
          <MediaGallery media={post.media} label={`${authorName} — ${heading}`} />
        ) : null}

        {/* --- kind = LINK --- */}
        {post.kind === PostKind.LINK && post.linkUrl ? (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 rounded-card border border-border bg-background p-3 transition-colors hover:border-ku-green"
          >
            {post.linkImage ? (
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-input">
                <Image
                  src={post.linkImage}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              </span>
            ) : null}
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-body font-medium text-text-primary">
                {post.linkTitle ?? post.linkUrl}
              </span>
              <span className="flex items-center gap-1 truncate text-caption text-text-secondary">
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                {post.linkUrl}
              </span>
            </span>
          </a>
        ) : null}

        {/* --- kind = EVENT --- */}
        {post.referencedEvent ? (
          <div className="flex gap-3 rounded-card border border-border bg-background p-3">
            <CalendarDays className="h-5 w-5 shrink-0 text-ku-green" aria-hidden />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-body font-medium text-text-primary">
                {post.referencedEvent.title}
              </span>
              <span className="text-caption text-text-secondary">
                {shortDate(post.referencedEvent.startsAt)}
                {post.referencedEvent.location ? ` · ${post.referencedEvent.location}` : ""}
              </span>
            </div>
          </div>
        ) : null}

        {/* --- Nailiyyət --- */}
        {post.achievement ? (
          <div className="flex gap-3 rounded-card border border-border bg-background p-3">
            <Trophy className="h-5 w-5 shrink-0 text-ku-green" aria-hidden />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-body font-medium text-text-primary">
                {post.achievement.title}
              </span>
              <span className="flex flex-wrap items-center gap-2 text-caption text-text-secondary">
                {achievementCategoryMeta(post.achievement.category).label}
                {post.achievement.organization ? ` · ${post.achievement.organization}` : ""}
                <span aria-hidden>·</span>
                {shortDate(post.achievement.awardedAt)}
                <Badge variant="outline">
                  {ACHIEVEMENT_STATUS_LABELS[post.achievement.status] ??
                    post.achievement.status}
                </Badge>
              </span>
              {post.achievement.proofUrl ? (
                <a
                  href={post.achievement.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-caption text-ku-green hover:underline"
                >
                  Sübut keçidi
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* --- Xatirə --- */}
        {post.memory ? (
          <div className="flex flex-col gap-1 rounded-card border border-border bg-background p-3">
            <span className="text-caption text-text-secondary">
              {memoryTypeMeta(post.memory.type).label}
              {post.memory.dedicatedTo ? ` · ${post.memory.dedicatedTo}` : ""}
            </span>
            <span className="text-body font-medium text-text-primary">
              {post.memory.title}
            </span>
          </div>
        ) : null}
      </CardContent>

      {/* ------------------------- Alt hissə ------------------------- */}
      <CardFooter className="flex flex-col items-stretch gap-4">
        <Separator />

        <ReactionBar
          postId={post.id}
          initial={{ counts: post.reactionCounts, viewerReaction: post.viewerReaction }}
        />

        <CommentThread postId={post.id} initialCount={post.commentCount} />
      </CardFooter>

      {post.isOwner ? (
        <PostSurfacesDialog
          post={post}
          cohortSlug={cohortSlug}
          open={isSurfacesOpen}
          onOpenChange={setIsSurfacesOpen}
          onSaved={onChanged}
        />
      ) : (
        <ReportDialog postId={post.id} open={isReportOpen} onOpenChange={setIsReportOpen} />
      )}
    </Card>
  );
}
