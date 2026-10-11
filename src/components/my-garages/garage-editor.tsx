"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { ListingStatus } from "@/lib/types";
import type { GaragePhoto, OwnerGarage } from "@/lib/data/types";
import { createGarage, deleteGarage, updateGarage } from "@/lib/data/garages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { Field, describedBy, inputClass } from "@/components/owner/form-fields";
import type { Draft, Errors } from "@/components/owner/publish-wizard/draft";
import { CABA_ID, fullAddress, googleMapsUrl, reverseLookup, type AddressMatch } from "@/lib/geocoding";
import { AddressSearch } from "./address-search";
import { AvailabilityStep, FeaturesStep, PriceStep } from "@/components/owner/publish-wizard/steps";
import { CapacityFields, EstablishmentFields, PaymentFields, VehicleAccessFields } from "./commercial-fields";
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
}: {
  draft: GarageDraft;
  errors: Errors;
  update: (patch: Partial<GarageDraft>) => void;
}) {
  // Por ahora GuSpot funciona solo en CABA (decisión del 2026-10-10). Para sumar
  // provincias, volver a mostrar un selector con PROVINCES de src/lib/geocoding.ts.
  const provinceId = CABA_ID;
  const [showMap, setShowMap] = useState(!!draft.exactLocation);

  async function onPick(m: AddressMatch) {
    update({
      exactAddress: fullAddress(m),
      exactLocation: m.location,
      city: "CABA",
      neighborhood: m.neighborhood || draft.neighborhood,
    });
    setShowMap(true);
    if (!m.neighborhood) {
      const place = await reverseLookup(m.location);
      if (place?.neighborhood) update({ neighborhood: place.neighborhood });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-700">
        Por ahora GuSpot está disponible solo en la <strong>Ciudad de Buenos Aires</strong>.
      </p>
      <Field
        id="exactAddress"
        label="Dirección exacta (privada)"
        hint="Escribí calle y altura y elegí la dirección de la lista. Solo la ves vos."
        error={errors.exactAddress ?? errors.exactLocation}
      >
        <AddressSearch
          id="exactAddress"
          provinceId={provinceId}
          value={draft.exactAddress}
          onTextChange={(text) => update({ exactAddress: text })}
          onPick={onPick}
          invalid={!!(errors.exactAddress ?? errors.exactLocation)}
          describedBy={describedBy("exactAddress", true, errors.exactAddress ?? errors.exactLocation)}
        />
      </Field>

      {draft.exactLocation ? (
        <div id="exactLocation" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink-900">Así quedó ubicado</p>
            <a
              href={googleMapsUrl(draft.exactLocation)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-brand-700 hover:underline"
            >
              Ver en Google Maps ↗
            </a>
          </div>
          {showMap && (
            <LocationPicker
              value={draft.exactLocation}
              onChange={(p) => update({ exactLocation: p })}
            />
          )}
          <p className="text-xs text-ink-500">
            Si el pin no quedó justo en la entrada, arrastralo. Este es el punto que van a ver todos en
            el mapa; la dirección escrita y las indicaciones son privadas.
          </p>
        </div>
      ) : (
        <div id="exactLocation" className="flex flex-col gap-2">
          {showMap ? (
            <LocationPicker value={null} onChange={(p) => update({ exactLocation: p })} />
          ) : (
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="w-fit text-sm font-semibold text-brand-700 hover:underline"
            >
              ¿No aparece tu dirección? Marcala en el mapa
            </button>
          )}
        </div>
      )}

      <Field
        id="arrivalInstructions"
        label="Indicaciones al llegar"
        hint="Qué hacer al llegar: dónde presentarse, a quién avisar. Las ve quien avisa que va o tiene una reserva."
        optional
      >
        <textarea
          id="arrivalInstructions"
          rows={3}
          maxLength={1000}
          placeholder="Ej.: Entrá por la rampa de Florida y presentate en la cabina. Decí que venís por GuSpot."
          className={inputClass}
          value={draft.arrivalInstructions}
          onChange={(e) => update({ arrivalInstructions: e.target.value })}
          aria-describedby={describedBy("arrivalInstructions", true)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
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
        label="Referencia para llegar (pública)"
        optional
        hint="Ej.: “Entrada por Florida, entre Paraguay y Charcas”."
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
  const fieldProps = { draft, errors, update };

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
          {garage ? "Editar garage" : "Publicá tu garage comercial"}
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
        <Section title="El establecimiento">
          <EstablishmentFields {...fieldProps} />
        </Section>
        <Section title="Ubicación" subtitle="El punto del garage se ve en el mapa. La dirección escrita y las indicaciones las ve quien avisa que va o reserva.">
          <LocationFields draft={draft} errors={errors} update={update} />
        </Section>
        <Section title="Capacidad">
          <CapacityFields {...fieldProps} />
        </Section>
        <Section title="Vehículos y acceso">
          <VehicleAccessFields {...fieldProps} />
        </Section>
        <Section title="Servicios y condiciones">
          <FeaturesStep {...stepProps} />
        </Section>
        <Section title="Tarifas">
          <PriceStep {...stepProps} />
        </Section>
        <Section title="Medios de pago">
          <PaymentFields {...fieldProps} />
        </Section>
        <Section title="Horario de atención">
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
