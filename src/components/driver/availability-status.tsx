import type { AvailabilityResult } from "@/lib/availability";
import type { Quote } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, InfoIcon } from "@/components/ui/icons";

export type Bookability =
  | { ok: true; label: string }
  | { ok: false; label: string; detail?: string };

/** Combina disponibilidad y cotización en un único estado legible. */
export function bookability(availability: AvailabilityResult, q: Quote): Bookability {
  if (!q.ok) return { ok: false, label: q.reason };
  if (!availability.available) {
    return {
      ok: false,
      label: "No disponible en ese horario",
      detail:
        availability.reason === "ocupado"
          ? "Ya hay otra reserva o un bloqueo en ese período."
          : "El período elegido queda fuera del horario del espacio.",
    };
  }
  return { ok: true, label: "Disponible" };
}

export function AvailabilityBadge({ status }: { status: Bookability }) {
  return (
    <Badge tone={status.ok ? "success" : "warning"}>
      {status.ok ? <CheckIcon width={14} height={14} /> : <InfoIcon width={14} height={14} />}
      {status.label}
    </Badge>
  );
}
