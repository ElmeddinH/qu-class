"use client";

// ============================================================================
// src/features/feed/PostSurfacesDialog.tsx
// «Görünmə yerlərini dəyiş» — Timeline / Achievements bayraqlarının sonradan
// redaktəsi (yalnız müəllif üçün).
//
// ⚠️ TƏLƏ T11: `TimelineEntry.postId` və `Achievement.postId` `@unique`-dir.
// Servis `create` DEYİL, `upsert` / `deleteMany` işlədir — ikinci dəfə açılanda
// `P2002` alınmasın (bax `post.service.ts` → `updatePostSurfaces`).
//
// Nailiyyət sahələri MÖVCUD sətirdən (varsa) və ya post-un tarixindən
// öncədən doldurulur: `Achievement.title / .category / .awardedAt` sxemdə
// nullable deyil, yəni bayraq açılan an bu üç dəyər hazır olmalıdır.
// ============================================================================

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AchievementCategory } from "@/lib/enums";

import { revalidateFeedAction, updatePostSurfacesAction } from "./actions";
import { ACHIEVEMENT_CATEGORY_META, ACHIEVEMENT_CATEGORY_OPTIONS } from "./catalog";
import { toLocalDateValue } from "./format";
import type { FeedPostView } from "./types";

interface PostSurfacesDialogProps {
  post: FeedPostView;
  cohortSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function PostSurfacesDialog({
  post,
  cohortSlug,
  open,
  onOpenChange,
  onSaved,
}: PostSurfacesDialogProps) {
  const [isPending, startTransition] = useTransition();

  const [onTimeline, setOnTimeline] = useState(post.showOnTimeline);
  const [inAchievements, setInAchievements] = useState(post.showInAchievements);

  const [category, setCategory] = useState<string>(
    post.achievement?.category ?? AchievementCategory.AWARD,
  );
  const [title, setTitle] = useState(
    post.achievement?.title ?? post.body?.split("\n")[0]?.slice(0, 120) ?? "",
  );
  const [organization, setOrganization] = useState(post.achievement?.organization ?? "");
  const [awardedAt, setAwardedAt] = useState(
    toLocalDateValue(new Date(post.achievement?.awardedAt ?? post.occurredAt)),
  );
  const [proofUrl, setProofUrl] = useState(post.achievement?.proofUrl ?? "");

  function save() {
    startTransition(async () => {
      const result = await updatePostSurfacesAction({
        postId: post.id,
        showOnTimeline: onTimeline,
        showInAchievements: inAchievements,
        achievement: { category, title, organization, awardedAt, proofUrl },
      });

      if (!result.ok) {
        const first = Object.values(result.fieldErrors ?? {})[0];
        toast.error(first ?? result.message ?? "Dəyişiklik saxlanmadı.");
        return;
      }

      await revalidateFeedAction(cohortSlug);
      toast.success("Görünmə yerləri yeniləndi.");
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Görünmə yerləri</DialogTitle>
          <DialogDescription>
            Bu paylaşımın xronologiyada və nailiyyətlərdə göstərilməsini idarə edin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id={`surfaces-timeline-${post.id}`}
              checked={onTimeline}
              onCheckedChange={(checked) => setOnTimeline(checked === true)}
              disabled={isPending}
            />
            <Label htmlFor={`surfaces-timeline-${post.id}`} className="cursor-pointer">
              Class Timeline-a əlavə et
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id={`surfaces-achievements-${post.id}`}
              checked={inAchievements}
              onCheckedChange={(checked) => setInAchievements(checked === true)}
              disabled={isPending}
            />
            <Label htmlFor={`surfaces-achievements-${post.id}`} className="cursor-pointer">
              Class Achievements-ə əlavə et
            </Label>
          </div>

          {inAchievements ? (
            <div className="flex flex-col gap-3 rounded-card border border-border bg-background p-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`surfaces-category-${post.id}`}>Nailiyyət kateqoriyası</Label>
                <Select value={category} onValueChange={setCategory} disabled={isPending}>
                  <SelectTrigger id={`surfaces-category-${post.id}`}>
                    <SelectValue placeholder="Kateqoriya seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACHIEVEMENT_CATEGORY_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {ACHIEVEMENT_CATEGORY_META[value].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`surfaces-title-${post.id}`}>Nailiyyətin adı</Label>
                <Input
                  id={`surfaces-title-${post.id}`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`surfaces-org-${post.id}`}>Təşkilat (istəyə bağlı)</Label>
                  <Input
                    id={`surfaces-org-${post.id}`}
                    value={organization}
                    onChange={(event) => setOrganization(event.target.value)}
                    disabled={isPending}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`surfaces-date-${post.id}`}>Tarix</Label>
                  <Input
                    id={`surfaces-date-${post.id}`}
                    type="date"
                    value={awardedAt}
                    onChange={(event) => setAwardedAt(event.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`surfaces-proof-${post.id}`}>
                  Sübut keçidi (istəyə bağlı)
                </Label>
                <Input
                  id={`surfaces-proof-${post.id}`}
                  value={proofUrl}
                  inputMode="url"
                  placeholder="https://…"
                  onChange={(event) => setProofUrl(event.target.value)}
                  disabled={isPending}
                />
              </div>

              <p className="text-caption text-text-secondary">
                Nailiyyət yenidən «Təsdiq gözləyir» statusuna düşür.
              </p>
            </div>
          ) : null}
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
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            Yadda saxla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
