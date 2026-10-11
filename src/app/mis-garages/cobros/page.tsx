import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsReturnRedirect } from "@/components/account/payments-account";

// Vuelta de Mercado Pago al conectar la cuenta (URL registrada en la app de Mercado Pago).
export const metadata: Metadata = { title: "Cobros con Mercado Pago" };

export default function CobrosReturnPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-sm text-ink-500">Cargando…</p>}>
      <PaymentsReturnRedirect />
    </Suspense>
  );
}
