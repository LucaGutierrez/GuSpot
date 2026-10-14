import type { ReactNode } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/card";

/** Datos de quien presta el servicio (CUIT y domicilio: a sumar cuando el titular lo decida). */
export const LEGAL = {
  owner: "Luca Ferreira Gutierrez",
  email: "hola@guspotapp.com",
  updated: "14 de octubre de 2026",
};

/** Email de contacto como enlace. */
export function ContactEmail() {
  return (
    <a href={`mailto:${LEGAL.email}`} className="font-semibold text-brand-700 hover:underline">
      {LEGAL.email}
    </a>
  );
}

/** Diseño común de Términos y Privacidad. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Container className="max-w-3xl pt-6 pb-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
      <p className="mt-1 text-sm text-ink-500">Última actualización: {LEGAL.updated}</p>
      <div className="legal mt-8 space-y-8 text-ink-700 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink-900 [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-10 text-sm text-ink-500">
        GuSpot está en beta: este texto describe cómo funciona hoy, todavía no fue revisado por un abogado y puede
        actualizarse. Si cambia algo importante, te avisamos.
      </p>
      <p className="mt-3 text-sm text-ink-500">
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
