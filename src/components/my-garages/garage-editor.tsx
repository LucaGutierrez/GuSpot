"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { ListingStatus, LatLng } from "@/lib/types";
import type { GaragePhoto, OwnerGarage } from "@/lib/data/types";
import { createGarage, deleteGarage, updateGarage } from "@/lib/data/garages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { Field, FieldError, describedBy, inputClass } from "@/components/owner/form-fields";
import { OTHER_CITY, demoCities, type Draft, type Errors } from "@/components/owner/publish-wizard/draft";
import { AvailabilityStep, BasicsStep, FeaturesStep, PriceStep } from "@/components/owner/publish-wizard/steps";
import { LocationPicker } from "./location-picker";
import { PhotoManager } from "./photo-manager";
import { ErrorBox, StatusControl, SuccessBox, errorMessage } from "./shared";
import {
  draftFromGarage,
  emptyGarageDraft,
  toGarageInput,
  validateGarageDraft,
  type GarageDraft,
} from "./garage-draft";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-5 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {children}
    </Card>
  );
}

function LocationFields({
  draft,
  errors,
  update,
  publicLocation,
}: {
  draft: GarageDraft;
  errors: Errors;
  update: (patch: Partial<GarageDraft>) => void;
  publicLocation: LatLng | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="city" label="Ciudad" error={errors.city}>
          <select
            id="city"
            className={inputClass}
            value={draft.city}
            onChange={(e) => update({ city: e.target.value })}
            aria-invalid={!!errors.city}
            aria-describedby={describedBy("city", false, errors.city)}
          >
            <option value="">Elegí una ciudad</option>
            {demoCities().map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={OTHER_CITY}>Otra</option>
          </select>
        </Field>
        {draft.city === OTHER_CITY && (
          <Field id="otherCity" label="¿Qué ciudad?" error={errors.otherCity}>
            <input
              id="otherCity"
              className={inputClass}
              value={draft.otherCity}
              onChange={(e) => update({ otherCity: e.target.value })}
              aria-invalid={!!errors.otherCity}
              aria-describedby={describedBy("otherCity", false, errors.otherCity)}
            />
          </Field>
        )}
        <Field id="neighborhood" label="Barrio" error={errors.neighborhood}>
          <input
            id="neighborhood"
            className={inputClass}
            value={draft.neighborhood}
            onChange={(e) => update({ neighborhood: e.target.value })}
            aria-invalid={!!errors.neighborhood}
            aria-describedby={describedBy("neighborhood", false, errors.neighborhood)}
          />
        </Field>
      </div>
      <Field
        id="approxLocation"
        label="Referencia aproximada (pública)"
        hint="Es lo que ven todos. Ejemplo: “A ~3 cuadras de Plaza Serrano”."
        error={errors.approxLocation}
      >
        <input
          id="approxLocation"
          className={inputClass}
          value={draft.approxLocation}
          onChange={(e) => update({ approxLocation: e.target.value })}
          aria-invalid={!!errors.approxLocation}
          aria-describedby={describedBy("approxLocation", true, errors.approxLocation)}
        />
      </Field>
      <Field
        id="exactAddress"
        label="Dirección exacta (privada)"
        hint="Solo la ves vos. Más adelante se compartirá únicamente con conductores con reserva confirmada y pagada."
        error={errors.exactAddress}
      >
        <input
          id="exactAddress"
          className={inputClass}
          value={draft.exactAddress}
          autoComplete="street-address"
          onChange={(e) => update({ exactAddress: e.target.value })}
          aria-invalid={!!errors.exactAddress}
          aria-describedby={describedBy("exactAddress", true, errors.exactAddress)}
        />
      </Field>
      <div id="exactLocation" className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-ink-900">Punto exacto en el mapa (privado)</p>
        <LocationPicker
          value={draft.exactLocation}
          onChange={(p) => update({ exactLocation: p })}
          publicLocation={publicLocation}
        />
        <p className="text-xs text-ink-500">
          En el mapa público se muestra un punto aproximado, a 100–200 m del real.
        </p>
        <FieldError message={errors.exactLocation} />
      </div>
    </div>
  );
}

/** Formulario de alta (`garage` null) o edición de un garage propio. */
export function GarageEditor({ garage, justCreated = false }: { garage: OwnerGarage | null; justCreated?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<GarageDraft>(() => (garage ? draftFromGarage(garage) : emptyGarageDraft()));
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<ListingStatus>(garage?.status ?? "borrador");
  const [photos, setPhotos] = useState<GaragePhoto[]>(garage?.photos ?? []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(justCreated);
  const [dirty, setDirty] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  function update(patch: Partial<GarageDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
    setSaved(false);
  }
  // Los pasos del asistente esperan un `update` de Draft (GarageDraft lo extiende).
  const stepProps = { draft, errors, update: update as (patch: Partial<Draft>) => void };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validateGarageDraft(draft);
    setErrors(found);
    setSaveError(null);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSaving(true);
    try {
      const input = toGarageInput(draft);
      if (garage) {
        await updateGarage(garage.id, input);
        setSaved(true);
        setDirty(false);
      } else {
        const { id } = await createGarage(input);
        router.replace(`/mis-garages/editar/?id=${id}&nuevo=1`);
        return;
      }
    } catch (err) {
      setSaveError(errorMessage(err));
    }
    setSaving(false);
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-2 pt-6">
        <Link href="/mis-garages/" className="flex w-fit items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
          <ChevronLeftIcon width={16} height={16} /> Mis garages
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {garage ? "Editar garage" : "Publicá tu garage"}
        </h1>
        <p className="text-ink-500">
          {garage
            ? garage.title
            : "Se guarda como borrador. Después de guardar podés subir fotos y publicarlo."}
        </p>
      </div>

      {justCreated && saved && <SuccessBox>Guardamos tu garage como borrador. Sumá fotos y publicalo cuando esté listo.</SuccessBox>}

      {garage && (
        <Card className="p-5">
          <StatusControl
            garageId={garage.id}
            status={status}
            onChange={setStatus}
          />
          {dirty && status !== "borrador" && (
            <p className="mt-2 text-xs text-ink-500">Tenés cambios sin guardar: guardalos para que se vean en la publicación.</p>
          )}
        </Card>
      )}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <Section title="Datos básicos">
          <BasicsStep {...stepProps} />
        </Section>
        <Section title="Ubicación" subtitle="La dirección y el punto exacto son privados: solo los ves vos.">
          <LocationFields draft={draft} errors={errors} update={update} publicLocation={garage?.publicLocation ?? null} />
        </Section>
        <Section title="Características y condiciones">
          <FeaturesStep {...stepProps} />
        </Section>
        <Section title="Precio">
          <PriceStep {...stepProps} />
        </Section>
        <Section title="Disponibilidad">
          <AvailabilityStep {...stepProps} />
        </Section>

        <div className="sticky bottom-[calc(var(--mobile-nav-height)+0.5rem)] z-10 flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white/95 p-4 shadow-lg backdrop-blur md:bottom-4">
          {errorCount > 0 && (
            <div ref={summaryRef} tabIndex={-1} className="outline-none">
              <ErrorBox>
                {errorCount === 1 ? "Hay 1 dato para revisar" : `Hay ${errorCount} datos para revisar`} (marcados en rojo).
              </ErrorBox>
            </div>
          )}
          {saveError && <ErrorBox>{saveError}</ErrorBox>}
          {saved && !justCreated && <SuccessBox>Cambios guardados.</SuccessBox>}
          <Button type="submit" size="lg" disabled={saving || (!!garage && !dirty)}>
            {saving ? "Guardando…" : garage ? "Guardar cambios" : "Guardar borrador"}
          </Button>
        </div>
      </form>

      {garage && (
        <Section title="Fotos" subtitle="Se guardan al subirlas. La primera es la portada.">
          <PhotoManager garageId={garage.id} photos={photos} onChange={setPhotos} />
        </Section>
      )}

      {garage && <DeleteGarage id={garage.id} />}
    </div>
  );
}

function DeleteGarage({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteGarage(id);
      router.replace("/mis-garages/");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 border-red-200 p-5">
      <h2 className="text-lg font-semibold text-ink-900">Eliminar garage</h2>
      {confirming ? (
        <>
          <p className="text-sm text-ink-700">Se borran el garage y sus fotos. No se puede deshacer.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            Eliminar este garage
          </Button>
        </div>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
    </Card>
  );
}
