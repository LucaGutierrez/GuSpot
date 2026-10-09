"use client";

import { useSyncExternalStore } from "react";

/** Mismo corte que `md:` de Tailwind: menos de 768 px es celular. */
export const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;
// En el build estático (y durante la hidratación) se asume escritorio: así el
// mapa de celular no se inicia hasta confirmar el ancho real en el navegador.
const getServerSnapshot = () => false;

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
