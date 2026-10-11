import type { Metadata } from "next";
import { Suspense } from "react";
import { RealSpaceDetail } from "@/components/real-space/real-space-detail";

export const metadata: Metadata = { title: "Garaje" };

// Detalle de un garaje real: `/espacio/?id=` (con query porque el sitio es estático).
export default function EspacioPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-sm text-ink-500">Cargando…</p>}>
      <RealSpaceDetail />
    </Suspense>
  );
}
