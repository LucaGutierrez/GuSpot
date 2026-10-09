"use client";

import { useEffect } from "react";

/**
 * Mide el banner de demo y el encabezado (elementos con `data-app-chrome`) y
 * publica la suma en la variable CSS `--app-top`. Las pantallas de alto
 * completo (mapa + lista en escritorio) la usan para ocupar exactamente el
 * resto de la ventana, sin quedar cortadas.
 */
export function ChromeHeight() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-app-chrome]")];
    const update = () => {
      const total = els.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0);
      document.documentElement.style.setProperty("--app-top", `${Math.round(total)}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    els.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, []);
  return null;
}
