// ============================================================================
// src/features/admin/AdminDashboard.tsx
// `/admin` — idarə paneli (spec §17).
//
// 🔴 TƏLƏ G — ŞƏXSƏ BAĞLI SIRALAMA YOXDUR. Panel struktur saylar + AQREQAT
// zaman seriyası göstərir. «Ən aktiv istifadəçilər» bloku qəsdən yaradılmayıb:
// platformanın məxfilik mövqeyi istifadəçinin öz məzmununun ƏHATƏSİNİ seçməsi
// üzərində qurulub və universitet miqyaslı lider cədvəli həmin seçimi arxadan
// dolanardı (səbəb `services/admin.service.ts` və STATE.md-dədir).
//
// ⚠️ SƏHİFƏ NAZİKDİR: bütün rəqəmlər `services/admin.service.ts`-dən gəlir,
// burada heç bir hesablama yoxdur.
// ============================================================================

import Link from "next/link";
import {
  CalendarDays,
  Flag,
  GraduationCap,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardHeading } from "@/components/kuds/SectionCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { auditActionLabel } from "@/lib/labels";
import { getViewer } from "@/lib/auth";
import { getAdminActivitySeries, getAdminDashboardStats } from "@/services/admin.service";
import { listRecentAudit } from "@/services/audit.service";
import { exactDateTime } from "@/utils/date";

import { ActivityChart } from "./ActivityChart";
import { AdminPageHeader } from "./AdminPageHeader";

/** Növbəyə keçidlər — «indi nə etməliyəm?» sualının cavabı. */
const QUEUE_LINKS = [
  {
    href: "/admin/moderation",
    title: "Şikayət növbəsi",
    description:
      "Şikayət sətirləri göstərilir; məzmun yalnız audit jurnalına yazılan «moderasiya baxışı» ilə açılır.",
  },
  {
    href: "/admin/achievements",
    title: "Nailiyyət təsdiqi",
    description: "Bütün siniflərdə təsdiq gözləyən nailiyyətlər.",
  },
  {
    href: "/admin/import",
    title: "SIS CSV importu",
    description: "Önizləmə → təsdiq. Qismən yazı yoxdur, şifrə sütunu qəbul edilmir.",
  },
] as const;

export async function AdminDashboard() {
  const viewer = await getViewer();

  const [stats, series, audit] = await Promise.all([
    getAdminDashboardStats(viewer),
    getAdminActivitySeries(viewer),
    listRecentAudit(viewer, 10),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="İdarə paneli"
        description="Universitet miqyaslı struktur göstəricilər. Şəxsə bağlı sıralama yoxdur — panel fərdi davranışı deyil, platformanın vəziyyətini göstərir."
      />

      <section aria-labelledby="admin-stats" className="flex flex-col gap-3">
        <h2 id="admin-stats" className="sr-only">
          Əsas göstəricilər
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={Users}
            value={stats.userCount}
            label="Aktiv istifadəçi"
            hint={
              stats.deactivatedCount > 0
                ? `${stats.deactivatedCount} deaktiv hesab`
                : undefined
            }
          />
          <StatCard
            icon={GraduationCap}
            value={stats.activeCohortCount}
            label="Aktiv sinif"
            hint={`${stats.cohortCount} sinif ümumilikdə`}
          />
          <StatCard icon={Sparkles} value={stats.postsThisMonth} label="Bu ay paylaşım" />
          <StatCard
            icon={CalendarDays}
            value={stats.upcomingEventCount}
            label="Qarşıdan gələn tədbir"
          />
          <StatCard icon={Flag} value={stats.openReportCount} label="Açıq şikayət" />
          <StatCard
            icon={Trophy}
            value={stats.pendingAchievementCount}
            label="Təsdiq gözləyən nailiyyət"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardHeading>Son 12 həftə</CardHeading>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-small text-text-secondary">
              Həftəlik aqreqat: paylaşım və yeni qeydiyyat sayı. Rəqəmlərdə fərdi
              məlumat yoxdur.
            </p>
            <ActivityChart data={series} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardHeading>Növbələr</CardHeading>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {QUEUE_LINKS.map((link) => (
              <div key={link.href} className="flex flex-col gap-2">
                <Button asChild variant="outline" className="justify-start">
                  <Link href={link.href}>{link.title}</Link>
                </Button>
                <p className="text-caption text-text-secondary">{link.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardHeading>Son audit sətirləri</CardHeading>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/audit">Tam jurnal</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <p className="text-small text-text-secondary">Hələ qeyd yoxdur.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {audit.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-3 py-3 text-small"
                >
                  <Badge variant="outline" className="font-normal">
                    {auditActionLabel(entry.action)}
                  </Badge>
                  <span className="text-text-primary">{entry.entityType}</span>
                  <span className="text-text-secondary">
                    {entry.actor === null
                      ? "Sistem"
                      : `${entry.actor.firstName} ${entry.actor.lastName}`}
                  </span>
                  <span className="ml-auto text-caption text-text-secondary">
                    {exactDateTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
