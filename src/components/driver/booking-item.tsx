import Link from "next/link";
import type { Booking, Space } from "@/lib/types";
import { formatARS, formatRange } from "@/lib/format";
import { BookingStatusBadge, DemoBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClockIcon, KeyIcon, PinIcon } from "@/components/ui/icons";
import { SpacePhoto } from "@/components/ui/space-photo";

/** Una reserva del conductor. Estado de reserva y de pago siempre por separado. */
export function BookingItem({ booking, space }: { booking: Booking; space?: Space }) {
  const photo = space?.photos[0];
  const confirmed = booking.status === "confirmada";

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        {photo && (
          <SpacePhoto
            variant={photo.variant}
            label={photo.caption}
            className="hidden h-24 w-32 shrink-0 rounded-xl sm:block"
          />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <DemoBadge />
            <span className="text-xs text-ink-500">Reserva:</span>
            <BookingStatusBadge status={booking.status} />
            <span className="text-xs text-ink-500">Pago:</span>
            <PaymentStatusBadge status={booking.paymentStatus} />
          </div>
          <h3 className="font-semibold text-ink-900">
            {space ? (
              <Link
                href={`/espacios/${space.id}/`}
                className="hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                {space.title}
              </Link>
            ) : (
              "Espacio no disponible"
            )}
          </h3>
          {space && (
            <p className="flex items-start gap-1 text-sm text-ink-500">
              <PinIcon width={16} height={16} className="mt-0.5 shrink-0" />
              {space.neighborhood}, {space.city} · {space.approxLocation}
            </p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-ink-500">Período</dt>
            <dd className="text-ink-900">{formatRange(booking.start, booking.end)}</dd>
            <dt className="text-ink-500">Total</dt>
            <dd className="font-semibold text-ink-900">{formatARS(booking.totalPrice)}</dd>
            {booking.vehicle && (
              <>
                <dt className="text-ink-500">Vehículo</dt>
                <dd className="text-ink-900">{booking.vehicle}</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      {booking.status === "solicitada" && (
        <p className="flex items-center gap-2 border-t border-ink-200 bg-accent-100/50 px-4 py-3 text-sm text-ink-700">
          <ClockIcon className="shrink-0 text-accent-700" />
          Esperando respuesta del propietario.
        </p>
      )}

      {confirmed && (
        <div className="space-y-3 border-t border-ink-200 bg-ink-50 px-4 py-4 text-sm">
          <div className="flex items-start gap-3">
            <KeyIcon className="mt-0.5 shrink-0 text-brand-700" />
            <div>
              <p className="font-semibold text-ink-900">Código de llegada</p>
              <p className="mt-1 font-mono text-lg tracking-widest text-ink-400 select-none">
                <span aria-hidden="true">••••-••••</span>
                <span className="sr-only">Código oculto</span>
              </p>
              <p className="mt-1 text-ink-500">
                Se mostrará desde 2 h antes del inicio, solo a vos y al propietario. En esta demo
                no se generan códigos.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <PinIcon className="mt-0.5 shrink-0 text-brand-700" />
            <p className="text-ink-700">
              <span className="font-semibold text-ink-900">Dirección:</span> se muestra aquí
              cuando la reserva está confirmada (no disponible en la demo).
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
