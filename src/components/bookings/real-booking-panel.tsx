"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { Space } from "@/lib/types";
import { formatARS, formatRange } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-provider";
import { DataError, type Requirement, type Vehicle } from "@/lib/data/types";
import { createBooking } from "@/lib/data/bookings";
import { getPaymentSettings, serviceFeeOf, startCheckout, type PaymentSettings } from "@/lib/data/payments";
import { REQUIREMENT_LABEL, listMyVehicles, myMissingRequirements } from "@/lib/data/profile";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfoIcon } from "@/components/ui/icons";
import { AvailabilityBadge } from "@/components/driver/availability-status";
import { checkBooking } from "@/components/driver/booking-check";
import { PriceBreakdown, rateSummary } from "@/components/driver/price-breakdown";
import { rangeFromNow, rangeOrEmpty, readRange, type RangeValue } from "@/components/driver/range";
import { RangeFields, fieldInput, fieldLabel } from "@/components/driver/range-fields";
import { useNow } from "@/components/driver/use-now";
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

/** Reglas de pago (cargo de servicio, minutos para cancelar). Nunca falla: hay valores por defecto. */
export function usePaymentSettings(): PaymentSettings | null {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  useEffect(() => {
    getPaymentSettings().then(setSettings);
  }, []);
  return settings;
}

export function paymentNote(s: PaymentSettings | null): string {
  return `Pagás con Mercado Pago (tarjeta de crédito, débito o dinero en cuenta). Tenés ${s?.refundWindowMinutes ?? 10} minutos después de pagar para cancelar con devolución total.`;
}

/**
 * Panel "Reservar" de un garage real: elegís el período y el vehículo, ves el
 * total y pagás con Mercado Pago. Si el horario está libre se guarda el lugar
 * unos minutos y, con el pago aprobado, la reserva se confirma sola.
 * Usa useSearchParams: montarlo dentro de <Suspense>.
 */
export function RealBookingPanel({ space }: { space: Space }) {
  const id = useId();
  const params = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  // Sin horario por defecto: lo elige el conductor (con atajos "desde ahora").
  const now = useNow();
  const [value, setValue] = useState<RangeValue>(() => rangeOrEmpty(readRange(params)));
  const [quick, setQuick] = useState<number | null>(null);
  const pickNow = (hours: number) => {
    if (!now) return;
    setQuick(hours);
    setValue(rangeFromNow(now, hours));
  };
  const check = checkBooking(space, value, now);
  const driver = useDriver(auth.status === "signed-in");
  const fitting = driver.state === "ready" ? driver.vehicles.filter((v) => fitsVehicle(space.maxVehicle, v.size)) : [];
  const [chosen, setChosen] = useState<string | null>(null);
  const vehicleId = chosen && fitting.some((v) => v.id === chosen) ? chosen : (fitting[0]?.id ?? null);
  const verified = driver.state === "ready" && driver.missing.length === 0;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settings = usePaymentSettings();
  const fee = check.quote.ok && settings ? serviceFeeOf(check.quote.total, settings.serviceFeePercent) : null;
  const toPay = check.quote.ok && fee !== null ? check.quote.total + fee : null;

  const ready = check.status.ok && check.quote.ok && !!check.interval && verified && !!vehicleId && toPay !== null;
  const here = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";

  async function onReserve() {
    if (!check.interval || !vehicleId) return;
    setBusy(true);
    setError(null);
    let bookingId: string;
    try {
      bookingId = await createBooking({
        garageId: space.id,
        start: check.interval.start,
        end: check.interval.end,
        vehicleId,
      });
    } catch (err) {
      setError(err instanceof DataError ? err.message : "No pudimos reservar. Probá de nuevo.");
      setBusy(false);
      return;
    }
    try {
      window.location.assign(await startCheckout(bookingId));
    } catch {
      // El lugar ya está guardado: desde el detalle se puede volver a intentar el pago.
      router.push(`/reserva/?id=${bookingId}`);
    }
  }

  if (!space.commercial?.onlinePayments) {
    return (
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink-900">Reservas</h2>
        <p className="mt-1 text-sm text-ink-700">Este garage todavía no recibe reservas pagas por GuSpot.</p>
      </Card>
    );
  }

  const cta =
    auth.status === "signed-out" ? (
      <ButtonLink href={`/ingresar/?volver=${encodeURIComponent(here)}`} size="lg" className="w-full">
        Ingresá para reservar
      </ButtonLink>
    ) : (
      <Button size="lg" className="w-full" onClick={onReserve} disabled={!ready || busy || auth.status !== "signed-in"}>
        {busy ? "Abriendo Mercado Pago…" : ready && toPay !== null ? `Reservar y pagar · ${formatARS(toPay)}` : "Reservar y pagar"}
      </Button>
    );

  return (
    <>
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink-900">Reservá este garage</h2>
        <p className="mt-0.5 text-sm text-ink-500">{rateSummary(space)}</p>

        <div className="mt-4">
          <p className="text-sm font-semibold text-ink-900">¿Cuándo?</p>
          <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Desde ahora">
            <span className="text-sm text-ink-700">Desde ahora:</span>
            {[1, 2, 3, 4].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => pickNow(h)}
                aria-pressed={quick === h}
                aria-label={`Desde ahora, ${h} ${h === 1 ? "hora" : "horas"}`}
                className={`h-9 min-w-12 rounded-full border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-500 ${
                  quick === h ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 bg-white text-ink-900 hover:bg-ink-50"
                }`}
              >
                {h} h
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-500">O elegí otro día y horario:</p>
          <div className="mt-1">
            <RangeFields
              value={value}
              onChange={(v) => {
                setQuick(null);
                setValue(v);
              }}
              idPrefix={id}
            />
          </div>
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
                <a href="/cuenta/vehiculos/" className="font-semibold text-brand-700 hover:underline">
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
              <PriceBreakdown space={space} quote={check.quote} totalLabel="Tarifa del garage" />
              {fee !== null && toPay !== null && (
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-500">Cargo de servicio GuSpot ({settings?.serviceFeePercent} %)</dt>
                    <dd className="text-ink-900">{formatARS(fee)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-ink-200 pt-2 font-semibold">
                    <dt className="text-ink-900">Total a pagar</dt>
                    <dd className="text-ink-900">{formatARS(toPay)}</dd>
                  </div>
                </dl>
              )}
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
          {paymentNote(settings)}
        </p>
      </Card>

      {/* Barra fija para celulares, encima de la navegación inferior. */}
      <div className="fixed inset-x-0 bottom-[var(--mobile-nav-height)] z-20 border-t border-ink-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {ready && check.quote.ok && toPay !== null ? (
              <>
                <p className="font-bold text-ink-900">{formatARS(toPay)}</p>
                <p className="truncate text-xs text-ink-500">Total a pagar · {check.quote.hours} h</p>
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
