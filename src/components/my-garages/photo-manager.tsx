"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { PHOTO_LIMITS, type GaragePhoto } from "@/lib/data/types";
import { removeGaragePhoto, uploadGaragePhoto } from "@/lib/data/garages";
import { Button } from "@/components/ui/button";
import { SpacePhoto } from "@/components/ui/space-photo";
import { CameraIcon } from "@/components/ui/icons";
import { ErrorBox, errorMessage } from "./shared";

/** Fotos de un garage ya guardado: se suben y borran al momento. */
export function PhotoManager({
  garageId,
  photos,
  onChange,
}: {
  garageId: string;
  photos: GaragePhoto[];
  onChange: (photos: GaragePhoto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const room = PHOTO_LIMITS.maxPerGarage - photos.length;

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setError(null);
    if (files.length > room) {
      setError(`Podés subir ${room === 1 ? "1 foto más" : `${room} fotos más`} (máximo ${PHOTO_LIMITS.maxPerGarage}).`);
      return;
    }
    let current = photos;
    setUploading(files.length);
    for (const file of files) {
      try {
        const photo = await uploadGaragePhoto(garageId, file);
        current = [...current, photo];
        onChange(current);
      } catch (err) {
        setError(`${file.name}: ${errorMessage(err)}`);
      }
      setUploading((n) => n - 1);
    }
  }

  async function onRemove(path: string) {
    setRemoving(path);
    setError(null);
    try {
      await removeGaragePhoto(garageId, path);
      onChange(photos.filter((p) => p.path !== path));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.path} className="overflow-hidden rounded-xl border border-ink-200 bg-white">
              <SpacePhoto variant="garage" url={p.url} label={`Foto ${i + 1}`} className="aspect-[4/3] w-full" />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="text-xs text-ink-500">{i === 0 ? "Portada" : `Foto ${i + 1}`}</span>
                <button
                  type="button"
                  onClick={() => onRemove(p.path)}
                  disabled={removing !== null}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {removing === p.path ? "Quitando…" : "Quitar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-ink-300 bg-ink-50 p-4 text-sm text-ink-500">
          <CameraIcon className="shrink-0" />
          Todavía no subiste fotos. Mostrá la entrada y el lugar donde se estaciona (sin la numeración de la
          calle).
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_LIMITS.mimeTypes.join(",")}
        multiple
        className="hidden"
        onChange={onFiles}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={room <= 0 || uploading > 0}>
          {uploading > 0 ? `Subiendo (${uploading})…` : "Agregar fotos"}
        </Button>
        <span className="text-xs text-ink-500">
          Hasta {PHOTO_LIMITS.maxPerGarage} fotos JPG, PNG o WebP de 5 MB cada una. Las fotos son públicas.
        </span>
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  );
}
