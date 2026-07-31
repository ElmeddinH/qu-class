import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/LoginForm";
import { CALLBACK_URL_PARAM, SESSION_EXPIRED_PARAM } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Daxil ol",
  description: "QU CLASS hesabınıza daxil olun.",
};

/** `?error=` Auth.js-in öz yönləndirməsindən gəlir (məs. sessiya bitib). */
const AUTH_ERROR_MESSAGE = "Giriş alınmadı. E-poçt və şifrənizi yoxlayın.";

/**
 * `?expired=1` — `SESSION_EXPIRED_PATH` sessiya kukisini təmizləyib bura
 * göndərib: token keçərli idi, amma hesab bazada tapılmadı. Bildiriş olmasa
 * istifadəçi səbəbsiz "çıxarıldım" hissi ilə qalır.
 */
const SESSION_EXPIRED_MESSAGE =
  "Sessiyanız etibarsız oldu — hesabınız tapılmadı. Yenidən daxil olun.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackUrl = typeof params[CALLBACK_URL_PARAM] === "string"
    ? params[CALLBACK_URL_PARAM]
    : undefined;
  const hasError = typeof params.error === "string";
  const sessionExpired = params[SESSION_EXPIRED_PARAM] === "1";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-12">
      <Card>
        <CardHeader>
          {/* Səhifənin YEGANƏ `<h1>`-i. `CardTitle` div render edir (shadcn
              primitivi — CLAUDE.md §1: toxunulmazdır), ona görə başlıq ONUN
              İÇİNDƏ verilir: stillər miras qalır, vizual görünüş dəyişmir,
              yalnız semantika düzəlir (səhifə ekran oxuyucusunda başlıqsız
              qalmır və e2e testi `h1`-i tuta bilir). */}
          <CardTitle>
            <h1>Daxil ol</h1>
          </CardTitle>
          <CardDescription>
            Universitet e-poçtunuz və şifrənizlə sinif səhifənizə keçin.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {sessionExpired ? (
            <p
              role="alert"
              className="rounded-input bg-warning/15 px-3 py-2 text-small text-warning-strong"
            >
              {SESSION_EXPIRED_MESSAGE}
            </p>
          ) : null}

          {hasError ? (
            <p
              role="alert"
              className="rounded-input bg-danger/10 px-3 py-2 text-small text-danger-strong"
            >
              {AUTH_ERROR_MESSAGE}
            </p>
          ) : null}

          <LoginForm callbackUrl={callbackUrl} />

          <p className="text-small text-text-secondary">
            Hesabınız yoxdur?{" "}
            <Link href="/register" className="kuds-prose-link font-medium">
              Qeydiyyatdan keçin
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
