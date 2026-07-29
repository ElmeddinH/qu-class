// ============================================================================
// spec §16 blok 11 — Class Directory-yə keçid.
//
// Kartda kataloqun kiçik önizləməsi var (avatar zolağı + üzv sayı), çünki
// yalnız düymə göstərən blok "boş ekran" hissi verir. Önizləmə `listDirectory`
// -dən gəlir: hər sətir `redactProfile`-dan keçir və viewer üzv deyilsə siyahı
// boş qayıdır (servis üzvlüyü DB-də kəsişməyə salır).
// ============================================================================

import Link from "next/link";
import { Search, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { listDirectory } from "@/services/user.service";

import { WidgetCard } from "../WidgetCard";
import type { ClassHomeWidgetProps } from "../types";

/** Avatar zolağında göstərilən maksimum üz. */
const AVATAR_STRIP_SIZE = 8;

export async function DirectoryLink({ cohort, headingId }: ClassHomeWidgetProps) {
  const viewer = await getViewer();
  const directory = await listDirectory(viewer, {
    cohortId: cohort.id,
    take: AVATAR_STRIP_SIZE,
  });

  const remaining = directory.total - directory.items.length;
  const directoryHref = `/class/${cohort.slug}/directory`;

  return (
    <WidgetCard
      headingId={headingId}
      title="Sinif kataloqu"
      icon="users"
      description="Sinif yoldaşlarını ad, şəhər, maraq və bacarığa görə tap."
      footer={
        <Button asChild className="gap-2">
          <Link href={directoryHref}>
            <Search className="h-4 w-4" aria-hidden />
            Kataloqu aç
          </Link>
        </Button>
      }
    >
      {directory.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Kataloq bağlıdır"
          description="Sinif kataloqu yalnız həmin sinfin üzvlərinə göstərilir."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-wrap items-center gap-2">
            {directory.items.map((member) => (
              <li key={member.id}>
                <Link href={`/u/${member.id}`} title={`${member.firstName} ${member.lastName}`}>
                  <Avatar className="h-10 w-10 border border-border">
                    {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="bg-ku-soft text-caption text-ku-dark">
                      {member.firstName.charAt(0)}
                      {member.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="sr-only">
                    {member.firstName} {member.lastName}
                  </span>
                </Link>
              </li>
            ))}

            {remaining > 0 ? (
              <li
                className="flex h-10 w-10 items-center justify-center rounded-avatar border border-border bg-background text-caption text-text-secondary"
                aria-hidden
              >
                +{remaining}
              </li>
            ) : null}
          </ul>

          <p className="text-small text-text-secondary">
            {directory.total} üzv · 13 filtr üzrə axtarış, paylaşıla bilən link.
          </p>
        </div>
      )}
    </WidgetCard>
  );
}
