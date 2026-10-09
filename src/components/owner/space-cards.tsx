import Link from "next/link";
import type { DemoPhoto, Feature, ListingStatus, PhotoVariant, SpaceType, VehicleSize } from "@/lib/types";
import { FEATURE_LABEL, SPACE_TYPE_LABEL, VEHICLE_LABEL, formatARS } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge, ListingStatusBadge } from "@/components/ui/badge";
import { SpacePhoto } from "@/components/ui/space-photo";
import { CameraIcon, ChevronRightIcon, PinIcon } from "@/components/ui/icons";

/** Recuadro que reemplaza la foto cuando el espacio todavía no tiene ninguna. */
export function PhotoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1 bg-ink-100 text-ink-500 ${className}`}
    >
      <CameraIcon width={28} height={28} />
      <span className="text-xs font-medium">Sin fotos</span>
    </div>
  );
}

export function CoverPhoto({ photo, className }: { photo?: DemoPhoto; className: string }) {
  return photo ? (
    <SpacePhoto variant={photo.variant} label={photo.caption} className={className} />
  ) : (
    <PhotoPlaceholder className={className} />
  );
}

/** Tarjeta de "Mis espacios" en el panel del propietario. */
export function OwnerSpaceCard({
  id,
  title,
  neighborhood,
  city,
  photo,
  status,
  hourlyPrice,
}: {
  id: string;
  title: string;
  neighborhood: string;
  city: string;
  photo?: DemoPhoto;
  status: ListingStatus;
  hourlyPrice: number;
}) {
  return (
    <Card className="flex w-full flex-col overflow-hidden">
      <CoverPhoto photo={photo} className="aspect-[16/9] w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <ListingStatusBadge status={status} />
          <p className="text-sm text-ink-700">
            <span className="font-semibold text-ink-900">{formatARS(hourlyPrice)}</span> / hora
          </p>
        </div>
        <h3 className="font-semibold text-ink-900">{title}</h3>
        <p className="text-sm text-ink-500">
          {neighborhood}, {city}
        </p>
        <Link
          href={`/propietarios/espacios/${id}/`}
          className="mt-auto inline-flex items-center gap-1 self-start rounded-lg py-1 text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          Gestionar <span className="sr-only">{title}</span>
          <ChevronRightIcon width={16} height={16} />
        </Link>
      </div>
    </Card>
  );
}

/** Vista previa de cómo vería un conductor la publicación (asistente). */
export function DriverPreviewCard({
  title,
  neighborhood,
  city,
  approxLocation,
  type,
  maxVehicle,
  features,
  photoVariant,
  hourlyPrice,
  dailyPrice,
  minHours,
}: {
  title: string;
  neighborhood: string;
  city: string;
  approxLocation: string;
  type?: SpaceType;
  maxVehicle?: VehicleSize;
  features: Feature[];
  photoVariant: PhotoVariant | null;
  hourlyPrice?: number;
  dailyPrice?: number;
  minHours?: number;
}) {
  return (
    <Card className="overflow-hidden">
      {photoVariant ? (
        <SpacePhoto variant={photoVariant} className="aspect-[16/9] w-full" />
      ) : (
        <PhotoPlaceholder className="aspect-[16/9] w-full" />
      )}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="font-semibold text-ink-900">{title || "Título del espacio"}</h3>
        <p className="flex items-start gap-1.5 text-sm text-ink-500">
          <PinIcon className="mt-0.5 shrink-0" width={16} height={16} />
          <span>
            {[neighborhood, city].filter(Boolean).join(", ") || "Barrio, ciudad"}
            {approxLocation && ` · ${approxLocation}`}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {type && <Badge>{SPACE_TYPE_LABEL[type]}</Badge>}
          {maxVehicle && <Badge>Hasta: {VEHICLE_LABEL[maxVehicle]}</Badge>}
          {features.map((f) => (
            <Badge key={f} tone="brand">
              {FEATURE_LABEL[f]}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-ink-100 pt-2 text-sm text-ink-700">
          <span>
            <span className="text-lg font-bold text-ink-900">
              {hourlyPrice ? formatARS(hourlyPrice) : "$ —"}
            </span>{" "}
            / hora
          </span>
          {dailyPrice ? <span>{formatARS(dailyPrice)} / día</span> : null}
          {minHours ? <span className="text-ink-500">Mínimo {minHours} h</span> : null}
        </div>
      </div>
    </Card>
  );
}
