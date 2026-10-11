import Link from "next/link";
import type { SearchResult } from "@/lib/search";
import { FEATURE_LABEL, SPACE_TYPE_LABEL, formatARS } from "@/lib/format";
import { SpacePhoto } from "@/components/ui/space-photo";
import { CommercialCard } from "@/components/garage/garage-summary";
import { PinIcon } from "@/components/ui/icons";
import { AvailabilityBadge, bookability } from "./availability-status";
import { rateSummary } from "./price-breakdown";
import { Rating } from "./rating";

/**
 * Tarjeta de resultado de búsqueda. Toda la tarjeta es clickeable (enlace en el título).
 * Se acomoda al ancho del contenedor (`@container` en la lista), no al de la pantalla.
 */
export function SpaceCard({ result, href }: { result: SearchResult; href: string }) {
  if (result.space.commercial) return <CommercialCard result={result} href={href} />;
  const { space, quote } = result;
  const status = bookability(result.availability, quote);
  const photo = space.photos[0];
  const extra = space.features.length - 3;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-brand-500 hover:shadow-md @xl:flex-row">
      {photo ? (
        <SpacePhoto
          variant={photo.variant}
          label={photo.caption}
          url={photo.url}
          className="aspect-[16/10] w-full shrink-0 @xl:aspect-auto @xl:w-56"
        />
      ) : (
        <div className="aspect-[16/10] w-full shrink-0 bg-ink-100 @xl:aspect-auto @xl:w-56" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <AvailabilityBadge status={status} />
          {space.rating !== undefined && <Rating value={space.rating} />}
        </div>
        <h3 className="text-base leading-snug font-semibold text-ink-900">
          <Link
            href={href}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {space.title}
          </Link>
        </h3>
        <p className="flex items-start gap-1 text-sm text-ink-500">
          <PinIcon width={16} height={16} className="mt-0.5 shrink-0" />
          <span>
            {space.neighborhood}, {space.city} · {space.approxLocation}
          </span>
        </p>
        <p className="text-sm text-ink-700">{SPACE_TYPE_LABEL[space.type]}</p>
        {space.features.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Características">
            {space.features.slice(0, 3).map((f) => (
              <li key={f} className="rounded-md bg-ink-100 px-2 py-0.5 text-xs text-ink-700">
                {FEATURE_LABEL[f]}
              </li>
            ))}
            {extra > 0 && (
              <li className="rounded-md bg-ink-100 px-2 py-0.5 text-xs text-ink-700">
                +{extra} <span className="sr-only">características más</span>
              </li>
            )}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <div>
            {quote.ok ? (
              <>
                <p className="text-lg font-bold text-ink-900">{formatARS(quote.total)}</p>
                <p className="text-xs text-ink-500">Total estimado por {quote.hours} h</p>
              </>
            ) : (
              <p className="text-sm text-ink-500">Sin precio para ese período</p>
            )}
          </div>
          <p className="text-xs text-ink-500">{rateSummary(space)}</p>
        </div>
      </div>
    </article>
  );
}
