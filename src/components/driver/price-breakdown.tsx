import type { Space } from "@/lib/types";
import type { Quote } from "@/lib/pricing";
import { formatARS } from "@/lib/format";

type OkQuote = Extract<Quote, { ok: true }>;

/** "$ 3.000 / h · $ 20.000 / día" */
export function rateSummary(space: Pick<Space, "hourlyPrice" | "dailyPrice">): string {
  const hourly = `${formatARS(space.hourlyPrice)} / h`;
  return space.dailyPrice ? `${hourly} · ${formatARS(space.dailyPrice)} / día` : hourly;
}

/**
 * Desglose del precio estimado. Replica la regla de `quote()` para mostrarla
 * (bloques de 24 h a tarifa diaria + horas restantes con tope diario).
 */
export function PriceBreakdown({
  space,
  quote,
  totalLabel = "Total estimado",
}: {
  space: Pick<Space, "hourlyPrice" | "dailyPrice">;
  quote: OkQuote;
  /** Texto de la última fila (p. ej. "Tarifa del garaje" si después se suma un cargo). */
  totalLabel?: string;
}) {
  const daily = space.dailyPrice ?? space.hourlyPrice * 24;
  const remainder = quote.remainingHours * space.hourlyPrice;
  const capped = !!space.dailyPrice && remainder > space.dailyPrice;
  const remainderCharged = capped ? space.dailyPrice! : remainder;

  return (
    <dl className="space-y-1.5 text-sm">
      {quote.days > 0 && (
        <div className="flex justify-between gap-3">
          <dt className="text-ink-500">
            {quote.days} {quote.days === 1 ? "día" : "días"} × {formatARS(daily)}
          </dt>
          <dd className="text-ink-900">{formatARS(quote.days * daily)}</dd>
        </div>
      )}
      {quote.remainingHours > 0 && (
        <div className="flex justify-between gap-3">
          <dt className="text-ink-500">
            {quote.remainingHours} h × {formatARS(space.hourlyPrice)}
            {capped && <span className="block text-xs">Con tope de tarifa diaria</span>}
          </dt>
          <dd className="text-ink-900">{formatARS(remainderCharged)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3 border-t border-ink-200 pt-2 font-semibold">
        <dt className="text-ink-900">
          {totalLabel} ({quote.hours} h)
        </dt>
        <dd className="text-ink-900">{formatARS(quote.total)}</dd>
      </div>
    </dl>
  );
}
