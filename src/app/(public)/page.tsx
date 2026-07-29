import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";

// TODO(Blok 11 · M1): Bu, create-next-app şablonunun yerinə qoyulmuş müvəqqəti
// PLACEHOLDER-dir — əsl Public Welcome Page Blok 11-də `src/features/welcome/`
// altında qurulacaq və bu fayl yalnız həmin komponenti render edəcək.
// Karkas (PublicShell) artıq `(public)/layout.tsx`-dən gəlir.
export default function WelcomePage() {
  return (
    <div className="flex flex-col items-start gap-6 py-16">
      <span className="rounded-badge bg-ku-soft px-3 py-1 text-caption text-ku-dark">
        Holberton final layihəsi · Blok 2
      </span>

      <h1 className="max-w-2xl text-display font-bold text-text-primary">
        Sinif heç vaxt bağlanmır
      </h1>

      <p className="max-w-2xl text-body text-text-secondary">
        QU CLASS — Qarabağ Universitetinin tələbə və məzun sinif platforması.
        Yeni qəbul olunanların tanışlığından məzuniyyətdən sonrakı əlaqəyə qədər
        hər şey eyni səhifədə: <strong>Incoming → Student → Alumni</strong>.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href="/register">
            Qeydiyyatdan keç
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
        {/* KUDS §11: Secondary = outline */}
        <Button variant="outline" asChild>
          <Link href="/login">
            <LogIn className="h-4 w-4" aria-hidden />
            Daxil ol
          </Link>
        </Button>
      </div>
    </div>
  );
}
