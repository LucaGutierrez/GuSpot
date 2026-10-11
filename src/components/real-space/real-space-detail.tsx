"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Space } from "@/lib/types";
import { getPublishedGarage } from "@/lib/data/garages";
import { isBackendConfigured } from "@/lib/supabase/config";
import { describeAvailability } from "@/lib/availability";
import { ACCESS_TYPE_LABEL, FEATURE_LABEL, PAYMENT_METHOD_LABEL, SPACE_TYPE_LABEL, VEHICLE_LABEL, formatARS } from "@/lib/format";
import { liveStatus } from "@/lib/live";
import { useNow } from "@/components/driver/use-now";
import { LiveBadge, UpdatedNote } from "@/components/garage/live-badge";
import { ArrivalPanel } from "@/components/arrivals/arrival-views";
import { Card, Container } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/demo-notice";
import { CarIcon, CheckIcon, ChevronLeftIcon, ClockIcon, ParkingIcon, PinIcon } from "@/components/ui/icons";
import { MapView } from "@/components/map/map-view";
import { PhotoGallery } from "@/components/driver/photo-gallery";
import { RealBookingPanel } from "@/components/bookings/real-booking-panel";

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; space: Space | null };

/** Detalle de un garage real publicado (`/espacio/?id=`). Usa useSearchParams: montarlo dentro de <Suspense>. */
export function RealSpaceDetail() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const voy = params.get("voy") === "1";
  const back = useMemo(() => {
    const qs = new URLSearchParams(params.toString());
    qs.delete("id");
    const s = qs.toString();
    return `/${s ? `?${s}` : ""}`;
  }, [params]);

  return (
    <Container className="pt-4 pb-28 md:pb-12">
      <Link
        href={back}
        className="inline-flex items-center gap-1 rounded text-sm font-medium text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <ChevronLeftIcon width={16} height={16} /> Volver a la búsqueda
      </Link>
      {isBackendConfigured ? (
        <Loader key={id} id={id} voy={voy} />
      ) : (
        <div className="mt-6">
          <DemoNotice title="Esta versión es solo una demostración">
            Todavía no hay garages reales. Podés ver los de ejemplo en la búsqueda.
          </DemoNotice>
        </div>
      )}
    </Container>
  );
}

