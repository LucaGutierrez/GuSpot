"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import type { Space, VehicleSize } from "@/lib/types";
import { VEHICLE_LABEL, formatARS, formatRange } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-provider";
import { DataError } from "@/lib/data/types";
import { createBooking } from "@/lib/data/bookings";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfoIcon } from "@/components/ui/icons";
import { AvailabilityBadge } from "@/components/driver/availability-status";
import { checkBooking } from "@/components/driver/booking-check";
import { PriceBreakdown, rateSummary } from "@/components/driver/price-breakdown";
import { readRange } from "@/components/driver/range";
import { RangeFields, fieldInput, fieldLabel } from "@/components/driver/range-fields";
import { useRange } from "@/components/driver/use-range";
import { VEHICLE_ORDER, fitsVehicle } from "@/components/driver/vehicles";

export const TEST_PAYMENT_NOTE =
  "Versión de prueba: la reserva se confirma al instante y no se cobra nada. Pronto se pagará al reservar con tarjeta o Mercado Pago.";

/**
 * Panel "Reservar" de un garage real: elegís el período y el vehículo, ves el
 * total y reservás. Si el horario está libre, la reserva se confirma sola.
 * Usa useSearchParams: montarlo dentro de <Suspense>.
 */
export function RealBookingPanel({ space }: { space: Space }) {
  const id = useId();
  const params = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const { value, setValue, now } = useRange(readRange(params));
  const check = checkBooking(space, value, now);
  const vehicles = VEHICLE_ORDER.filter((v) => fitsVehicle(space.maxVehicle, v));
  const [vehicle, setVehicle] = useState<VehicleSize>(vehicles.includes("auto_mediano") ? "auto_mediano" : vehicles[0]);
  const [plate, setPlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = check.status.ok && check.quote.ok && !!check.interval;
  const here = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";

  async function onReserve() {
    if (!check.interval) return;
    setBusy(true);
    setError(null);
    try {
      const bookingId = await createBooking({
        garageId: space.id,
        start: check.interval.start,
        end: check.interval.end,
        vehicle,
        plate,
      });
      router.push(`/reserva/?id=${bookingId}&nueva=1`);
    } catch (err) {
      setError(err instanceof DataError ? err.message : "No pudimos reservar. Probá de nuevo.");
      setBusy(false);
    }
  }

  const cta =
    auth.status === "signed-out" ? (
      <ButtonLink href={`/ingresar/?volver=${encodeURIComponent(here)}`} size="lg" className="w-full">
        Ingresá para reservar
      </ButtonLink>
    ) : (
      <Button size="lg" className="w-full" onClick={onReserve} disabled={!ready || busy || auth.status !== "signed-in"}>
        {busy ? "Reservando…" : ready && check.quote.ok ? `Reservar · ${formatARS(check.quote.total)}` : "Reservar"}
      </Button>
    );

  return (
    <>
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink-900">Reservá este garage</h2>
        <p className="mt-0.5 text-sm text-ink-500">{rateSummary(space)}</p>

        <div className="mt-4">
          <RangeFields value={value} onChange={setValue} idPrefix={id} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-vehiculo`} className={fieldLabel}>
              Tu vehículo
            </label>
            <select
              id={`${id}-vehiculo`}
              className={fieldInput}
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value as VehicleSize)}
            >
              {vehicles.map((v) => (
                <option key={v} value={v}>
                  {VEHICLE_LABEL[v]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-patente`} className={fieldLabel}>
              Patente <span className="font-normal text-ink-500">(opcional)</span>
            </label>
            <input
              id={`${id}-patente`}
              className={`${fieldInput} uppercase`}
              value={plate}
              maxLength={12}
              autoComplete="off"
              onChange={(e) => setPlate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 space-y-3" aria-live="polite">
          <AvailabilityBadge status={check.status} />
          {!check.status.ok && check.status.detail && <p className="text-sm text-ink-500">{check.status.detail}</p>}
          {check.interval && check.quote.ok && (
            <>
              <p className="text-sm text-ink-700">{formatRange(check.interval.start, check.interval.end)}</p>
              <PriceBreakdown space={space} quote={check.quote} />
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mt-5 hidden md:block">{cta}</div>
        <p className="mt-3 flex gap-2 text-xs text-ink-500">
          <InfoIcon width={16} height={16} className="shrink-0" />
          {TEST_PAYMENT_NOTE}
        </p>
      </Card>

      {/* Barra fija para celulares, encima de la navegación inferior. */}
      <div className="fixed inset-x-0 bottom-[var(--mobile-nav-height)] z-20 border-t border-ink-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {ready && check.quote.ok ? (
              <>
                <p className="font-bold text-ink-900">{formatARS(check.quote.total)}</p>
                <p className="truncate text-xs text-ink-500">Total · {check.quote.hours} h</p>
              </>
            ) : (
              <p className="line-clamp-2 text-xs text-ink-700">{check.status.label}</p>
            )}
          </div>
          <div className="w-48 shrink-0">{cta}</div>
        </div>
      </div>
    </>
  );
}
