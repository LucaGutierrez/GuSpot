import type { Metadata } from "next";
import { Suspense } from "react";
import { RedirectToSearch, SearchLink } from "./redirect-to-search";

export const metadata: Metadata = {
  title: "Buscar cocheras",
  description: "La búsqueda de cocheras está en la pantalla principal (datos de demostración).",
};

/** Alias para enlaces viejos: redirige a "/" conservando la búsqueda. */
export default function BuscarPage() {
  return (
    <Suspense fallback={<SearchLink />}>
      <RedirectToSearch />
    </Suspense>
  );
}
