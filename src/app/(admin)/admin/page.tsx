import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "İdarə paneli",
};

// TODO(Blok 11 · M17): Sadə PLACEHOLDER. Əsl admin dashboard-u (analitika,
// moderasiya növbəsi, cohort idarəetməsi) Blok 11-də `src/features/admin/`
// altında qurulacaq. İcazə yoxlaması `(admin)/layout.tsx`-dədir.
export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-text-primary">İdarə paneli</h1>
        <p className="text-body text-text-secondary">
          Universitet administratoru üçün mərkəzi panel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Panel hazırlanır</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-body text-text-secondary">
            Analitika, cohort idarəetməsi, moderasiya növbəsi və audit jurnalı
            Blok 11-də əlavə olunacaq. Bu səhifə yalnız{" "}
            <strong>UNIVERSITY_ADMIN</strong> rolu ilə açılır.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
