"use client";

import { useState } from "react";
import type { ListingStatus } from "@/lib/types";
import { ListingStatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/demo-notice";

const HELP: Record<ListingStatus, string> = {
  publicado: "Los conductores pueden encontrar este espacio y pedir reservas.",
  pausado: "No aparece en las búsquedas y no recibe solicitudes nuevas.",
  borrador: "Todavía no está publicado: completá los datos que faltan para publicarlo.",
};

/** Estado de la publicación con un interruptor Pausar / Reanudar solo en memoria. */
export function ListingStatusControl({
  initialStatus,
  editHref,
}: {
  initialStatus: ListingStatus;
  editHref: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [changed, setChanged] = useState(false);

  function toggle() {
    setStatus((s) => (s === "publicado" ? "pausado" : "publicado"));
    setChanged(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-sm text-ink-700">
            Estado: <ListingStatusBadge status={status} />
          </p>
          <p className="text-sm text-ink-500">{HELP[status]}</p>
        </div>
        {status === "borrador" ? (
          <ButtonLink href={editHref}>Completar publicación</ButtonLink>
        ) : (
          <Button variant="secondary" onClick={toggle} aria-pressed={status === "pausado"}>
            {status === "publicado" ? "Pausar publicación" : "Reanudar publicación"}
          </Button>
        )}
      </div>
      <div role="status" aria-live="polite">
        {changed && (
          <DemoNotice>
            Demo: el cambio de estado no se guardó y se pierde al recargar. Qué pasa con las reservas ya
            confirmadas cuando pausás un espacio: a definir.
          </DemoNotice>
        )}
      </div>
    </div>
  );
}