function Loader({ id, voy }: { id: string; voy: boolean }) {
  const [load, setLoad] = useState<Load>(id ? { state: "loading" } : { state: "ready", space: null });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPublishedGarage(id)
      .then((space) => !cancelled && setLoad({ state: "ready", space }))
      .catch(() => !cancelled && setLoad({ state: "error" }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (load.state === "loading") return <p className="mt-6 text-sm text-ink-500">Cargando garage…</p>;
  if (load.state === "error")
    return (
      <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        No pudimos cargar el garage. Revisá tu conexión y probá de nuevo.
      </p>
    );
  if (!load.space)
    return (
      <Card className="mt-6 space-y-3 p-6">
        <p className="font-semibold text-ink-900">Este garage no existe o ya no está publicado.</p>
        <ButtonLink href="/" variant="secondary" className="w-fit">
          Ir a la búsqueda
        </ButtonLink>
      </Card>
    );
  if (load.space.commercial) return <CommercialDetail space={load.space} voy={voy} />;
  return <Detail space={load.space} />;
}

function Detail({ space }: { space: Space }) {
  const marker = useMemo(
    () => [
      {
        id: space.id,
        position: space.coords,
        label: formatARS(space.hourlyPrice),
        ariaLabel: `${space.title}: ubicación`,
      },
    ],
    [space],
  );

  return (
    <div className="mt-4 grid gap-8 md:grid-cols-[1fr_22rem] lg:grid-cols-[1fr_24rem]">
      <div className="min-w-0 space-y-8">
        <PhotoGallery photos={space.photos} title={space.title} />

        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{space.title}</h1>
          <p className="flex items-start gap-1.5 text-ink-700">
            <PinIcon className="mt-0.5 shrink-0 text-brand-600" />
            <span>
              {[space.neighborhood, space.city].filter(Boolean).join(", ")}
              {space.approxLocation && ` · ${space.approxLocation}`}
            </span>
          </p>
          <p className="text-sm text-ink-500">
            La dirección y las indicaciones para entrar se comparten cuando la reserva esté
            confirmada.
          </p>
        </header>

        {space.description && <p className="whitespace-pre-line text-ink-700">{space.description}</p>}

        <section aria-labelledby="datos" className="grid gap-4 sm:grid-cols-2">
          <h2 id="datos" className="sr-only">
            Datos del garage
          </h2>
          <Fact icon={<ParkingIcon />} label="Tipo" value={SPACE_TYPE_LABEL[space.type]} />
          <Fact icon={<CarIcon />} label="Vehículo máximo" value={VEHICLE_LABEL[space.maxVehicle]} />
          <Fact
            icon={<ClockIcon />}
            label="Horario"
            value={
              <ul>
                {describeAvailability(space).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            }
          />
          <Fact
            icon={<span className="font-bold">$</span>}
            label="Tarifas"
            value={
              <ul>
                <li>{formatARS(space.hourlyPrice)} por hora</li>
                {space.dailyPrice && <li>{formatARS(space.dailyPrice)} por día (24 h)</li>}
                <li>
                  Mínimo {space.minHours} {space.minHours === 1 ? "hora" : "horas"}
                </li>
              </ul>
            }
          />
        </section>

        {space.features.length > 0 && (
          <section aria-labelledby="caracteristicas">
            <h2 id="caracteristicas" className="text-lg font-semibold text-ink-900">
              Características
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {space.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-ink-700">
                  <CheckIcon className="text-brand-600" /> {FEATURE_LABEL[f]}
                </li>
              ))}
            </ul>
          </section>
        )}

        {space.accessConditions.length > 0 && (
          <section aria-labelledby="acceso">
            <h2 id="acceso" className="text-lg font-semibold text-ink-900">
              Condiciones de acceso
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-700">
              {space.accessConditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="mapa">
          <h2 id="mapa" className="text-lg font-semibold text-ink-900">
            Ubicación
          </h2>
          <div className="relative mt-3 h-64 overflow-hidden rounded-2xl border border-ink-200">
            <MapView
              className="absolute inset-0 h-full w-full"
              markers={marker}
              selectedId={null}
              onSelect={() => {}}
              fitKey={space.id}
              fallbackCenter={space.coords}
              userLocation={null}
            />
          </div>
        </section>
      </div>

      <aside aria-label="Reserva" className="md:sticky md:top-20 md:self-start">
        <RealBookingPanel space={space} />
      </aside>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-ink-200 bg-white p-4">
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"
      >
        {icon}
      </span>
      <div className="text-sm">
        <p className="font-semibold text-ink-900">{label}</p>
        <div className="mt-0.5 text-ink-700">{value}</div>
      </div>
    </div>
  );
}

function CommercialDetail({ space, voy }: { space: Space; voy: boolean }) {
  const now = useNow();
  const live = liveStatus(space, now);
  const c = space.commercial!;
  const tone = live?.tone;
  const marker = useMemo(
    () => [
      {
        id: space.id,
        position: space.coords,
        label: `${space.title} · ${formatARS(space.hourlyPrice)}/h`,
        ariaLabel: `${space.title}: ubicación`,
        variant: "garage" as const,
        tone,
      },
    ],
    [space, tone],
  );
  if (!live) return null;
  const spaceKind = space.type === "cubierta" ? "Cubierto" : space.type === "semicubierta" ? "Semicubierto" : "Descubierto";

  return (
    <div className="mt-4 grid gap-6 md:grid-cols-[1fr_22rem] md:gap-x-8 lg:grid-cols-[1fr_24rem]">
      <header className="space-y-2 md:col-span-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{space.title}</h1>
        <p className="flex items-start gap-1.5 text-ink-700">
          <PinIcon className="mt-0.5 shrink-0 text-brand-600" />
          <span>
            {space.neighborhood}
            {space.approxLocation && ` · ${space.approxLocation}`}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <LiveBadge status={live} />
          <span className={`text-sm font-semibold ${live.open ? "text-emerald-700" : "text-ink-700"}`}>
            {live.open ? "Abierto ahora" : "Cerrado ahora"}
          </span>
          {c.capacity && <span className="text-sm text-ink-500">· Capacidad {c.capacity} lugares</span>}
        </div>
        <UpdatedNote status={live} phone={c.contactPhone} />
      </header>
      <aside aria-label="Ir al garage" className="flex flex-col gap-4 md:sticky md:top-20 md:col-start-2 md:row-start-2 md:self-start">
        <ArrivalPanel space={space} autoOpen={voy} />
        {c.contactPhone && (
          <a href={`tel:${c.contactPhone}`} className="text-center text-sm font-semibold text-brand-700 hover:underline">
            Llamar al garage
          </a>
        )}
        {c.reservableSpots > 0 && c.onlinePayments && (
          <details className="rounded-2xl">
            <summary className="cursor-pointer rounded-2xl border border-ink-200 bg-white p-4 text-sm font-semibold text-ink-900">
              Reservar y pagar un lugar (ahora o para más tarde)
            </summary>
            <div className="mt-3">
              <RealBookingPanel space={space} />
            </div>
          </details>
        )}
      </aside>
      <div className="min-w-0 space-y-6 md:col-start-1 md:row-start-2">
        {space.photos.length > 0 && <PhotoGallery photos={space.photos} title={space.title} />}

        {space.description && <p className="whitespace-pre-line text-ink-700">{space.description}</p>}

        <section aria-labelledby="datos" className="grid gap-4 sm:grid-cols-2">
          <h2 id="datos" className="sr-only">
            Datos del garage
          </h2>
          <Fact
            icon={<span className="font-bold">$</span>}
            label="Tarifas"
            value={
              <ul>
                <li>{formatARS(space.hourlyPrice)} por hora</li>
                {space.dailyPrice && <li>{formatARS(space.dailyPrice)} por día (24 h)</li>}
                {space.minHours > 1 && <li>Mínimo {space.minHours} horas</li>}
              </ul>
            }
          />
          <Fact
            icon={<ClockIcon />}
            label="Horario"
            value={
              <ul>
                {describeAvailability(space).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            }
          />
          <Fact
            icon={<CarIcon />}
            label="Vehículos y acceso"
            value={
              <ul>
                <li>Hasta {VEHICLE_LABEL[space.maxVehicle].toLowerCase()}</li>
                {c.maxHeightCm && <li>Altura máxima {(c.maxHeightCm / 100).toFixed(2).replace(".", ",")} m</li>}
                {c.accessType && <li>Acceso: {ACCESS_TYPE_LABEL[c.accessType].toLowerCase()}</li>}
                <li>{spaceKind}</li>
              </ul>
            }
          />
          <Fact
            icon={<ParkingIcon />}
            label="Pago"
            value={
              <ul>
                {c.onlinePayments && c.reservableSpots > 0 && <li>Reservas: se pagan acá, con Mercado Pago</li>}
                <li>{c.payAtGarage ? "Sin reserva: se paga en el garage" : "Sin reserva: pago a convenir con el garage"}</li>
                {c.paymentMethods.length > 0 && <li>{c.paymentMethods.map((m) => PAYMENT_METHOD_LABEL[m]).join(", ")}</li>}
              </ul>
            }
          />
        </section>

        {space.features.length > 0 && (
          <section aria-labelledby="servicios">
            <h2 id="servicios" className="text-lg font-semibold text-ink-900">
              Servicios
            </h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {space.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-ink-700">
                  <CheckIcon className="text-brand-600" /> {FEATURE_LABEL[f]}
                </li>
              ))}
            </ul>
          </section>
        )}

        {space.accessConditions.length > 0 && (
          <section aria-labelledby="condiciones">
            <h2 id="condiciones" className="text-lg font-semibold text-ink-900">
              Condiciones
            </h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-700">
              {space.accessConditions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="mapa">
          <h2 id="mapa" className="text-lg font-semibold text-ink-900">
            Ubicación
          </h2>
          <div className="relative mt-3 h-64 overflow-hidden rounded-2xl border border-ink-200">
            <MapView
              className="absolute inset-0 h-full w-full"
              markers={marker}
              selectedId={null}
              onSelect={() => {}}
              fitKey={space.id}
              fallbackCenter={space.coords}
              userLocation={null}
            />
          </div>
          <p className="mt-2 text-xs text-ink-500">
            La dirección y las indicaciones de entrada se muestran al avisar que vas o al reservar.
          </p>
        </section>
      </div>

    </div>
  );
}
