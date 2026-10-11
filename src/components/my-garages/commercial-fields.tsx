"use client";

import type { AccessType, PaymentMethod, SpaceType, VehicleSize } from "@/lib/types";
import { ACCESS_TYPE_LABEL, PAYMENT_METHOD_LABEL, SPACE_TYPE_LABEL, VEHICLE_LABEL } from "@/lib/format";
import { Field, describedBy, inputClass } from "@/components/owner/form-fields";
import type { Errors } from "@/components/owner/publish-wizard/draft";
import type { GarageDraft } from "./garage-draft";

type Props = { draft: GarageDraft; errors: Errors; update: (patch: Partial<GarageDraft>) => void };

const SPACE_TYPES = Object.keys(SPACE_TYPE_LABEL) as SpaceType[];
const VEHICLES = Object.keys(VEHICLE_LABEL) as VehicleSize[];
const PAYMENTS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[];
const ACCESS = Object.keys(ACCESS_TYPE_LABEL) as Exclude<AccessType, "">[];

const checkCard =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500";

/** Nombre y descripción del establecimiento. */
export function EstablishmentFields({ draft, errors, update }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <Field id="title" label="Nombre del establecimiento" hint="Como lo conocen tus clientes. Ej.: “Garaje Plaza San Martín”." error={errors.title}>
        <input
          id="title"
          className={inputClass}
          value={draft.title}
          maxLength={80}
          onChange={(e) => update({ title: e.target.value })}
          aria-invalid={!!errors.title}
          aria-describedby={describedBy("title", true, errors.title)}
        />
      </Field>
      <Field id="description" label="Descripción" optional hint="Lo que conviene saber: entrada, seguridad, tipo de cocheras." error={errors.description}>
        <textarea
          id="description"
          rows={3}
          className={inputClass}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          aria-invalid={!!errors.description}
          aria-describedby={describedBy("description", true, errors.description)}
        />
      </Field>
    </div>
  );
}

/** Capacidad, cupo para reservas y teléfono. */
export function CapacityFields({ draft, errors, update }: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="capacity" label="Capacidad total" hint="Cantidad de lugares del garaje." error={errors.capacity}>
        <input
          id="capacity"
          inputMode="numeric"
          className={inputClass}
          value={draft.capacity}
          onChange={(e) => update({ capacity: e.target.value.replace(/\D/g, "") })}
          aria-invalid={!!errors.capacity}
          aria-describedby={describedBy("capacity", true, errors.capacity)}
        />
      </Field>
      <Field
        id="reservableSpots"
        label="Lugares para reservas por GuSpot"
        hint="Cuántos conductores pueden tener una reserva al mismo tiempo. 0 = solo avisos de llegada. Las reservas se pagan con Mercado Pago: conectalo en Tu cuenta → Cobros con Mercado Pago."
        error={errors.reservableSpots}
      >
        <input
          id="reservableSpots"
          inputMode="numeric"
          className={inputClass}
          value={draft.reservableSpots}
          onChange={(e) => update({ reservableSpots: e.target.value.replace(/\D/g, "") })}
          aria-invalid={!!errors.reservableSpots}
          aria-describedby={describedBy("reservableSpots", true, errors.reservableSpots)}
        />
      </Field>
      <Field id="contactPhone" label="Teléfono del garaje" optional hint="Lo ven los conductores para llamar antes de ir." error={errors.contactPhone}>
        <input
          id="contactPhone"
          type="tel"
          placeholder="11 4321 0000"
          className={inputClass}
          value={draft.contactPhone}
          onChange={(e) => update({ contactPhone: e.target.value })}
          aria-invalid={!!errors.contactPhone}
          aria-describedby={describedBy("contactPhone", true, errors.contactPhone)}
        />
      </Field>
    </div>
  );
}

/** Tipo de espacio, vehículo máximo, altura y acceso. */
export function VehicleAccessFields({ draft, errors, update }: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id="type" label="Tipo de espacio" error={errors.type}>
        <select
          id="type"
          className={inputClass}
          value={draft.type}
          onChange={(e) => update({ type: e.target.value as SpaceType | "" })}
          aria-invalid={!!errors.type}
        >
          <option value="">Elegí una opción</option>
          {SPACE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "cubierta" ? "Cubierto" : t === "semicubierta" ? "Semicubierto" : "Descubierto"}
            </option>
          ))}
        </select>
      </Field>
      <Field id="maxVehicle" label="Vehículo más grande que recibe" error={errors.maxVehicle}>
        <select
          id="maxVehicle"
          className={inputClass}
          value={draft.maxVehicle}
          onChange={(e) => update({ maxVehicle: e.target.value as VehicleSize | "" })}
          aria-invalid={!!errors.maxVehicle}
        >
          <option value="">Elegí una opción</option>
          {VEHICLES.map((v) => (
            <option key={v} value={v}>
              {VEHICLE_LABEL[v]}
            </option>
          ))}
        </select>
      </Field>
      <Field id="maxHeight" label="Altura máxima (metros)" optional hint="Ej.: 2,10" error={errors.maxHeight}>
        <input
          id="maxHeight"
          inputMode="decimal"
          className={inputClass}
          value={draft.maxHeight}
          onChange={(e) => update({ maxHeight: e.target.value.replace(/[^\d,.]/g, "") })}
          aria-invalid={!!errors.maxHeight}
          aria-describedby={describedBy("maxHeight", true, errors.maxHeight)}
        />
      </Field>
      <Field id="accessType" label="Acceso" optional>
        <select
          id="accessType"
          className={inputClass}
          value={draft.accessType}
          onChange={(e) => update({ accessType: e.target.value as AccessType })}
        >
          <option value="">Sin especificar</option>
          {ACCESS.map((a) => (
            <option key={a} value={a}>
              {ACCESS_TYPE_LABEL[a]}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

/** Medios de pago aceptados y si se paga en el garaje. */
export function PaymentFields({ draft, update }: Props) {
  function toggle(m: PaymentMethod) {
    update({
      paymentMethods: draft.paymentMethods.includes(m)
        ? draft.paymentMethods.filter((x) => x !== m)
        : [...draft.paymentMethods, m],
    });
  }
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-ink-900">Medios de pago que aceptás</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PAYMENTS.map((m) => (
            <label key={m} className={checkCard}>
              <input
                type="checkbox"
                checked={draft.paymentMethods.includes(m)}
                onChange={() => toggle(m)}
                className="h-4 w-4 accent-brand-600"
              />
              {PAYMENT_METHOD_LABEL[m]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={draft.payAtGarage}
          onChange={(e) => update({ payAtGarage: e.target.checked })}
          className="h-4 w-4 accent-brand-600"
        />
        El conductor paga en el garaje
      </label>
    </div>
  );
}
