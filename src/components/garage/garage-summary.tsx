"use client";

import Link from "next/link";
import type { Ref } from "react";
import type { SearchResult } from "@/lib/search";
import { FEATURE_LABEL, formatARS } from "@/lib/format";
import { liveStatus, type LiveStatus } from "@/lib/live";
import { buttonClass } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon, PinIcon } from "@/components/ui/icons";
import { SpacePhoto } from "@/components/ui/space-photo";
import { useNow } from "@/components/driver/use-now";
import { CloseIcon } from "@/components/explore/icons";
import { LiveBadge, UpdatedNote } from "./live-badge";
import { GoButton } from "./navigate-buttons";

/** Enlace a la ficha con el aviso "Voy a este" abierto. */
const voyHref = (href: string) => `${href}${href.includes("?") ? "&" : "?"}voy=1`;

/** Zona, disponibilidad, capacidad, precio y servicios de un garaje comercial. */
function GarageFacts({ result, live, distance }: { result: SearchResult; live: LiveStatus; distance?: string | null }) {
  const { space } = result;
  const c = space.commercial!;
  const services = space.features.slice(0, 3);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-start gap-1 text-xs text-ink-500">
        <PinIcon width={14} height={14} className="mt-0.5 shrink-0" />
        <span>
          {space.neighborhood}
          {live.open ? <span className="font-semibold text-emerald-700"> · Abierto ahora</span> : <span className="font-semibold text-ink-700"> · Cerrado</span>}
          {distance && <strong className="font-semibold text-ink-700"> · {distance}</strong>}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <LiveBadge status={live} size="sm" />
        {c.capacity && <span className="text-xs text-ink-500">Capacidad {c.capacity}</span>}
      </div>
      <p className="text-sm text-ink-900">
        <span className="text-lg font-bold">{formatARS(space.hourlyPrice)}</span>
        <span className="text-ink-500"> / hora</span>
      </p>
      {services.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {services.map((f) => (
            <li key={f} className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-700">
              {FEATURE_LABEL[f]}
            </li>
          ))}
        </ul>
      )}
      <UpdatedNote status={live} phone={c.contactPhone} />
    </div>
  );
}

/** Tarjeta de garaje comercial para listas (escritorio y lista del celular). */
export function CommercialCard({ result, href, distance }: { result: SearchResult; href: string; distance?: string | null }) {
  const now = useNow();
  const live = liveStatus(result.space, now);
  if (!live) return null;
  const photo = result.space.photos[0];
  return (
    <article className="flex gap-3 rounded-2xl border border-ink-200 bg-white p-3 shadow-sm">
      {photo ? (
        <SpacePhoto variant={photo.variant} url={photo.url} label={photo.caption} className="h-24 w-24 shrink-0 rounded-xl" />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-base leading-snug font-semibold text-ink-900">
          <Link href={href} className="hover:underline">
            {result.space.title}
          </Link>
        </h3>
        <GarageFacts result={result} live={live} distance={distance} />
        <div className="flex flex-wrap gap-2">
          <GoButton to={result.space.coords} size="md" className="px-6" />
          {live.accepting && (
            <Link href={voyHref(href)} className={buttonClass("secondary", "md")}>
              Voy a este
            </Link>
          )}
          <Link href={href} className={buttonClass("secondary", "md")}>
            Ver ficha
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Ficha inferior del mapa (celular) para un garaje comercial. */
export function CommercialSelectedCard({
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
  distance: string | null;
  position: { index: number; total: number };
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const now = useNow();
  const live = liveStatus(result.space, now);
  if (!live) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label={`Garaje seleccionado: ${result.space.title}`}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="rounded-2xl border border-ink-200 bg-white p-3 shadow-lg focus:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base leading-snug font-semibold text-ink-900">{result.space.title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ficha"
          className="-mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <CloseIcon width={18} height={18} />
        </button>
      </div>
      <div className="mt-1">
        <GarageFacts result={result} live={live} distance={distance} />
      </div>
      {/* Para quien maneja: "Ir" es un toque y abre su app de mapas. */}
      <GoButton to={result.space.coords} className="mt-3 w-full" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {live.accepting ? (
          <Link href={voyHref(href)} className={buttonClass("secondary", "md")}>
            Voy a este
          </Link>
        ) : (
          <span className={buttonClass("secondary", "md", "cursor-not-allowed opacity-50")} aria-disabled="true">
            Voy a este
          </span>
        )}
        <Link href={href} className={buttonClass("secondary", "md")}>
          Ver ficha
        </Link>
      </div>
      {position.total > 1 && (
        <div className="mt-2 flex items-center justify-between border-t border-ink-100 pt-2">
          <button type="button" onClick={onPrev} aria-label="Garaje anterior" className="grid h-9 w-9 place-items-center rounded-full text-ink-700 hover:bg-ink-100">
            <ChevronLeftIcon />
          </button>
          <p className="text-xs text-ink-500" aria-live="polite">
            {position.index + 1} de {position.total}
          </p>
          <button type="button" onClick={onNext} aria-label="Garaje siguiente" className="grid h-9 w-9 place-items-center rounded-full text-ink-700 hover:bg-ink-100">
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  );
}
