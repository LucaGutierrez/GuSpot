import type { Metadata } from "next";
import { Suspense } from "react";
import { VerificationPage } from "@/components/account/verification";

export const metadata: Metadata = { title: "Verificación de identidad" };

export default function VerificacionPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-6 text-sm text-ink-500">Cargando…</p>}>
      <VerificationPage />
    </Suspense>
  );
}
