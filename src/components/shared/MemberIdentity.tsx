// ============================================================================
// src/components/shared/MemberIdentity.tsx
// İstifadəçi kimliyi bloku: avatar + ad-soyad keçidi + alt sətir + rol rozeti.
//
// NİYƏ `shared/`-dədir: eyni blok İKİ yerdə lazımdır —
//   · `features/class-home/MemberCard`  ("Yeni üzvlər", "Tanışlıq kartları")
//   · `features/directory/DirectoryCard` (Class Directory grid-i)
// Dublikat komponent yaratmaq əvəzinə ortaq hissə buraya çıxarıldı; kartların
// QALAN məzmunu (bio, çiplər, sinif məlumatı) hər özəllikdə fərqlidir və orada
// qalır.
//
// ⚠️ Giriş obyekti `redactProfile`-dan KEÇMİŞ formadır: gizlədilmiş sahə
// obyektdə ÜMUMİYYƏTLƏ YOXDUR (`null` deyil), ona görə hər sahə şərtidir.
// `avatarUrl` da idarə olunan sahədir — gizlədilə bilər, o zaman baş hərflər
// göstərilir.
//
// ⚠️ Rol etiketi HAZIR MƏTN kimi ötürülür (`roleLabel`). `shared/` komponenti
// `features/*` kataloqundan import etməməlidir — istiqamət həmişə
// features → shared olur.
// ============================================================================

import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Ad-soyadın baş hərfləri — avatar yoxdursa və ya gizlədilibsə göstərilir. */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

interface MemberIdentityProps {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  /** Vəzifə · şirkət, doğma şəhər və ya kartın kontekstinə uyğun bir sətir. */
  subtitle?: string | null;
  /** Hazır etiket — `MEMBER` rolunda `null` ötürülür (rozet göstərilmir). */
  roleLabel?: string | null;
  /** `lg` — kataloq kartı (48px avatar), `sm` — widget siyahısı (40px). */
  size?: "sm" | "lg";
}

export function MemberIdentity({
  id,
  firstName,
  lastName,
  avatarUrl,
  subtitle,
  roleLabel,
  size = "sm",
}: MemberIdentityProps) {
  const fullName = `${firstName} ${lastName}`;

  return (
    <div className="flex items-start gap-3">
      <Avatar className={cn("shrink-0", size === "lg" ? "h-12 w-12" : "h-10 w-10")}>
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="bg-ku-soft text-caption text-ku-dark">
          {initials(firstName, lastName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-col gap-1">
        <Link
          href={`/u/${id}`}
          className={cn(
            "truncate font-medium text-text-primary hover:text-ku-green hover:underline",
            size === "lg" ? "text-h4" : "text-body",
          )}
        >
          {fullName}
        </Link>

        {subtitle ? (
          <span className="truncate text-caption text-text-secondary">{subtitle}</span>
        ) : null}

        {roleLabel ? (
          <Badge variant="outline" className="w-fit text-caption font-normal">
            {roleLabel}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
