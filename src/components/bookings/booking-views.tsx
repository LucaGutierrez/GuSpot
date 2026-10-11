"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { BookingAccess, RealBooking } from "@/lib/data/types";
import { DataError } from "@/lib/data/types";
import { cancelBooking, getBooking, getBookingAccess, listMyBookings, listOwnerBookings } from "@/lib/data/bookings";
import { VEHICLE_LABEL, formatARS, formatRange } from "@/lib/format";
import { toMs } from "@/lib/datetime";
import { useNow } from "@/components/driver/use-now";
import { Button } from "@/components/ui/button";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { ChevronLeftIcon, KeyIcon, PinIcon } from "@/components/ui/icons";
import { MapView } from "@/components/map/map-view";
import { EmptyState } from "@/components/owner/section";
import { ErrorBox, RequireSignIn, SuccessBox } from "@/components/my-garages/shared";
import { TEST_PAYMENT_NOTE } from "./real-booking-panel";

type Load<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: T };

const errText = (err: unknown) => (err instanceof DataError ? err.message : "No pudimos cargar los datos.");

function directionsUrl(p: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

// ---------------------------------------------------------------- /reserva/?id=

/** Detalle de una reserva real. Lee `?id=`: montarlo dentro de <Suspense>. */
export function BookingDetailPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const isNew = params.get("nueva") === "1";
  return (
    <Container className="max-w-3xl pt-4 pb-12">
      <Link href="/mis-reservas/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        <ChevronLeftIcon width={16} height={16} /> Mis reservas
      </Link>
      <div className="mt-4">
        <RequireSignIn back={`/reserva/?id=${id}`}>{() => <BookingLoader key={id} id={id} isNew={isNew} />}</RequireSignIn>
      </div>
    </Container>
  );
}

function BookingLoader({ id, isNew }: { id: string; isNew: boolean }) {
  const [load, setLoad] = useState<Load<{ booking: RealBooking | null; access: BookingAccess | null }>>({
    state: "loading",
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const booking = await getBooking(id);
      const access =
        booking && booking.role === "driver" && booking.status === "confirmada" ? await getBookingAccess(id) : null;
      return { booking, access };
    })()
      .then((data) => !cancelled && setLoad({ state: "ready", data }))
      .catch((err) => !cancelled && setLoad({ state: "error", message: errText(err) }));
    return () => {
      cancelled = true;
    };
  }, [id, tick]);

  if (load.state === "loading") return <p className="text-sm text-ink-500">Cargando reserva…</p>;
  if (load.state === "error") return <ErrorBox>{load.message}</ErrorBox>;
  if (!load.data.booking) return <ErrorBox>No encontramos esa reserva.</ErrorBox>;
  return (
    <BookingDetail
      booking={load.data.booking}
      access={load.data.access}
      isNew={isNew}
      onChanged={() => setTick((t) => t + 1)}
    />
  );
}

function BookingDetail({
  booking: b,
  access,
  isNew,
  onChanged,
}: {
  booking: RealBooking;
  access: BookingAccess | null;
  isNew: boolean;
  onChanged: () => void;
}) {
  const now = useNow();
  const started = now ? toMs(b.start) <= toMs(now) : false;
  const canCancel = b.role === "driver" && b.status === "confirmada" && !started;
  const marker = useMemo(
    () => (access ? [{ id: b.id, position: access.location, label: "Tu cochera", ariaLabel: "Ubicación del garage" }] : []),
    [access, b.id],
  );

  return (
    <div className="flex flex-col gap-4">
      {isNew && b.status === "confirmada" && (
        <SuccessBox>¡Listo! Tu reserva quedó confirmada. Abajo tenés la dirección y cómo entrar.</SuccessBox>
      )}

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={b.status} />
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
            <dt className="text-ink-500">Total</dt>
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
          {b.role === "owner" && (
            <div className="col-span-2">
              <dt className="text-ink-500">Conductor</dt>
              <dd className="font-medium text-ink-900">{b.driverName || "Sin nombre"}</dd>
            </div>
          )}
        </dl>
        <p className="text-xs text-ink-500">{TEST_PAYMENT_NOTE}</p>
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
          <a
            href={directionsUrl(access.location)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700"
          >
            Abrir en Google Maps ↗
          </a>
        </Card>
      )}

      {canCancel && <CancelBooking id={b.id} onDone={onChanged} />}
    </div>
  );
}

function CancelBooking({ id, onDone }: { id: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCancel() {
    setBusy(true);
    setError(null);
    try {
      await cancelBooking(id);
      onDone();
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      {confirming ? (
        <>
          <p className="text-sm text-ink-700">
            ¿Cancelar la reserva? El horario queda libre para otros conductores. En esta prueba no hay cargos.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Cancelando…" : "Sí, cancelar"}
            </button>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              Volver
            </Button>
          </div>
        </>
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            Cancelar reserva
          </Button>
        </div>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
    </Card>
  );
}

// ---------------------------------------------------------------- listas

function BookingRow({ b }: { b: RealBooking }) {
  return (
    <li>
      <Link
        href={`/reserva/?id=${b.id}`}
        className="flex flex-col gap-1 rounded-2xl border border-ink-200 bg-white p-4 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={b.status} />
          <span className="text-sm font-semibold text-ink-900">{formatARS(b.total)}</span>
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
  if (load.state === "loading") return <p className="text-sm text-ink-500">Cargando reservas…</p>;
  if (load.state === "error") return <ErrorBox>{load.message}</ErrorBox>;
  if (load.data.length === 0) return <EmptyState>{empty}</EmptyState>;
  const isPast = (b: RealBooking) => (now ? toMs(b.end) <= toMs(now) : false);
  const upcoming = load.data.filter((b) => !isPast(b) && b.status === "confirmada");
  const rest = load.data.filter((b) => !upcoming.includes(b));
  return (
    <div className="flex flex-col gap-6">
      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-900">Próximas</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </ul>
        </section>
      )}
      {rest.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink-900">Anteriores y canceladas</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rest.map((b) => (
              <BookingRow key={b.id} b={b} />
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
            Buscá un garage
          </Link>
          .
        </>
      }
    />
  );
}

/** Sección de "Mis garages": reservas que recibieron mis garages. */
export function OwnerBookingsSection() {
  const load = useBookings(listOwnerBookings);
  return (
    <section className="mt-10 flex flex-col gap-3">
      <h2 className="text-xl font-bold tracking-tight text-ink-900">Reservas de tus garages</h2>
      <BookingList load={load} empty="Todavía nadie reservó tus garages." />
    </section>
  );
}

