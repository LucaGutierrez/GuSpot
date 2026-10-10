import type { DemoPhoto } from "@/lib/types";
import { SpacePhoto } from "@/components/ui/space-photo";

/**
 * Galería de ilustraciones de muestra. Con varias fotos usa un carrusel
 * simple con scroll-snap (deslizable en el celular, con scroll en escritorio).
 */
export function PhotoGallery({ photos, title }: { photos: DemoPhoto[]; title: string }) {
  // Garages reales: fotos subidas por el propietario (con `url`).
  const real = photos.some((p) => p.url);
  const noun = real ? "fotos" : "ilustraciones";
  if (photos.length === 0) {
    return (
      <div className="grid aspect-[16/9] place-items-center rounded-2xl bg-ink-100 text-sm text-ink-500">
        Sin fotos
      </div>
    );
  }
  if (photos.length === 1) {
    return (
      <SpacePhoto
        variant={photos[0].variant}
        url={photos[0].url}
        label={photos[0].caption}
        className="aspect-[16/9] rounded-2xl"
      />
    );
  }
  return (
    <div>
      <ul
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-2xl pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        aria-label={`${real ? "Fotos" : "Ilustraciones de muestra"} de ${title} (${photos.length}). Deslizá para ver más.`}
        tabIndex={0}
      >
        {photos.map((p, i) => (
          <li
            key={`${p.variant}-${i}`}
            className="w-[88%] shrink-0 snap-center sm:w-[80%]"
          >
            <SpacePhoto variant={p.variant} url={p.url} label={p.caption} className="aspect-[16/9] rounded-2xl" />
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-ink-500" aria-hidden="true">
        {photos.length} {noun} · deslizá para ver más
      </p>
    </div>
  );
}
