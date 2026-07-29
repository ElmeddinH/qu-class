import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/RegisterForm";
import { listRegistrationCatalog } from "@/services/academic.service";

export const metadata: Metadata = {
  title: "Qeydiyyat",
  description: "Universitet e-poçtunuzla QU CLASS hesabı yaradın.",
};

// ⚠️ Kataloq DB-dən gəlir və admin yeni cohort açanda dəyişir. Build zamanı
// prerender olunsa siyahı donub qalar — buna görə səhifə hər sorğuda qurulur.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  // Fakültə → ixtisas → il kataloqu: yalnız sinif səhifəsi (cohort) MÖVCUD
  // olan variantlar gəlir, yəni forma çıxılmaz seçim təklif etmir.
  const faculties = await listRegistrationCatalog();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Qeydiyyat</CardTitle>
          <CardDescription>
            Sinif səhifənizə qoşulmaq üçün fakültə, ixtisas və qəbul ilinizi seçin.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {faculties.length === 0 ? (
            <p
              role="alert"
              className="rounded-input bg-warning/20 px-3 py-2 text-small text-text-primary"
            >
              Hazırda açıq sinif səhifəsi yoxdur. Administratora müraciət edin.
            </p>
          ) : (
            <RegisterForm faculties={faculties} />
          )}

          <p className="text-small text-text-secondary">
            Artıq hesabınız var?{" "}
            <Link href="/login" className="font-medium text-ku-green hover:underline">
              Daxil olun
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
