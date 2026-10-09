import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { describeAvailability } from "@/lib/availability";
import { FEATURE_LABEL, SPACE_TYPE_LABEL, VEHICLE_LABEL, formatARS } from "@/lib/format";
import { Card, Container } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { DemoNotice } from "@/components/ui/demo-notice";
import { ChevronLeftIcon, KeyIcon, ShieldIcon } from "@/components/ui/icons";
import { ArrivalCodeCheck } from "@/components/owner/arrival-code-check";
import { InfoList } from "@/components/owner/form-fields";
import { ListingStatusControl } from "@/components/owner/listing-status-control";
import { OwnerBookingCard } from "@/components/owner/owner-booking-card";
import { bookingsForSpace, getOwnerSpace, ownerSpaces } from "@/components/owner/owner-data";
import { EmptyState, SectionTitle } from "@/components/owner/section";
import { CoverPhoto } from "@/components/owner/space-cards";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return ownerSpaces().map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const space = getOwnerSpace(id);
  return { title: space ? `Gestionar: ${space.title}` : "Espacio no encontrado" };
}

export default async function ManageSpacePage({ params }: Props) {
  const { id } = await params;
  const space = getOwnerSpace(id);
  if (!space) notFound();

  const editHref = `/propietarios/publicar/?espacio=${space.id}`;
  const schedule = describeAvailability(space);
  const spaceBookings = bookingsForSpace(space.id);

  return (
    <Container className="flex flex-col gap-6 pb-12">
      <div className="pt-4">
        <Link
          href="/propietarios/"
          className="inline-flex items-center gap-1 rounded-lg py-1 text-sm font-medium text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <ChevronLeftIcon width={16} height={16} /> Volver al panel
        </Link>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <CoverPhoto
          photo={space.photos[0]}
          className="aspect-[16/9] w-full shrink-0 rounded-2xl md:w-80"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{space.title}</h1>
          <p className="text-ink-500">
            {space.neighborhood}, {space.city} · {space.approxLocation}
          </p>
          <p className="flex flex-wrap gap-1.5">
            <DemoBadge label="Espacio de ejemplo" />
            <Badge>{SPACE_TYPE_LABEL[space.type]}</Badge>
            <Badge>Hasta: {VEHICLE_LABEL[space.maxVehicle]}</Badge>
          </p>
        </div>
      </div>

      <Card className="p-4 sm:p-5">
        <h2 className="sr-only">Estado de la publicación</h2>
        <ListingStatusControl initialStatus={space.status} editHref={editHref} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-2 p-4 sm:p-5">
          <CardHeading title="Tarifas" editHref={editHref} />
          <InfoList
            items={[
              { label: "Precio por hora", value: formatARS(space.hourlyPrice) },
              {
                label: "Precio por día (24 h)",
                value: space.dailyPrice ? formatARS(space.dailyPrice) : "Sin tarifa diaria",
              },
              { label: "Mínimo de horas", value: `${space.minHours} h` },
            ]}
          />
          <p className="text-xs text-ink-500">Precios de ejemplo. Comisión de la plataforma: a definir.</p>
        </Card>

        <Card className="flex flex-col gap-2 p-4 sm:p-5">
          <CardHeading title="Horario disponible" editHref={editHref} />
          {schedule.length ? (
            <ul className="flex flex-col gap-1.5 text-sm text-ink-900">
              {schedule.map((line) => (
                <li key={line} className="rounded-lg bg-ink-50 px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">Sin horarios cargados.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-2 p-4 sm:p-5">
          <CardHeading title="Características" editHref={editHref} />
          {space.features.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {space.features.map((f) => (
                <li key={f}>
                  <Badge tone="brand">{FEATURE_LABEL[f]}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">Sin características cargadas.</p>
          )}
        </Card>

        <Card className="flex flex-col gap-2 p-4 sm:p-5">
          <CardHeading title="Condiciones de acceso" editHref={editHref} />
          {space.accessConditions.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-900">
              {space.accessConditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">Sin condiciones cargadas.</p>
          )}
        </Card>
      </div>

      <section aria-labelledby="reservas-espacio" className="flex flex-col gap-3">
        <SectionTitle id="reservas-espacio" title="Reservas de este espacio" count={spaceBookings.length} />
        <p className="text-sm text-ink-500">
          Para aceptar o rechazar solicitudes, usá el{" "}
          <Link href="/propietarios/" className="font-medium text-brand-700 underline">
            panel
          </Link>
          .
        </p>
        {spaceBookings.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {spaceBookings.map((b) => (
              <li key={b.id}>
                <OwnerBookingCard booking={b} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Este espacio todavía no tiene reservas.</EmptyState>
        )}
      </section>

      <section aria-labelledby="validar-codigo">
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          <h2 id="validar-codigo" className="flex items-center gap-2 text-lg font-semibold text-ink-900">
            <KeyIcon className="text-brand-600" /> Validar código de llegada
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-700">
            <li>
              El código solo es válido para una reserva <strong>confirmada</strong> de este espacio y dentro
              de su ventana horaria (propuesta: desde 2 h antes del inicio hasta el fin de la reserva).
            </li>
            <li className="flex items-start gap-2">
              <ShieldIcon className="mt-0.5 shrink-0 text-ink-400" width={18} height={18} />
              <span>
                No es la única medida de seguridad: verificá también que el vehículo coincida con la reserva.
                Otras medidas de verificación: a definir.
              </span>
            </li>
          </ul>
          <ArrivalCodeCheck />
        </Card>
      </section>

      <DemoNotice title="Datos de ejemplo">
        Este espacio, sus reservas y sus conductores son ficticios. Los cambios que hagas en esta pantalla no se
        guardan.
      </DemoNotice>
    </Container>
  );
}

function CardHeading({ title, editHref }: { title: string; editHref: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-ink-900">{title}</h2>
      <ButtonLink href={editHref} variant="ghost" className="h-8 px-2">
        Editar <span className="sr-only">{title.toLowerCase()}</span>
      </ButtonLink>
    </div>
  );
}
