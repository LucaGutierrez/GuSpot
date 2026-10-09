"use client";

import { useSearchParams } from "next/navigation";
import { useId } from "react";
import type { Space } from "@/lib/types";
import { formatARS, formatRange } from "@/lib/format";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfoIcon } from "@/components/ui/icons";
import { AvailabilityBadge } from "./availability-status";
import { checkBooking } from "./booking-check";
import { PriceBreakdown, rateSummary } from "./price-breakdown";
import { rangeQuery, readRange } from "./range";
import { RangeFields } from "./range-fields";
import { useRange } from "./use-range";

export const PAYMENT_DISCLAIMER =
  "El propietario debe aceptar la solicitud. Los pagos todavía no están disponibles.";

/**
 * Panel de reserva del detalle. Toma el período de la query (o lo deja
 * elegir), muestra disponibilidad y precio, y lleva a la solicitud.
 * En celulares agrega una barra fija con el total, encima de la nav inferior.
 */
export function BookingPanel({ space }: { space: Space }) {
  const id = useId();
  const params = useSearchParams();
  const { value, setValue, now } = useRange(readRange(params));
  const check = checkBooking(space, value, now);
  const zona = params.get("zona") ?? "";
  const href = `/espacios/${space.id}/solicitar/${rangeQuery({ zona, ...value })}`;
  const statusId = `${id}-estado`;

  const cta = check.status.ok ? (
    <ButtonLink href={href} size="lg" className="w-full" aria-describedby={statusId}>
      Solicitar reserva
    </ButtonLink>
  ) : (
    <span
      role="link"
      aria-disabled="true"
      aria-describedby={statusId}
      className={buttonClass("primary", "lg", "w-full cursor-not-allowed opacity-50")}
    >
      Solicitar reserva
    </span>
  );

  return (
    <>
      <Card className="p-5">
        <h2 className="text-lg font-semibold text-ink-900">Reservá este espacio</h2>
        <p className="mt-0.5 text-sm text-ink-500">{rateSummary(space)}</p>

        <div className="mt-4">
          <RangeFields value={value} onChange={setValue} idPrefix={id} />
        </div>

        <div id={statusId} className="mt-4 space-y-3" aria-live="polite">
          <AvailabilityBadge status={check.status} />
          {!check.status.ok && check.status.detail && (
            <p className="text-sm text-ink-500">{check.status.detail}</p>
          )}
          {check.interval && check.quote.ok && (
            <>
              <p className="text-sm text-ink-700">
                {formatRange(check.interval.start, check.interval.end)}
              </p>
              <PriceBreakdown space={space} quote={check.quote} />
            </>
          )}
        </div>

        <div className="mt-5 hidden md:block">{cta}</div>
        <p className="mt-3 flex gap-2 text-xs text-ink-500">
          <InfoIcon width={16} height={16} className="shrink-0" />
          {PAYMENT_DISCLAIMER}
        </p>
      </Card>

      {/* Barra fija para celulares, encima de la navegación inferior (--mobile-nav-height). */}
      <div className="fixed inset-x-0 bottom-[var(--mobile-nav-height)] z-20 border-t border-ink-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {check.status.ok && check.quote.ok ? (
              <>
                <p className="font-bold text-ink-900">{formatARS(check.quote.total)}</p>
                <p className="truncate text-xs text-ink-500">
                  Total estimado · {check.quote.hours} h
                </p>
              </>
            ) : (
              <p className="line-clamp-2 text-xs text-ink-700">{check.status.label}</p>
            )}
          </div>
          <div className="w-44 shrink-0">{cta}</div>
        </div>
      </div>
    </>
  );
}
