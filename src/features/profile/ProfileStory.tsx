// ============================================================================
// src/features/profile/ProfileStory.tsx
// "My Class Story" [M7] — CV DEYİL, HEKAYƏ (spec §9 bunu xüsusi vurğulayır).
//
// Fərq nədədir: bölmə başlıqları sahə ADI deyil, SUALDIR —
// "Universitetdə nə öyrənmək istəyirəm?" / "Mənə hansı mövzularda müraciət
// edə bilərsiniz?". Suallar `features/profile/sections.ts`-dədir və `/me/edit`
// forması EYNİ mətni işlədir: istifadəçi doldurduğu xananın profildə hansı
// bölmə olduğunu dərhal tanıyır.
//
// ⚠️ Komponentdə HEÇ BİR gizlətmə məntiqi YOXDUR — və olmamalıdır.
// `redactProfile()` görünməməli sahəni obyektdən TAMAMİLƏ SİLİR (`null`
// qoymur), ona görə `has(field)` (yəni `field in profile`) kifayət edir.
// Burada `visibility === "..."` müqayisəsi yazmaq məxfilik qərarını
// mühərrikdən kənara çıxarmaq olardı.
//
// ⚠️ Mərhələyə görə SIRA dəyişir, MƏZMUN yox: məzunda karyera bloku maraq
// çiplərindən ƏVVƏL gəlir (adam artıq işləyir — hekayənin mərkəzi odur),
// tələbədə isə sonra. Class Page-dəki widget sırası ilə eyni fəlsəfə.
// ============================================================================

import Link from "next/link";
import { Award, HeartHandshake, Sparkles, UserRoundPen } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { VisibilityBadge } from "@/components/shared/VisibilityBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserStage } from "@/lib/enums";
import {
  clubRoleLabel,
  industryLabel,
  languageLevelLabel,
  supportOfferLabel,
} from "@/lib/labels";
import type { ControlledField, Visibility } from "@/lib/visibility";
import type { ProfileResult } from "@/services/user.service";

import {
  CAREER_ICON,
  CareerTimeline,
  EDUCATION_ICON,
  EducationList,
} from "./CareerTimeline";
import { STORY_QUESTIONS } from "./sections";
import { StoryHeader } from "./StoryHeader";

interface ProfileStoryProps {
  result: ProfileResult;
  /**
   * Sahə-səviyyə tənzimləmələr — YALNIZ sahib özü preview olmadan baxanda
   * ötürülür. Belə olanda hər bölmənin yanında cari səviyyə badge-i görünür.
   */
  levels?: Record<ControlledField, Visibility> | null;
}

