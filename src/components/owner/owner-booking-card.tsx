import type { ReactNode } from "react";
import type { Booking } from "@/lib/types";
import { formatARS, formatRange } from "@/lib/format";
import { durationHours } from "@/lib/datetime";
import { Card } from "@/components/ui/card";
import { BookingStatusBadge, DemoBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { CalendarIcon, CarIcon } from "@/components/ui/icons";

/**
 * Reserva vista por el propietario. El estado de la reserva y el del pago se
 * muestran siempre por separado; en la demo el pago es "no disponible".
 */
export function OwnerBookingCard({
  booking,
  spaceTitle,
  children,
}: {
  booking: Booking;
  /** Se omite cuando la tarjeta ya está dentro de la página del espacio. */
  spaceTitle?: string;
  /** Acciones (Aceptar / Rechazar) o avisos debajo de la tarjeta. */
  children?: ReactNode;
}) {
  const hours = durationHours(booking.start, booking.end);
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {spaceTitle && (
            <p className="truncate text-sm font-semibold text-ink-900">{spaceTitle}</p>
          )}
          <p className="text-sm text-ink-700">
            {booking.driverName} <DemoBadge />
          </p>
        </div>
        <p className="text-xs text-ink-500">Reserva {booking.id}</p>
      </div>

      <ul className="flex flex-col gap-1.5 text-sm text-ink-700">
        <li className="flex items-start gap-2">
          <CalendarIcon className="mt-0.5 shrink-0 text-ink-400" width={18} height={18} />
          <span>
            {formatRange(booking.start, booking.end)}{" "}
            <span className="text-ink-500">({hours} h)</span>
          </span>
        </li>
        {booking.vehicle && (
          <li className="flex items-start gap-2">
            <CarIcon className="mt-0.5 shrink-0 text-ink-400" width={18} height={18} />
            <span>{booking.vehicle}</span>
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-3">
        <div>
          <p className="text-xs text-ink-500">Total estimado</p>
          <p className="text-base font-semibold text-ink-900">{formatARS(booking.totalPrice)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="sr-only">Estado de la reserva:</span>
          <BookingStatusBadge status={booking.status} />
          <span className="sr-only">Estado del pago:</span>
          <PaymentStatusBadge status={booking.paymentStatus} />
        </div>
      </div>

      {children}
    </Card>
  );
}
