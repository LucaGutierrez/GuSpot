"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeftIcon } from "@/components/ui/icons";

/** Enlace de vuelta a /buscar/ conservando la búsqueda de la URL. */
export function BackToResults({ label = "Volver a la búsqueda" }: { label?: string }) {
  const params = useSearchParams();
  const qs = params.toString();
  return (
    <Link
      href={`/buscar/${qs ? `?${qs}` : ""}`}
      className="inline-flex items-center gap-1 rounded text-sm font-medium text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
    >
      <ChevronLeftIcon width={16} height={16} /> {label}
    </Link>
  );
}
