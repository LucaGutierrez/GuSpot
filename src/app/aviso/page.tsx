import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrivalPage } from "@/components/arrivals/arrival-views";

export const metadata: Metadata = { title: "Voy en camino" };

export default function AvisoPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-sm text-ink-500">Cargando…</p>}>
      <ArrivalPage />
    </Suspense>
  );
}
