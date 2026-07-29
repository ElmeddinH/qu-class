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
import { CALLBACK_URL_PARAM } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Daxil ol",
  description: "QU CLASS hesabınıza daxil olun.",
};

/** `?error=` Auth.js-in öz yönləndirməsindən gəlir (məs. sessiya bitib). */
const AUTH_ERROR_MESSAGE = "Giriş alınmadı. E-poçt və şifrənizi yoxlayın.";

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

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Daxil ol</CardTitle>
          <CardDescription>
            Universitet e-poçtunuz və şifrənizlə sinif səhifənizə keçin.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
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
            <Link href="/register" className="font-medium text-ku-green hover:underline">
              Qeydiyyatdan keçin
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
