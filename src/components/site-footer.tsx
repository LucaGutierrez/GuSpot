"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  // En el mapa (pantalla principal) la vista ocupa todo el alto: sin pie de página.
  if (usePathname() === "/") return null;
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <strong className="text-ink-700">GuSpot</strong> · Beta en Argentina · Precios en ARS.
        </p>
        <nav className="flex flex-wrap gap-4" aria-label="Pie de página">
          <Link href="/" className="hover:text-ink-900">Buscar en el mapa</Link>
          <Link href="/como-funciona/" className="hover:text-ink-900">Cómo funciona</Link>
          <Link href="/mis-reservas/" className="hover:text-ink-900">Mis reservas</Link>
          <Link href="/publicar/" className="hover:text-ink-900">Sumá tu garaje</Link>
          <Link href="/terminos/" className="hover:text-ink-900">Términos</Link>
          <Link href="/privacidad/" className="hover:text-ink-900">Privacidad</Link>
        </nav>
      </div>
    </footer>
  );
}
