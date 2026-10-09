"use client";

import { Suspense, type ReactNode } from "react";
import { SearchResults } from "@/components/driver/search-results";
import { Explore } from "./explore";
import { useIsMobile } from "./use-is-mobile";

/** Pantalla de carga del mapa a pantalla completa (celular). */
export function ExploreFallback() {
  return (
    <div
      className="fixed inset-x-0 top-0 bottom-[var(--mobile-nav-height)] z-40 grid place-items-center bg-ink-100 text-sm text-ink-500 md:hidden"
      aria-busy="true"
    >
      Cargando mapa…
    </div>
  );
}

/**
 * Inicio: en celulares muestra el mapa (`Explore`) a pantalla completa por
 * encima del contenido, que queda inerte detrás. En escritorio no monta el mapa
 * y deja el inicio tal cual.
 */
export function HomeExplore({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  return (
    <>
      {isMobile && (
        <Suspense fallback={<ExploreFallback />}>
          <Explore />
        </Suspense>
      )}
      <div inert={isMobile}>{children}</div>
    </>
  );
}

/**
 * /buscar/: mapa a pantalla completa en celulares y lista + mapa en escritorio.
 * Usa useSearchParams: montarlo dentro de <Suspense>.
 */
export function BuscarView() {
  const isMobile = useIsMobile();
  return isMobile ? <Explore /> : <SearchResults />;
}
