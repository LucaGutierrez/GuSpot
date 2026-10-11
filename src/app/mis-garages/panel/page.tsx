import type { Metadata } from "next";
import { Suspense } from "react";
import { OperatorPanelPage } from "@/components/my-garages/operator-panel";

export const metadata: Metadata = { title: "Panel del garage" };

export default function PanelPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-sm text-ink-500">Cargando…</p>}>
      <OperatorPanelPage />
    </Suspense>
  );
}
