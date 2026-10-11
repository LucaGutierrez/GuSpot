import type { ReactNode } from "react";
import { InfoIcon } from "./icons";
import { isBackendConfigured } from "@/lib/supabase/config";

/** Franja fija en todas las páginas: deja claro que es una demo. */
export function DemoBanner() {
  return (
    <div data-app-chrome className="bg-ink-900 px-4 py-2 text-center text-xs text-white sm:text-sm">
      {isBackendConfigured ? (
        <>
          <strong className="font-semibold text-accent-300">Versión en desarrollo.</strong> La disponibilidad la
          informa cada garage. Todavía no se puede pagar desde GuSpot.
        </>
      ) : (
        <>
          <strong className="font-semibold text-accent-300">Versión de demostración.</strong> Los espacios,
          precios y reservas son de ejemplo. No se procesan reservas ni pagos reales.
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
