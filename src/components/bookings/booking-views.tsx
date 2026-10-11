"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { BookingAccess, RealBooking } from "@/lib/data/types";
import { DataError } from "@/lib/data/types";
import { cancelBooking, getBooking, getBookingAccess, listMyBookings, listOwnerBookings } from "@/lib/data/bookings";
import { cancelPaidBooking, startCheckout, syncPayment } from "@/lib/data/payments";
import type { BookingStatus } from "@/lib/types";
import { VEHICLE_LABEL, formatARS, formatRange } from "@/lib/format";
import { toMs } from "@/lib/datetime";
import { useNow, useNowMs } from "@/components/driver/use-now";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { ChevronLeftIcon, KeyIcon, PinIcon } from "@/components/ui/icons";
import { MapView } from "@/components/map/map-view";
import { NavigateButtons } from "@/components/garage/navigate-buttons";
import { EmptyState } from "@/components/owner/section";
import { ErrorBox, RequireSignIn, SuccessBox } from "@/components/my-garages/shared";
import { paymentNote, usePaymentSettings } from "./real-booking-panel";

type Load<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: T };

const errText = (err: unknown) => (err instanceof DataError ? err.message : "No pudimos cargar los datos.");


// ---------------------------------------------------------------- /reserva/?id=

/** Una reserva esperando el pago cuyo tiempo ya pasó se muestra como vencida. */
function shownStatus(b: RealBooking, nowMs: number): BookingStatus {
  if (b.status === "pendiente_pago" && (!b.holdUntil || Date.parse(b.holdUntil) <= nowMs)) return "expirada";
  return b.status;
}

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });

/** Detalle de una reserva real. Lee `?id=`: montarlo dentro de <Suspense>. */
export function BookingDetailPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const fromPayment = params.get("pago") === "1";
  return (
    <Container className="max-w-3xl pt-4 pb-12">
      <Link href="/mis-reservas/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        <ChevronLeftIcon width={16} height={16} /> Mis reservas
      </Link>
      <div className="mt-4">
        <RequireSignIn back={`/reserva/?id=${id}`}>
          {() => <BookingLoader key={id} id={id} fromPayment={fromPayment} />}
        </RequireSignIn>
      </div>
    </Container>
  );
}

function BookingLoader({ id, fromPayment }: { id: string; fromPayment: boolean }) {
  const [load, setLoad] = useState<Load<{ booking: RealBooking | null; access: BookingAccess | null }>>({
    state: "loading",
  });
  const [tick, setTick] = useState(0);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let booking = await getBooking(id);
      // Si sigue esperando el pago (p. ej. al volver de Mercado Pago) se consulta el pago.
      if (booking && booking.role === "driver" && booking.status === "pendiente_pago") {
        await syncPayment(id).catch(() => {});
        booking = await getBooking(id);
      }
      const access =
        booking && booking.role === "driver" && booking.status === "confirmada" ? await getBookingAccess(id) : null;
      return { booking, access };
    })()
      .then((data) => !cancelled && setLoad({ state: "ready", data }))
      .catch((err) => !cancelled && setLoad({ state: "error", message: errText(err) }));
    return () => {
      cancelled = true;
    };
  }, [id, tick, tries]);

  // Recién vuelto de pagar: el aviso de Mercado Pago puede tardar unos segundos.
  const waiting =
    fromPayment &&
    load.state === "ready" &&
    load.data.booking?.status === "pendiente_pago" &&
    load.data.booking.paymentStatus !== "rechazado" &&
    tries < 5;
  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => setTries((n) => n + 1), 3000);
    return () => clearTimeout(t);
  }, [waiting, tries]);

  if (load.state === "loading") return <p className="text-sm text-ink-500">Cargando reserva…</p>;
  if (load.state === "error") return <ErrorBox>{load.message}</ErrorBox>;
  if (!load.data.booking) return <ErrorBox>No encontramos esa reserva.</ErrorBox>;
  return (
    <BookingDetail
      booking={load.data.booking}
      access={load.data.access}
      fromPayment={fromPayment}
      confirmingPayment={waiting}
      onChanged={() => setTick((t) => t + 1)}
    />
  );
}

