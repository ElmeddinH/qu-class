import type { Metadata } from "next";

import { AdminCohorts } from "@/features/admin/AdminCohorts";

export const metadata: Metadata = {
  title: "Siniflər",
};

export const dynamic = "force-dynamic";

export default function AdminCohortsPage() {
  return <AdminCohorts />;
}
