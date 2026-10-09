"use client";

import { SearchResults } from "@/components/driver/search-results";
import { Explore } from "./explore";
import { useIsMobile } from "./use-is-mobile";

/** Pantalla de carga mientras se lee la búsqueda: mapa (celular) o lista + mapa (escritorio). */
export function SearchFallback() {
  return (
    <>
      <div
        className="fixed inset-x-0 top-0 bottom-[var(--mobile-nav-height)] z-40 grid place-items-center bg-ink-100 text-sm text-ink-500 md:hidden"
        aria-busy="true"
      >
        Cargando mapa…
      </div>
      <div
        className="hidden grid-cols-2 md:grid"
        style={{ height: "calc(100dvh - var(--app-top))" }}
        aria-busy="true"
        aria-label="Cargando resultados"
      >
        <div className="space-y-4 overflow-hidden px-6 py-6">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-ink-100" />
          <div className="h-40 animate-pulse rounded-2xl bg-ink-100" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-ink-100" />
          ))}
        </div>
        <div className="border-l border-ink-200 bg-ink-100" />
      </div>
    </>
  );
}

/**
 * Pantalla principal ("/"): mapa a pantalla completa en celulares y lista +
 * mapa en escritorio. Usa useSearchParams: montarlo dentro de <Suspense>.
 */
export function SearchView() {
  const isMobile = useIsMobile();
  return isMobile ? <Explore /> : <SearchResults />;
}
