import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsPage } from "@/components/account/payments-account";

export const metadata: Metadata = { title: "Cobros con Mercado Pago" };

export default function CobrosPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-sm text-ink-500">Cargando…</p>}>
      <PaymentsPage />
    </Suspense>
  );
}
