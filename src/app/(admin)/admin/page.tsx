import type { Metadata } from "next";

import { AdminDashboard } from "@/features/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "İdarə paneli",
};

// ⚠️ `force-dynamic`: rəqəmlər hər açılışda təzə olmalıdır — açıq şikayət sayı
// statik keşlənsə moderator «0 şikayət» görüb səhifəni bağlayardı.
// İcazə qapısı `(admin)/layout.tsx` → `requireAdmin()`-dədir (CLAUDE.md §8:
// səhifə nazikdir, məntiq `features/` və `services/`-dədir).
export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
