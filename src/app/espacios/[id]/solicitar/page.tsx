import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSpace, publishedSpaces } from "@/lib/demo-data";
import { SPACE_TYPE_LABEL } from "@/lib/format";
import { DemoBadge } from "@/components/ui/badge";
import { Container } from "@/components/ui/card";
import { PinIcon } from "@/components/ui/icons";
import { SpacePhoto } from "@/components/ui/space-photo";
import { RequestForm } from "@/components/driver/request-form";
import { rateSummary } from "@/components/driver/price-breakdown";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return publishedSpaces().map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const space = getSpace(id);
  return space ? { title: `Solicitar: ${space.title}` } : {};
}

export default async function SolicitarPage({ params }: Props) {
  const { id } = await params;
  const space = getSpace(id);
  if (!space || space.status !== "publicado") notFound();
  const photo = space.photos[0];

  return (
    <Container className="max-w-3xl py-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Solicitar reserva</h1>
        <DemoBadge />
      </div>
      <p className="mt-1 text-ink-500">
        Revisá el período y el precio. El propietario tiene que aceptar la solicitud.
      </p>

      <section
        aria-label="Espacio"
        className="mt-6 flex gap-4 rounded-2xl border border-ink-200 bg-white p-3 shadow-sm"
      >
        {photo && (
          <SpacePhoto
            variant={photo.variant}
            label={photo.caption}
            className="h-20 w-28 shrink-0 rounded-xl sm:h-24 sm:w-36"
          />
        )}
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-ink-900">{space.title}</p>
          <p className="mt-1 flex items-start gap-1 text-ink-500">
            <PinIcon width={16} height={16} className="mt-0.5 shrink-0" />
            {space.neighborhood}, {space.city} · {space.approxLocation}
          </p>
          <p className="mt-1 text-ink-500">
            {SPACE_TYPE_LABEL[space.type]} · {rateSummary(space)}
          </p>
        </div>
      </section>

      <div className="mt-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-ink-100" />}>
          <RequestForm space={space} />
        </Suspense>
      </div>
    </Container>
  );
}
