"use client";

import { useState } from "react";
import type { Booking, BookingStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoNotice } from "@/components/ui/demo-notice";
import { OwnerBookingCard } from "./owner-booking-card";
import { EmptyState, SectionTitle } from "./section";

type Decision = { id: string; status: Extract<BookingStatus, "confirmada" | "rechazada"> };

/**
 * Resumen + solicitudes pendientes + próximas reservas del panel.
 * Aceptar / Rechazar solo cambian el estado en memoria del navegador:
 * no se guarda nada ni se notifica a nadie. El pago sigue "no disponible".
 */
export function OwnerBookingsBoard({
  initialBookings,
  spaceTitles,
  publishedCount,
}: {
  initialBookings: Booking[];
  spaceTitles: Record<string, string>;
  publishedCount: number;
}) {
  const [list, setList] = useState(initialBookings);
  const [lastDecision, setLastDecision] = useState<Decision | null>(null);

  function decide(id: string, status: Decision["status"]) {
    // Solo cambia el estado de la reserva; el estado del pago no se toca.
    setList((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    setLastDecision({ id, status });
  }

  const pending = list.filter((b) => b.status === "solicitada");
  const upcoming = list.filter((b) => b.status === "confirmada");
  const history = list.filter((b) => b.status !== "solicitada" && b.status !== "confirmada");

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="resumen">
        <h2 id="resumen" className="sr-only">
          Resumen
        </h2>
        <dl className="grid grid-cols-3 gap-2 sm:gap-4">
          <Stat label="Espacios publicados" value={publishedCount} />
          <Stat label="Solicitudes pendientes" value={pending.length} highlight={pending.length > 0} />
          <Stat label="Próximas confirmadas" value={upcoming.length} />
        </dl>
      </section>

      {/* Aviso de la última acción, anunciado por lectores de pantalla. */}
      <div role="status" aria-live="polite">
        {lastDecision && (
          <DemoNotice
            title={
              lastDecision.status === "confirmada"
                ? `Aceptaste la solicitud ${lastDecision.id}.`
                : `Rechazaste la solicitud ${lastDecision.id}.`
            }
          >
            Demo: no se notificó a nadie y el cambio se pierde al recargar la página.
            {lastDecision.status === "confirmada" &&
              " La reserva figura como Confirmada, pero el pago sigue como “Pagos aún no disponibles”: no se cobró nada."}
          </DemoNotice>
        )}
      </div>

      <section aria-labelledby="solicitudes" className="flex flex-col gap-3">
        <SectionTitle id="solicitudes" title="Solicitudes pendientes" count={pending.length} />
        {pending.length === 0 ? (
          <EmptyState>No tenés solicitudes pendientes.</EmptyState>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {pending.map((b) => (
              <li key={b.id}>
                <OwnerBookingCard booking={b} spaceTitle={spaceTitles[b.spaceId]}>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button className="sm:flex-1" onClick={() => decide(b.id, "confirmada")}>
                      Aceptar <span className="sr-only">solicitud {b.id}</span>
                    </Button>
                    <Button
                      variant="secondary"
                      className="sm:flex-1"
                      onClick={() => decide(b.id, "rechazada")}
                    >
                      Rechazar <span className="sr-only">solicitud {b.id}</span>
                    </Button>
                  </div>
                  <p className="text-xs text-ink-500">
                    Plazo para responder: a definir. En la demo, aceptar o rechazar no avisa al conductor.
                  </p>
                </OwnerBookingCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="proximas" className="flex flex-col gap-3">
        <SectionTitle id="proximas" title="Próximas reservas" count={upcoming.length} />
        {upcoming.length === 0 ? (
          <EmptyState>No tenés reservas confirmadas próximas.</EmptyState>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {upcoming.map((b) => (
              <li key={b.id}>
                <OwnerBookingCard booking={b} spaceTitle={spaceTitles[b.spaceId]}>
                  <p className="text-xs text-ink-500">
                    El conductor presentará un código de llegada que podés validar desde la página del
                    espacio (no disponible en la demo).
                  </p>
                </OwnerBookingCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section aria-labelledby="historial" className="flex flex-col gap-3">
          <SectionTitle id="historial" title="Historial" count={history.length} />
          <ul className="grid gap-3 lg:grid-cols-2">
            {history.map((b) => (
              <li key={b.id}>
                <OwnerBookingCard booking={b} spaceTitle={spaceTitles[b.spaceId]} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={`flex flex-col-reverse gap-1 p-3 sm:p-4 ${highlight ? "border-accent-400 bg-accent-100/40" : ""}`}>
      <dt className="text-xs leading-tight text-ink-500 sm:text-sm">{label}</dt>
      <dd className="text-2xl font-bold text-ink-900 sm:text-3xl">{value}</dd>
    </Card>
  );
}