export function ProfileStory({ result, levels }: ProfileStoryProps) {
  const { profile, stage, isOwner, support } = result;

  const has = (field: ControlledField): boolean => field in profile;

  // --- Hekayə blokları (mərhələyə görə sıralanır) ---

  const storyBlock = (
    <>
      <StoryText field="bio" value={profile.bio} levels={levels} />
      <StoryText field="learningGoals" value={profile.learningGoals} levels={levels} />
      <StoryText field="askMeAbout" value={profile.askMeAbout} levels={levels} />
      <StoryText field="expectations" value={profile.expectations} levels={levels} />
    </>
  );

  const interestsBlock = (
    <>
      <Chips field="interests" title="Maraqlarım" items={profile.interests} levels={levels} />
      <Chips field="hobbies" title="Hobbilərim" items={profile.hobbies} levels={levels} />
      <Chips field="skills" title="Bacarıqlarım" items={profile.skills} levels={levels} />
      <Chips
        field="languages"
        title="Bildiyim dillər"
        items={profile.languages?.map((lang) => {
          const level = languageLevelLabel(lang.level);
          return level ? `${lang.name} (${level})` : lang.name;
        })}
        levels={levels}
      />
      <Chips
        field="clubs"
        title="Üzv olduğum klublar"
        items={profile.clubs?.map((club) =>
          club.role === "MEMBER" ? club.name : `${club.name} · ${clubRoleLabel(club.role)}`,
        )}
        levels={levels}
      />
    </>
  );

  const careerBlock = (
    <>
      {has("currentCompany") || has("currentPosition") || has("industry") ? (
        <StoryCard
          field="currentCompany"
          title="Hazırda nə edirəm?"
          icon={<CAREER_ICON className="h-5 w-5 text-ku-green" aria-hidden />}
          levels={levels}
          // Üç sahənin üçü də gizlədilə bilər; kart yalnız içi boş qalmasın deyə
          // yoxlanılır (başlıq tək qalmamalıdır — KUDS §12).
          skip={!profile.currentCompany && !profile.currentPosition && !profile.industry}
        >
          <p className="text-body text-text-primary">
            {[profile.currentPosition, profile.currentCompany].filter(Boolean).join(" · ")}
          </p>
          {profile.industry ? (
            <p className="text-small text-text-secondary">
              {industryLabel(profile.industry)}
            </p>
          ) : null}
        </StoryCard>
      ) : null}

      {has("careerHistory") && profile.careerHistory?.length ? (
        <StoryCard
          field="careerHistory"
          title="Karyera yolum"
          icon={<CAREER_ICON className="h-5 w-5 text-ku-green" aria-hidden />}
          levels={levels}
        >
          <CareerTimeline entries={profile.careerHistory} />
        </StoryCard>
      ) : null}

      {has("education") && profile.education?.length ? (
        <StoryCard
          field="education"
          title="Təhsilim"
          icon={<EDUCATION_ICON className="h-5 w-5 text-ku-green" aria-hidden />}
          levels={levels}
        >
          <EducationList entries={profile.education} />
        </StoryCard>
      ) : null}

      <StoryText field="futurePlans" value={profile.futurePlans} levels={levels} />

      <SupportOffers support={support} isOwner={isOwner} />
    </>
  );

  const contactBlock =
    (has("phone") && profile.phone) || (has("personalEmail") && profile.personalEmail) ? (
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-h4">Əlaqə</CardTitle>
          {levels ? <VisibilityBadge level={levels.phone} /> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {profile.phone ? (
            <p className="text-body text-text-primary">Telefon: {profile.phone}</p>
          ) : null}
          {profile.personalEmail ? (
            <p className="text-body text-text-primary">
              Şəxsi e-poçt: {profile.personalEmail}
            </p>
          ) : null}
        </CardContent>
      </Card>
    ) : null;

  const isAlumni = stage === UserStage.ALUMNI;

  // Hekayənin BOŞ olub-olmadığı: ad-soyad və sinif rozetindən başqa heç nə
  // görünmürsə "boş ekran buraxma" qaydası işə düşür (CLAUDE.md).
  const hasStory =
    Boolean(
      profile.bio ||
        profile.learningGoals ||
        profile.askMeAbout ||
        profile.expectations ||
        profile.futurePlans ||
        profile.currentCompany ||
        profile.currentPosition,
    ) ||
    Boolean(profile.interests?.length) ||
    Boolean(profile.hobbies?.length) ||
    Boolean(profile.skills?.length) ||
    Boolean(profile.languages?.length) ||
    Boolean(profile.clubs?.length) ||
    Boolean(profile.careerHistory?.length) ||
    Boolean(profile.education?.length) ||
    support.offers.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <StoryHeader result={result} />

      {isOwner ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4">
          <UserRoundPen className="h-5 w-5 shrink-0 text-ku-green" aria-hidden />
          <p className="flex-1 text-small text-text-secondary">
            Bu, sizin hekayənizdir. Hər sahənin dəyərini və kimin görəcəyini eyni
            formada dəyişə bilərsiniz.
          </p>
          <Button asChild size="sm">
            <Link href="/me/edit">Profili redaktə et</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/me/career">Karyera və təhsil</Link>
          </Button>
        </div>
      ) : null}

      {!hasStory ? (
        <EmptyState
          icon={Sparkles}
          title={isOwner ? "Hekayəniz hələ boşdur" : "Bu profil hələ doldurulmayıb"}
          description={
            isOwner
              ? "Bir neçə sualı cavablayın — sinif yoldaşlarınız sizi bu cavablardan tanıyacaq."
              : "İstifadəçi profilini hələ doldurmayıb və ya bölmələri sizdən gizlədib."
          }
          action={isOwner ? { href: "/me/edit", label: "Profili doldur" } : undefined}
        />
      ) : isAlumni ? (
        <>
          {storyBlock}
          {careerBlock}
          {interestsBlock}
          {contactBlock}
        </>
      ) : (
        <>
          {storyBlock}
          {interestsBlock}
          {careerBlock}
          {contactBlock}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Köməkçi komponentlər
// ---------------------------------------------------------------------------

interface StoryCardProps {
  field: ControlledField;
  title: string;
  icon?: React.ReactNode;
  levels?: Record<ControlledField, Visibility> | null;
  skip?: boolean;
  children: React.ReactNode;
}

/** Bölmə kartı — başlıq + (sahibə) görünürlük rozeti + məzmun (KUDS §12). */
function StoryCard({ field, title, icon, levels, skip, children }: StoryCardProps) {
  if (skip) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-h4">
          {icon}
          {title}
        </CardTitle>
        {levels ? <VisibilityBadge level={levels[field]} /> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  );
}

/**
 * Hekayə sualı + cavabı.
 * Başlıq `STORY_QUESTIONS`-dan gəlir — `/me/edit` ilə EYNİ mətn.
 */
function StoryText({
  field,
  value,
  levels,
}: {
  field: ControlledField;
  value?: string | null;
  levels?: Record<ControlledField, Visibility> | null;
}) {
  if (!value) return null;

  return (
    <StoryCard field={field} title={STORY_QUESTIONS[field] ?? field} levels={levels}>
      <p className="whitespace-pre-line text-body text-text-secondary">{value}</p>
    </StoryCard>
  );
}

function Chips({
  field,
  title,
  items,
  levels,
}: {
  field: ControlledField;
  title: string;
  items?: string[];
  levels?: Record<ControlledField, Visibility> | null;
}) {
  if (!items?.length) return null;

  return (
    <StoryCard field={field} title={title} levels={levels}>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item}>
            <Badge variant="outline" className="rounded-badge font-normal">
              {item}
            </Badge>
          </li>
        ))}
      </ul>
    </StoryCard>
  );
}

