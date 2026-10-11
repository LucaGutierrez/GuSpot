"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Space } from "@/lib/types";
import { getPublishedGarage } from "@/lib/data/garages";
import { isBackendConfigured } from "@/lib/supabase/config";
import { describeAvailability } from "@/lib/availability";
import { FEATURE_LABEL, SPACE_TYPE_LABEL, VEHICLE_LABEL, formatARS } from "@/lib/format";
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
        <Loader key={id} id={id} />
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

function Loader({ id }: { id: string }) {
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
