"use client";

import Link from "next/link";
import { useTransition } from "react";
import { LoaderCircle, LogOut, Shield, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";

export interface HeaderUser {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  /** Sistem rolu — admin panelinə keçid linkini göstərmək üçün. */
  isAdmin: boolean;
}

/** Ad-soyaddan iki hərfli inisial ("Aynur Rəhimova" → "AR"). */
function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("az") ?? "")
    .join("");
}

export function UserMenu({ user }: { user: HeaderUser }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto gap-2 rounded-avatar p-1 pr-2"
          aria-label={`${user.fullName} — istifadəçi menyusu`}
        >
          {/* Radix Avatar özü şəkil yüklənməyəndə fallback-a keçir —
              şərti render əvəzinə AvatarImage işlədilir. */}
          <Avatar className="h-8 w-8">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-ku-soft text-caption text-ku-dark">
              {initialsOf(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[12rem] truncate text-small text-text-primary sm:inline">
            {user.fullName}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-1">
          <span className="text-small font-medium text-text-primary">{user.fullName}</span>
          <span className="truncate text-caption font-normal text-text-secondary">
            {user.email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/me">
            <User className="h-4 w-4" aria-hidden />
            Profilim
          </Link>
        </DropdownMenuItem>

        {user.isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield className="h-4 w-4" aria-hidden />
              Admin paneli
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={pending}
          // Çıxış Server Action-dır: sessiya cookie-si serverdə silinir.
          onSelect={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await signOutAction();
            });
          }}
        >
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <LogOut className="h-4 w-4" aria-hidden />
          )}
          Çıxış
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
