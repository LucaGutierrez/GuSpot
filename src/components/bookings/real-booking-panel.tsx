"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { Space } from "@/lib/types";
import { formatARS, formatRange } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-provider";
import { DataError, type Requirement, type Vehicle } from "@/lib/data/types";
import { createBooking } from "@/lib/data/bookings";
import { REQUIREMENT_LABEL, listMyVehicles, myMissingRequirements } from "@/lib/data/profile";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfoIcon } from "@/components/ui/icons";
import { AvailabilityBadge } from "@/components/driver/availability-status";
import { checkBooking } from "@/components/driver/booking-check";
import { PriceBreakdown, rateSummary } from "@/components/driver/price-breakdown";
import { readRange } from "@/components/driver/range";
import { RangeFields, fieldInput, fieldLabel } from "@/components/driver/range-fields";
import { useRange } from "@/components/driver/use-range";
import { fitsVehicle } from "@/components/driver/vehicles";

type DriverState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; missing: Requirement[]; vehicles: Vehicle[] };

/** Requisitos y vehículos del conductor (solo con sesión). */
function useDriver(enabled: boolean): DriverState {
  const [data, setData] = useState<DriverState>({ state: "loading" });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.all([myMissingRequirements("conductor"), listMyVehicles()])
      .then(([missing, vehicles]) => !cancelled && setData({ state: "ready", missing, vehicles }))
      .catch(() => !cancelled && setData({ state: "error" }));
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return data;
}

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
  const driver = useDriver(auth.status === "signed-in");
  const fitting = driver.state === "ready" ? driver.vehicles.filter((v) => fitsVehicle(space.maxVehicle, v.size)) : [];
  const [chosen, setChosen] = useState<string | null>(null);
  const vehicleId = chosen && fitting.some((v) => v.id === chosen) ? chosen : (fitting[0]?.id ?? null);
  const verified = driver.state === "ready" && driver.missing.length === 0;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = check.status.ok && check.quote.ok && !!check.interval && verified && !!vehicleId;
  const here = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";

  async function onReserve() {
    if (!check.interval || !vehicleId) return;
    setBusy(true);
    setError(null);
    try {
      const bookingId = await createBooking({
        garageId: space.id,
        start: check.interval.start,
        end: check.interval.end,
        vehicleId,
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

        {auth.status === "signed-in" && driver.state === "ready" && driver.missing.length > 0 && (
          <div className="mt-4 rounded-xl border border-accent-300 bg-accent-100 p-3 text-sm text-ink-900">
            <p className="font-semibold">Antes de tu primera reserva, verificá tu identidad:</p>
            <ul className="mt-1 list-disc pl-5">
              {driver.missing.map((m) => (
                <li key={m}>{REQUIREMENT_LABEL[m]}</li>
              ))}
            </ul>
            <ButtonLink href={`/verificacion/?volver=${encodeURIComponent(here)}`} className="mt-3 w-full">
              Completar verificación
            </ButtonLink>
          </div>
        )}

        {verified && (
          <div className="mt-4">
            <label htmlFor={`${id}-vehiculo`} className={fieldLabel}>
              Tu vehículo
            </label>
            {fitting.length > 0 ? (
              <select
                id={`${id}-vehiculo`}
                className={fieldInput}
                value={vehicleId ?? ""}
                onChange={(e) => setChosen(e.target.value)}
              >
                {fitting.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} · {v.plate}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm text-ink-700">
                Ninguno de tus vehículos entra en este garage.{" "}
                <a href="/verificacion/#vehiculos" className="font-semibold text-brand-700 hover:underline">
                  Agregá otro
                </a>
                .
              </p>
            )}
          </div>
        )}

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
