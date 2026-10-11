import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsPage } from "@/components/my-garages/payments-account";

export const metadata: Metadata = { title: "Cobros" };

export default function CobrosPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-sm text-ink-500">Cargando…</p>}>
      <PaymentsPage />
    </Suspense>
  );
}