/**
 * 7 dəstək təklifi rozet kimi (spec §9).
 *
 * 🔴 ÜÇÜNCÜ RAZILIQ burada görünür: siyahı `visibility` və ya `includeInStats`
 * ilə deyil, `User.openToSupport` bayrağı ilə qapılanır. Bayraq sönülüdürsə
 * kənar adam heç nə görmür (servis boş siyahı qaytarır), SAHİB isə öz
 * seçimlərini xəbərdarlıqla görür — əks halda "7 təklif seçdim, amma heç yerdə
 * görünmürəm" vəziyyəti səssiz qalardı.
 */
function SupportOffers({
  support,
  isOwner,
}: {
  support: ProfileResult["support"];
  isOwner: boolean;
}) {
  if (support.offers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-h4">
          <HeartHandshake className="h-5 w-5 text-ku-green" aria-hidden />
          Sinfimə necə dəstək ola bilərəm?
        </CardTitle>
        {isOwner && !support.openToSupport ? (
          <Badge variant="outline" className="border-warning text-warning-strong">
            Gizlidir
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-wrap gap-2">
          {support.offers.map((offer) => (
            <li key={offer.type}>
              <Badge
                className="gap-1 rounded-badge bg-ku-blue font-normal text-ku-dark hover:bg-ku-blue"
                title={offer.note ?? undefined}
              >
                <Award className="h-3 w-3 shrink-0" aria-hidden />
                {supportOfferLabel(offer.type)}
              </Badge>
            </li>
          ))}
        </ul>

        {support.offers.some((offer) => offer.note) ? (
          <dl className="flex flex-col gap-2">
            {support.offers
              .filter((offer) => offer.note)
              .map((offer) => (
                <div key={offer.type} className="flex flex-col">
                  <dt className="text-caption font-medium text-text-primary">
                    {supportOfferLabel(offer.type)}
                  </dt>
                  <dd className="text-small text-text-secondary">{offer.note}</dd>
                </div>
              ))}
          </dl>
        ) : null}

        {isOwner && !support.openToSupport ? (
          <p className="rounded-input bg-warning/10 px-3 py-2 text-small text-warning-strong">
            «Dəstəyə açığam» açarı sönülüdür — bu rozetləri sizdən başqa heç kim
            görmür.{" "}
            <Link href="/me/career" className="underline underline-offset-4">
              Karyera səhifəsində açın
            </Link>
            .
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
