import type { Metadata } from "next";
import { Container } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/badge";
import { PlusIcon } from "@/components/ui/icons";
import { OwnerBookingsBoard } from "@/components/owner/owner-bookings-board";
import { demoOwner, ownerBookings, ownerSpaces } from "@/components/owner/owner-data";
import { OwnerSpaceCard } from "@/components/owner/space-cards";
import { SectionTitle } from "@/components/owner/section";

export const metadata: Metadata = {
  title: "Panel del propietario",
  description: "Demo del panel para propietarios de cocheras en GuSpot.",
};

export default function OwnerDashboardPage() {
  const mySpaces = ownerSpaces();
  const spaceTitles = Object.fromEntries(mySpaces.map((s) => [s.id, s.title]));
  const publishedCount = mySpaces.filter((s) => s.status === "publicado").length;

  return (
    <Container className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Hola, {demoOwner.displayName}
            <DemoBadge label="Cuenta de ejemplo" />
          </h1>
          <p className="mt-1 text-ink-500">
            Revisá solicitudes, próximas reservas y tus espacios. Todo lo que ves acá son datos de ejemplo.
          </p>
        </div>
        <ButtonLink href="/propietarios/publicar/" size="lg" className="w-full sm:w-auto">
          <PlusIcon /> Publicar un espacio
        </ButtonLink>
      </div>

      <OwnerBookingsBoard
        initialBookings={ownerBookings()}
        spaceTitles={spaceTitles}
        publishedCount={publishedCount}
      />

      <section aria-labelledby="mis-espacios" className="flex flex-col gap-3">
        <SectionTitle id="mis-espacios" title="Mis espacios" count={mySpaces.length} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mySpaces.map((s) => (
            <li key={s.id} className="flex">
              <OwnerSpaceCard
                id={s.id}
                title={s.title}
                neighborhood={s.neighborhood}
                city={s.city}
                photo={s.photos[0]}
                status={s.status}
                hourlyPrice={s.hourlyPrice}
              />
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