function BookingDetail({
  booking: b,
  access,
  fromPayment,
  confirmingPayment,
  onChanged,
}: {
  booking: RealBooking;
  access: BookingAccess | null;
  fromPayment: boolean;
  confirmingPayment: boolean;
  onChanged: () => void;
}) {
  const now = useNow();
  const nowMs = useNowMs();
  const status = shownStatus(b, nowMs);
  const started = now ? toMs(b.start) <= toMs(now) : false;
  const canCancel = b.role === "driver" && (status === "pendiente_pago" || (b.status === "confirmada" && !started));
  const settings = usePaymentSettings();
  const marker = useMemo(
    () => (access ? [{ id: b.id, position: access.location, label: "Tu cochera", ariaLabel: "Ubicación del garaje" }] : []),
    [access, b.id],
  );

  return (
    <div className="flex flex-col gap-4">
      {fromPayment && b.status === "confirmada" && b.paymentStatus === "aprobado" && (
        <SuccessBox>¡Pago aprobado! Tu reserva quedó confirmada. Abajo tenés la dirección y cómo entrar.</SuccessBox>
      )}
      {confirmingPayment && (
        <p className="text-sm text-ink-700" aria-live="polite">
          Confirmando tu pago con Mercado Pago…
        </p>
      )}

      {b.role === "driver" && status === "pendiente_pago" && !confirmingPayment && (
        <PayNow booking={b} rejected={b.paymentStatus === "rechazado"} />
      )}
      {b.role === "driver" && status === "expirada" && (
        <ErrorBox>
          Se venció el tiempo para pagar y el lugar se liberó. Si querés, volvé a{" "}
          <Link href={`/espacio/?id=${b.garageId}`} className="font-semibold underline">
            reservar este garaje
          </Link>
          .
        </ErrorBox>
      )}

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={status} />
          <PaymentStatusBadge status={b.paymentStatus} />
        </div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
          <Link href={`/espacio/?id=${b.garageId}`} className="hover:underline">
            {b.garageTitle}
          </Link>
        </h1>
        <p className="text-ink-700">{formatRange(b.start, b.end)}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink-500">Duración</dt>
            <dd className="font-medium text-ink-900">{b.hours} h</dd>
          </div>
          <div>
            <dt className="text-ink-500">{b.role === "owner" ? "Tu tarifa" : "Tarifa del garaje"}</dt>
            <dd className="font-medium text-ink-900">{formatARS(b.total)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Vehículo</dt>
            <dd className="font-medium text-ink-900">{b.car || VEHICLE_LABEL[b.vehicle]}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Patente</dt>
            <dd className="font-medium text-ink-900">{b.plate || "—"}</dd>
          </div>
          {b.carInsurance && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-ink-500">Seguro</dt>
              <dd className="font-medium text-ink-900">{b.carInsurance}</dd>
            </div>
          )}
          {b.role === "driver" && b.serviceFee > 0 && (
            <>
              <div>
                <dt className="text-ink-500">Cargo de servicio</dt>
                <dd className="font-medium text-ink-900">{formatARS(b.serviceFee)}</dd>
              </div>
              <div>
                <dt className="text-ink-500">{b.paymentStatus === "aprobado" ? "Total pagado" : "Total a pagar"}</dt>
                <dd className="font-medium text-ink-900">{formatARS(b.total + b.serviceFee)}</dd>
              </div>
            </>
          )}
          {b.role === "owner" && (
            <div className="col-span-2">
              <dt className="text-ink-500">Conductor</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium text-ink-900">
                <Avatar url={b.driverAvatarUrl} name={b.driverName || "Conductor"} size={32} />
                {b.driverName || "Sin nombre"}
              </dd>
            </div>
          )}
        </dl>
        {b.paymentStatus === "no_disponible" ? (
          <p className="text-xs text-ink-500">Reserva de prueba, hecha antes de que existieran los pagos: no se cobró nada.</p>
        ) : (
          b.role === "driver" && <p className="text-xs text-ink-500">{paymentNote(settings)}</p>
        )}
      </Card>

      {b.role === "driver" && b.status === "confirmada" && access && (
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-semibold text-ink-900">Cómo llegar</h2>
          <p className="flex items-start gap-2 text-ink-900">
            <PinIcon className="mt-0.5 shrink-0 text-brand-600" />
            <span className="font-medium">{access.address}</span>
          </p>
          {access.arrivalInstructions ? (
            <div className="flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-sm text-ink-900">
              <KeyIcon className="mt-0.5 shrink-0 text-brand-600" />
              <p className="whitespace-pre-line">{access.arrivalInstructions}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-500">El dueño no cargó indicaciones de llegada.</p>
          )}
          <div className="relative h-56 overflow-hidden rounded-xl border border-ink-200">
            <MapView
              className="absolute inset-0 h-full w-full"
              markers={marker}
              selectedId={null}
              onSelect={() => {}}
              fitKey={b.id}
              fallbackCenter={access.location}
              userLocation={null}
            />
          </div>
          <NavigateButtons to={access.location} />
        </Card>
      )}

      {canCancel && !confirmingPayment && (
        <CancelBooking booking={b} refundMinutes={settings?.refundWindowMinutes ?? 10} onDone={onChanged} />
      )}
    </div>
  );
}

