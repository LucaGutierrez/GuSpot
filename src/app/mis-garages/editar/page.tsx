import type { Metadata } from "next";
import { Suspense } from "react";
import { EditGaragePage } from "@/components/my-garages/my-garages";

export const metadata: Metadata = { title: "Editar garage" };

export default function EditarGaragePage() {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-sm text-ink-500">Cargando…</p>}>
      <EditGaragePage />
    </Suspense>
  );
}
