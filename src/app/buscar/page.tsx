import type { Metadata } from "next";
import { Suspense } from "react";
import { RedirectToSearch, SearchLink } from "./redirect-to-search";

export const metadata: Metadata = {
  title: "Buscar garajes",
  description: "La búsqueda de garajes está en la pantalla principal.",
};

/** Alias para enlaces viejos: redirige a "/" conservando la búsqueda. */
export default function BuscarPage() {
  return (
    <Suspense fallback={<SearchLink />}>
      <RedirectToSearch />
    </Suspense>
  );
}