/** Reserva guardada esperando el pago: botón para (volver a) pagar. */
function PayNow({ booking: b, rejected }: { booking: RealBooking; rejected: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPay() {
    setBusy(true);
    setError(null);
    try {
      window.location.assign(await startCheckout(b.id));
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 border-accent-300 bg-accent-100 p-5">
      <p className="font-semibold text-ink-900">
        {rejected ? "Mercado Pago rechazó el pago. Probá con otro medio." : "Falta pagar para confirmar la reserva."}
      </p>
      {b.holdUntil && <p className="text-sm text-ink-700">Te guardamos el lugar hasta las {hhmm(b.holdUntil)}.</p>}
      <Button size="lg" onClick={onPay} disabled={busy}>
        {busy ? "Abriendo Mercado Pago…" : `Pagar ${formatARS(b.total + b.serviceFee)} con Mercado Pago`}
      </Button>
      {error && <ErrorBox>{error}</ErrorBox>}
    </Card>
  );
}

function CancelBooking({
  booking: b,
  refundMinutes,
  onDone,
}: {
  booking: RealBooking;
  refundMinutes: number;
  onDone: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paid = b.status === "confirmada" && b.paymentStatus === "aprobado";
  const refundUntil = paid && b.paidAt ? Date.parse(b.paidAt) + refundMinutes * 60_000 : 0;
  const nowMs = useNowMs();
  const withRefund = paid && nowMs < refundUntil;

  async function onCancel() {
    setBusy(true);
    setError(null);
    try {
      if (b.paymentStatus === "no_disponible") await cancelBooking(b.id);
      else await cancelPaidBooking(b.id, paid && !withRefund);
      onDone();
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  const question = !paid
    ? "¿Cancelar la reserva? El lugar queda libre para otros conductores. No se te cobra nada."
    : withRefund
      ? `¿Cancelar la reserva? Te devolvemos ${formatARS(b.total + b.serviceFee)} completos al mismo medio de pago.`
      : "¿Cancelar la reserva? Ya pasó el tiempo para cancelar con devolución: el lugar se libera, pero NO se te devuelve el pago.";

  return (
    <Card className="flex flex-col gap-3 p-5">
      {confirming ? (
        <>
          <p className="text-sm text-ink-700">{question}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Cancelando…" : paid && !withRefund ? "Sí, cancelar sin devolución" : "Sí, cancelar"}
            </button>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              Volver
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <div>
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              {b.status === "pendiente_pago" ? "Cancelar y liberar el lugar" : "Cancelar reserva"}
            </Button>
          </div>
          {withRefund && (
            <p className="text-xs text-ink-500">Con devolución total hasta las {hhmm(new Date(refundUntil).toISOString())}.</p>
          )}
        </div>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
    </Card>
  );
}

// ---------------------------------------------------------------- listas

function BookingRow({ b, nowMs }: { b: RealBooking; nowMs: number }) {
  return (
    <li>
      <Link
        href={`/reserva/?id=${b.id}`}
        className="flex flex-col gap-1 rounded-2xl border border-ink-200 bg-white p-4 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={shownStatus(b, nowMs)} />
          <span className="text-sm font-semibold text-ink-900">
            {formatARS(b.role === "driver" ? b.total + b.serviceFee : b.total)}
          </span>
        </div>
        <p className="font-semibold text-ink-900">{b.garageTitle}</p>
        <p className="text-sm text-ink-700">{formatRange(b.start, b.end)}</p>
        <p className="text-xs text-ink-500">
          {b.role === "owner"
            ? `${b.driverName || "Conductor"} · ${b.car || VEHICLE_LABEL[b.vehicle]}${b.plate ? ` · ${b.plate}` : ""}`
            : b.garageNeighborhood}
        </p>
      </Link>
    </li>
  );
}

function useBookings(loader: () => Promise<RealBooking[]>) {
  const [load, setLoad] = useState<Load<RealBooking[]>>({ state: "loading" });
  useEffect(() => {
    let cancelled = false;
    loader()
      .then((data) => !cancelled && setLoad({ state: "ready", data }))
      .catch((err) => !cancelled && setLoad({ state: "error", message: errText(err) }));
    return () => {
      cancelled = true;
    };
  }, [loader]);
  return load;
}

function BookingList({ load, empty }: { load: Load<RealBooking[]>; empty: React.ReactNode }) {
  const now = useNow();
  const nowMs = useNowMs();
  if (load.state === "loading") return <p className="text-sm text-ink-500">Cargando reservas…</p>;
  if (load.state === "error") return <ErrorBox>{load.message}</ErrorBox>;
  if (load.data.length === 0) return <EmptyState>{empty}</EmptyState>;
  const isPast = (b: RealBooking) => (now ? toMs(b.end) <= toMs(now) : false);
  const active = (b: RealBooking) => ["confirmada", "pendiente_pago"].includes(shownStatus(b, nowMs));
  // Al dueño no le sirven los intentos de reserva que nunca se pagaron.
  const visible = load.data.filter((b) => b.role === "driver" || b.status !== "pendiente_pago" || active(b));
  const upcoming = visible.filter((b) => !isPast(b) && active(b));
  const rest = visible.filter((b) => !upcoming.includes(b));
  return (
    <div className="flex flex-col gap-6">
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-900">Próximas</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((b) => (
              <BookingRow key={b.id} b={b} nowMs={nowMs} />
            ))}
          </ul>
        </section>
      )}
      {rest.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-900">Anteriores y canceladas</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rest.map((b) => (
              <BookingRow key={b.id} b={b} nowMs={nowMs} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** /mis-reservas/ con cuentas reales. */
export function MyRealBookingsPage() {
  return (
    <Container className="max-w-4xl pb-12">
      <PageHeader title="Mis reservas" subtitle="Tus reservas como conductor." />
      <RequireSignIn back="/mis-reservas/">{() => <DriverBookings />}</RequireSignIn>
    </Container>
  );
}

function DriverBookings() {
  const load = useBookings(listMyBookings);
  return (
    <BookingList
      load={load}
      empty={
        <>
          Todavía no reservaste.{" "}
          <Link href="/" className="font-semibold text-brand-700 hover:underline">
            Buscá un garaje
          </Link>
          .
        </>
      }
    />
  );
}

/** Sección de "Mis garajes": reservas que recibieron mis garajes. */
export function OwnerBookingsSection() {
  const load = useBookings(listOwnerBookings);
  return (
    <section className="mt-10 flex flex-col gap-3">
      <h2 className="text-xl font-bold tracking-tight text-ink-900">Reservas de tus garajes</h2>
      <BookingList load={load} empty="Todavía nadie reservó tus garajes." />
    </section>
  );
}

