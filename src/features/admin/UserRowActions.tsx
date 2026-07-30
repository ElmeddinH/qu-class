"use client";

// ============================================================================
// src/features/admin/UserRowActions.tsx
// Bir istifadəçi sətri üçün əməliyyatlar: sistem rolu · sinif rolu ·
// deaktivasiya.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 TƏLƏ C — QORUMA SERVERDƏDİR, BU KOMPONENTDƏ DEYİL
// ────────────────────────────────────────────────────────────────────────────
// Burada öz sətrində təhlükəli düymələr `disabled` olur, amma bu, YALNIZ
// istifadəçi rahatlığıdır. Əsl qoruma `services/admin-users.service.ts` →
// `checkSystemRoleChange` / `checkDeactivation`-dadır və server action
// birbaşa çağırılsa da işləyir. UI-dakı `disabled` "qoruma" sayılmır —
// inteqrasiya testi məhz servisi çağırır.
//
// ⚠️ «Sonuncu admin» qoruması UI-da GÖSTƏRİLƏ BİLMİR: admin sayı transaksiya
// içində oxunur (TOCTOU) və səhifə render olunanda hələ məlum deyil. Cəhd
// edilsə server azərbaycanca səbəb qaytarır və toast göstərilir.
//
// ────────────────────────────────────────────────────────────────────────────
// 🔴 BÜTÜN ÜZVLÜKLƏR REDAKTƏ OLUNUR (Blok 12B-də bağlanan borc)
// ────────────────────────────────────────────────────────────────────────────
// Əvvəl yalnız `cohorts[0]` (əsas sinif) üçün seçici göstərilirdi. İstifadəçi
// isə birdən çox sinifdə ola bilər — ikinci ixtisas, magistratura, fakültə
// cohort-u — və həmin siniflərdə rolu dəyişmək UI-dan MÜMKÜN DEYİLDİ.
// Servis (`changeCohortRole`) onsuz da `cohortId` qəbul edirdi, yəni boşluq
// yalnız bu ekranda idi.
//
// 🔴 İKİ ROL QARIŞDIRILMIR (CLAUDE.md «Rollar»):
//   · SİSTEM rolu (`USER` / `UNIVERSITY_ADMIN`) — istifadəçi başına BİRDİR,
//     yuxarıdakı «Admin et» düyməsi ilə idarə olunur;
//   · COHORT rolu (`MEMBER` / `CLASS_REPRESENTATIVE` / `EVENT_COORDINATOR` /
//     `CLASS_MODERATOR`) — hər ÜZVLÜK üçün ayrıdır və yalnız həmin sinifdə
//     keçərlidir.
// Ona görə aşağıdakı bölmə sinif-sinif göstərilir və başlığı açıq yazır.
//
// ⚠️ Hər dəyişiklik AYRICA AuditLog sətri yaradır — `changeCohortRole` audit
// yazısını üzvlük id-si ilə eyni transaksiyada qeyd edir.
// ============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CohortRole, SystemRole } from "@/lib/enums";
import { cohortRoleLabel } from "@/lib/labels";

import {
  changeCohortRoleAction,
  changeSystemRoleAction,
  setActivationAction,
} from "./actions";

interface UserRowActionsProps {
  user: {
    id: string;
    fullName: string;
    systemRole: string;
    deactivated: boolean;
    /** BÜTÜN üzvlüklər — əsas sinif birincidir (servis `isPrimary desc` sıralayır). */
    cohorts: Array<{
      id: string;
      displayName: string;
      role: string;
      isPrimary: boolean;
    }>;
  };
  /** Əməliyyatı edən admin — öz sətrini tanımaq üçün. */
  actorId: string;
}

const COHORT_ROLES = [
  CohortRole.MEMBER,
  CohortRole.CLASS_REPRESENTATIVE,
  CohortRole.EVENT_COORDINATOR,
  CohortRole.CLASS_MODERATOR,
] as const;

export function UserRowActions({ user, actorId }: UserRowActionsProps) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const isSelf = user.id === actorId;
  const isAdmin = user.systemRole === SystemRole.UNIVERSITY_ADMIN;

  const call = (
    action: (input: unknown) => Promise<{ ok: boolean; message?: string }>,
    input: unknown,
  ) => {
    startTransition(async () => {
      const result = await action(input);
      if (!result.ok) {
        toast.error(result.message ?? "Əməliyyat tamamlanmadı.");
        return;
      }
      toast.success(result.message ?? "Hazırdır.");
      router.refresh();
    });
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`${user.fullName} üçün əməliyyatlar`}
      >
        İdarə et
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-background p-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || (isSelf && isAdmin)}
          // ⚠️ Öz rolunu ENDİRMƏK bloklanır; qaldırmaq onsuz da mənasızdır
          // (artıq admindir). Server hər iki halda son sözü deyir.
          title={
            isSelf && isAdmin
              ? "Öz sistem rolunuzu endirə bilməzsiniz."
              : undefined
          }
          onClick={() =>
            call(changeSystemRoleAction, {
              targetId: user.id,
              nextRole: isAdmin ? SystemRole.USER : SystemRole.UNIVERSITY_ADMIN,
            })
          }
        >
          {isAdmin ? "Admin rolunu ləğv et" : "Admin et"}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || isSelf}
          title={isSelf ? "Öz hesabınızı deaktiv edə bilməzsiniz." : undefined}
          onClick={() =>
            call(setActivationAction, {
              targetId: user.id,
              deactivate: !user.deactivated,
            })
          }
        >
          {user.deactivated ? "Hesabı bərpa et" : "Hesabı deaktiv et"}
        </Button>

        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Bağla
        </Button>
      </div>

      {user.cohorts.length === 0 ? (
        <p className="text-caption text-text-secondary">
          Bu istifadəçi heç bir sinifdə deyil.
        </p>
      ) : (
        <fieldset className="flex flex-col gap-3">
          {/* 🔴 Başlıq İKİ ROLU ayırır — bax fayl başlığı. */}
          <legend className="text-caption font-medium text-text-primary">
            Sinif rolları ({user.cohorts.length} üzvlük)
          </legend>

          {user.cohorts.map((cohort) => {
            const selectId = `cohort-role-${user.id}-${cohort.id}`;

            return (
              <div key={cohort.id} className="flex flex-col gap-2">
                <Label htmlFor={selectId} className="text-caption text-text-secondary">
                  {cohort.displayName}
                  {cohort.isPrimary ? " · əsas sinif" : ""}
                </Label>
                <select
                  id={selectId}
                  defaultValue={cohort.role}
                  disabled={pending}
                  onChange={(event) =>
                    call(changeCohortRoleAction, {
                      targetId: user.id,
                      // ⚠️ MƏHZ bu üzvlüyün cohort-u — `cohorts[0]` DEYİL.
                      cohortId: cohort.id,
                      nextRole: event.target.value,
                    })
                  }
                  className="h-10 rounded-input border border-border bg-surface px-3 text-small text-text-primary"
                >
                  {COHORT_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {cohortRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </fieldset>
      )}

      <p className="text-caption text-text-secondary">
        Sinif rolu (üzv / sinif nümayəndəsi / tədbir əlaqələndiricisi / moderator)
        YALNIZ həmin sinifdə keçərlidir və sistem rolundan (istifadəçi / universitet
        admini) fərqlidir. Hər dəyişiklik audit jurnalına ayrıca yazılır və
        istifadəçiyə bildiriş gedir. Sistem rolu dəyişikliyi növbəti girişdə tam
        qüvvəyə minir.
      </p>
    </div>
  );
}
