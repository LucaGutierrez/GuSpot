import type { ReactNode } from "react";
import type { BookingStatus, ListingStatus, PaymentStatus } from "@/lib/types";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/format";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "demo";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-accent-100 text-accent-700",
  danger: "bg-red-50 text-red-700",
  demo: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Etiqueta para marcar contenido de demostración. */
export function DemoBadge({ label = "Demo" }: { label?: string }) {
  return <Badge tone="demo">{label}</Badge>;
}

const bookingTone: Record<BookingStatus, Tone> = {
  solicitada: "warning",
  confirmada: "success",
  rechazada: "danger",
  expirada: "neutral",
  cancelada: "neutral",
  completada: "brand",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={bookingTone[status]}>{BOOKING_STATUS_LABEL[status]}</Badge>;
}

/** Estado del pago, siempre separado del estado de la reserva. */
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tone: Tone =
    status === "aprobado" ? "success" : status === "rechazado" ? "danger" : "neutral";
  return <Badge tone={tone}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}

const listingLabel: Record<ListingStatus, [string, Tone]> = {
  publicado: ["Publicado", "success"],
  pausado: ["Pausado", "neutral"],
  borrador: ["Borrador", "warning"],
};

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  const [label, tone] = listingLabel[status];
  return <Badge tone={tone}>{label}</Badge>;
}
