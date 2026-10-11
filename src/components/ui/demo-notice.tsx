import type { ReactNode } from "react";
import { InfoIcon } from "./icons";
import { isBackendConfigured } from "@/lib/supabase/config";

/** Franja fija en todas las páginas: GuSpot está en beta (funciona, en prueba). */
export function DemoBanner() {
  return (
    <div data-app-chrome className="bg-ink-900 px-4 py-2 text-center text-xs text-white sm:text-sm">
      {isBackendConfigured ? (
        <>
          <strong className="font-semibold text-accent-300">GuSpot Beta</strong> · Ya funciona en CABA y estamos
          sumando garajes. Los pagos con Mercado Pago son reales.
        </>
      ) : (
        <>
          <strong className="font-semibold text-accent-300">Sin conexión al servidor.</strong> Esta copia del sitio
          no muestra garajes ni permite cuentas.
        </>
      )}
    </div>
  );
}

/** Aviso en línea para explicar qué parte de una pantalla no funciona todavía. */
export function DemoNotice({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-900"
    >
      <InfoIcon className="mt-0.5 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? "mt-1" : ""}>{children}</div>
      </div>
    </div>
  );
}
