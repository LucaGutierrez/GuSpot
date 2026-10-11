import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/card";

/** Datos de quien presta el servicio: completar antes del lanzamiento. */
export const LEGAL = {
  owner: "[Nombre o razón social del titular de GuSpot — a completar]",
  cuit: "[CUIT — a completar]",
  address: "[Domicilio legal — a completar]",
  email: "[Email de contacto — a completar]",
  updated: "12 de octubre de 2026",
};

/** Diseño común de Términos y Privacidad. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Container className="max-w-3xl pt-6 pb-16">
      <div role="note" className="mb-6 rounded-xl border border-accent-300 bg-accent-100 p-4 text-sm text-ink-900">
        <p className="font-semibold">Borrador</p>
        <p className="mt-1">
          Este texto describe cómo funciona GuSpot hoy, pero todavía no fue revisado por un abogado. Puede cambiar antes
          del lanzamiento.
        </p>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
      <p className="mt-1 text-sm text-ink-500">Última actualización: {LEGAL.updated}</p>
      <div className="legal mt-8 space-y-8 text-ink-700 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink-900 [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-10 text-sm text-ink-500">
        Ver también:{" "}
        <Link href="/terminos/" className="font-semibold text-brand-700 hover:underline">
          Términos y condiciones
        </Link>{" "}
        ·{" "}
        <Link href="/privacidad/" className="font-semibold text-brand-700 hover:underline">
          Política de privacidad
        </Link>
      </p>
    </Container>
  );
}
