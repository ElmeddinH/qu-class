import type { Metadata } from "next";

import { AdminContent } from "@/features/admin/AdminContent";

export const metadata: Metadata = {
  title: "Məzmun idarəsi",
};

export const dynamic = "force-dynamic";

export default function AdminContentPage() {
  return <AdminContent />;
}
