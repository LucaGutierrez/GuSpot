"use client";

import Link from "next/link";
import { useRef, type KeyboardEvent, type Ref, type TouchEvent } from "react";
import type { SearchResult } from "@/lib/search";
import { SPACE_TYPE_LABEL, formatARS } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, PinIcon } from "@/components/ui/icons";
import { SpacePhoto } from "@/components/ui/space-photo";
import { AvailabilityBadge, bookability } from "@/components/driver/availability-status";
import { rateSummary } from "@/components/driver/price-breakdown";
import { CloseIcon } from "./icons";

/**
 * Tarjeta inferior del garage elegido en el mapa. Se puede deslizar (o usar las
 * flechas) para pasar al anterior / siguiente.
 */
export function SelectedCard({
  result,
  href,
  distance,
  position,
  onPrev,
  onNext,
  onClose,
  ref,
}: {
  ref?: Ref<HTMLDivElement>;
  result: SearchResult;
  href: string;
  /** "≈ 450 m de vos" o null si no hay ubicación del conductor. */
  distance: string | null;
  position: { index: number; total: number };
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const { space, quote } = result;
  const status = bookability(result.availability, quote);
  const photo = space.photos[0];
  const touchX = useRef<number | null>(null);
  const multiple = position.total > 1;

  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    const end = e.changedTouches[0]?.clientX;
    if (start === null || end === undefined || !multiple) return;
    const dx = end - start;
    if (dx < -50) onNext();
    else if (dx > 50) onPrev();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label={`Garage seleccionado: ${space.title}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
      className="rounded-2xl border border-ink-200 bg-white p-3 shadow-lg focus:outline-none"
    >
      <div className="flex gap-3">
        {photo ? (
          <SpacePhoto
            variant={photo.variant}
            label="Ilustración"
            className="h-24 w-24 shrink-0 rounded-xl"
          />
        ) : (
          <div className="h-24 w-24 shrink-0 rounded-xl bg-ink-100" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <AvailabilityBadge status={status} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar tarjeta"
              className="-mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <CloseIcon width={18} height={18} />
            </button>
          </div>
          <h2 className="mt-1 line-clamp-2 text-sm leading-snug font-semibold text-ink-900">
            {space.title}
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">{SPACE_TYPE_LABEL[space.type]}</p>
        </div>
      </div>

      <p className="mt-2 flex items-start gap-1 text-xs text-ink-500">
        <PinIcon width={14} height={14} className="mt-0.5 shrink-0" />
        <span>
          {space.neighborhood}, {space.city} · {space.approxLocation}
          {distance && <strong className="font-semibold text-ink-700"> · {distance}</strong>}
        </span>
      </p>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {quote.ok ? (
            <>
              <p className="text-lg leading-tight font-bold text-ink-900">{formatARS(quote.total)}</p>
              <p className="text-xs text-ink-500">
                Total estimado por {quote.hours} h · {rateSummary(space)}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-500">Sin precio para ese período</p>
          )}
        </div>
        <Link href={href} className={buttonClass("primary", "md", "shrink-0")}>
          Ver detalle
        </Link>
      </div>

      {multiple && (
        <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Garage anterior"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-700 hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            <ChevronLeftIcon />
          </button>
          <p className="text-xs text-ink-500" aria-live="polite">
            {position.index + 1} de {position.total} · deslizá para ver otro
          </p>
          <button
            type="button"
            onClick={onNext}
            aria-label="Garage siguiente"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-700 hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  );
}
