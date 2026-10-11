"use client";

import { LIVE_DOT_CLASS, LIVE_TONE_CLASS, agoText, type LiveStatus } from "@/lib/live";

/** Disponibilidad con color + texto (nunca solo color). */
export function LiveBadge({ status, size = "md" }: { status: LiveStatus; size?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${LIVE_TONE_CLASS[status.tone]} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${LIVE_DOT_CLASS[status.tone]}`} />
      {status.label}
    </span>
  );
}

/** "Actualizado hace 12 min" y, si es viejo, la recomendación de llamar. */
export function UpdatedNote({ status, phone }: { status: LiveStatus; phone?: string }) {
  if (status.tone === "closed" && !status.open) return null;
  if (status.minutesAgo === null) {
    return <p className="text-xs text-ink-500">El garaje todavía no actualizó su disponibilidad.</p>;
  }
  return (
    <p className={`text-xs ${status.stale ? "font-medium text-amber-900" : "text-ink-500"}`}>
      Actualizado {agoText(status.minutesAgo)}
      {status.stale && (
        <>
          {" · "}puede haber cambiado
          {phone ? (
            <>
              {", "}
              <a href={`tel:${phone}`} className="underline">
                conviene llamar
              </a>
            </>
          ) : null}
          .
        </>
      )}
    </p>
  );
}
