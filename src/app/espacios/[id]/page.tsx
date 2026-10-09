import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSpace, owners, publishedSpaces } from "@/lib/demo-data";
import { describeAvailability } from "@/lib/availability";
import { FEATURE_LABEL, SPACE_TYPE_LABEL, VEHICLE_LABEL, formatARS } from "@/lib/format";
import { DemoBadge } from "@/components/ui/badge";
import { Card, Container } from "@/components/ui/card";
import { CarIcon, CheckIcon, ChevronLeftIcon, ClockIcon, ParkingIcon, PinIcon } from "@/components/ui/icons";
import { BookingPanel } from "@/components/driver/booking-panel";
import { PhotoGallery } from "@/components/driver/photo-gallery";
import { Rating } from "@/components/driver/rating";
import { BackToResults } from "@/components/driver/back-to-results";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return publishedSpaces().map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const space = getSpace(id);
  if (!space) return {};
  return {
    title: space.title,
    description: `${SPACE_TYPE_LABEL[space.type]} en ${space.neighborhood}, ${space.city}. Desde ${formatARS(space.hourlyPrice)} por hora (datos de demostración).`,
  };
}

export default async function SpacePage({ params }: Props) {
  const { id } = await params;
  const space = getSpace(id);
  if (!space || space.status !== "publicado") notFound();
  const owner = owners.find((o) => o.id === space.ownerId);

  return (
    <Container className="pt-4 pb-28 md:pb-12">
      <Suspense
        fallback={
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
            <ChevronLeftIcon width={16} height={16} /> Volver a la búsqueda
          </Link>
        }
      >
        <BackToResults />
      </Suspense>

      <div className="mt-4 grid gap-8 md:grid-cols-[1fr_22rem] lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-8">
          <PhotoGallery photos={space.photos} title={space.title} />

          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <DemoBadge label="Espacio de ejemplo" />
              {space.rating !== undefined && <Rating value={space.rating} />}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{space.title}</h1>
            <p className="flex items-start gap-1.5 text-ink-700">
              <PinIcon className="mt-0.5 shrink-0 text-brand-600" />
              <span>
                {space.neighborhood}, {space.city} · {space.approxLocation}
              </span>
            </p>
            <p className="text-sm text-ink-500">
              Ubicación aproximada (±200 m). La dirección exacta se comparte cuando la reserva esté
              confirmada y pagada.
            </p>
          </header>

          <p className="text-ink-700">{space.description}</p>

          <section aria-labelledby="datos" className="grid gap-4 sm:grid-cols-2">
            <h2 id="datos" className="sr-only">
              Datos del espacio
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

          {owner && (
            <section aria-labelledby="propietario">
              <h2 id="propietario" className="text-lg font-semibold text-ink-900">
                Propietario
              </h2>
              <Card className="mt-3 flex items-center gap-3 p-4">
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 font-bold text-brand-700"
                >
                  {owner.displayName.charAt(0)}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-ink-900">{owner.displayName}</p>
                  <p className="text-sm text-ink-500">En GuSpot desde {owner.memberSince}</p>
                </div>
                <DemoBadge label="Perfil de ejemplo" />
              </Card>
              <p className="mt-2 text-xs text-ink-500">
                Verificación de propietarios: a definir. Los mensajes todavía no están disponibles.
              </p>
            </section>
          )}
        </div>

        <aside aria-label="Reserva" className="md:sticky md:top-20 md:self-start">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-ink-100" />}>
            <BookingPanel space={space} />
          </Suspense>
        </aside>
      </div>
    </Container>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
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
