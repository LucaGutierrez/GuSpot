"use client";

import type { Booking } from "@/lib/types";
import { bookings, getSpace, DEMO_DRIVER_NAME } from "@/lib/demo-data";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookingItem } from "./booking-item";
import { useNow } from "./use-now";

const ACTIVE = new Set<Booking["status"]>(["solicitada", "confirmada"]);

/**
 * Reservas del conductor demo separadas en Próximas y Pasadas. La división
 * usa la hora actual del navegador (no la del build).
 */
export function MyBookings() {
  const now = useNow();
  const mine = bookings.filter((b) => b.driverName === DEMO_DRIVER_NAME);
  const isUpcoming = (b: Booking) => ACTIVE.has(b.status) && (!now || b.end > now);
  const upcoming = mine.filter(isUpcoming).sort((a, b) => a.start.localeCompare(b.start));
  const past = mine.filter((b) => !isUpcoming(b)).sort((a, b) => b.start.localeCompare(a.start));

  return (
    <div className="space-y-10">
      <Section id="proximas" title="Próximas" items={upcoming} empty="No tenés reservas próximas." />
      <Section id="pasadas" title="Pasadas" items={past} empty="Todavía no tenés reservas pasadas." />
    </div>
  );
}

function Section({
  id,
  title,
  items,
  empty,
}: {
  id: string;
  title: string;
  items: Booking[];
  empty: string;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold text-ink-900">
        {title} <span className="font-normal text-ink-500">({items.length})</span>
      </h2>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-4">
          {items.map((b) => (
            <li key={b.id}>
              <BookingItem booking={b} space={getSpace(b.spaceId)} />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="mt-3 flex flex-col items-start gap-3 p-5 text-sm text-ink-500">
          {empty}
          <ButtonLink href="/" variant="secondary">
            Buscar cocheras
          </ButtonLink>
        </Card>
      )}
    </section>
  );
}
