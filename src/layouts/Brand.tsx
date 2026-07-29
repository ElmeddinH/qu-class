import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

interface BrandProps {
  href?: string;
  /** `light` — tünd fon (sidebar) üçün ağ mətn · `dark` — ağ fon üçün tünd mətn */
  tone?: "light" | "dark";
  className?: string;
}

/** QU CLASS loqosu. Mətn logotipi — brend kitabçasından SVG gələnə qədər. */
export function Brand({ href = "/", tone = "dark", className }: BrandProps) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-3", className)}
      aria-label="QU CLASS — ana səhifə"
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-btn",
          tone === "light" ? "bg-ku-soft text-ku-dark" : "bg-ku-green text-white",
        )}
      >
        <GraduationCap className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "text-h4 font-semibold",
            tone === "light" ? "text-white" : "text-ku-dark",
          )}
        >
          QU CLASS
        </span>
        <span
          className={cn(
            "text-caption",
            tone === "light" ? "text-ku-soft" : "text-text-secondary",
          )}
        >
          Qarabağ Universiteti
        </span>
      </span>
    </Link>
  );
}
