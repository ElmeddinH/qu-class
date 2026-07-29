import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * `forbidden()` çağırılanda render olunan 403 sərhədi (Next.js
 * `experimental.authInterrupts` — bax `next.config.ts`).
 *
 * `requireAdmin()` və `requireCohortRole()` bunu işə salır.
 */
export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-avatar bg-danger/10"
        aria-hidden
      >
        <ShieldAlert className="h-8 w-8 text-danger-strong" />
      </span>

      <h1 className="text-h1 font-bold text-text-primary">Giriş qadağandır</h1>

      <p className="max-w-md text-body text-text-secondary">
        Bu səhifəyə baxmaq üçün icazəniz yoxdur. Səhv olduğunu düşünürsünüzsə
        universitet administrasiyasına müraciət edin.
      </p>

      <Button asChild className="mt-2">
        <Link href="/home">Ana səhifəyə qayıt</Link>
      </Button>
    </div>
  );
}
