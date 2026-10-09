"use client";

import type { Feature, PhotoVariant, SpaceType, VehicleSize } from "@/lib/types";
import { FEATURE_LABEL, SPACE_TYPE_LABEL, VEHICLE_LABEL, formatARS } from "@/lib/format";
import { HOUR_MS, fromMs, toMs } from "@/lib/datetime";
import { quote } from "@/lib/pricing";
import { describeAvailability } from "@/lib/availability";
import { DemoNotice } from "@/components/ui/demo-notice";
import { Button } from "@/components/ui/button";
import { SpacePhoto } from "@/components/ui/space-photo";
import { CameraIcon, PinIcon, PlusIcon } from "@/components/ui/icons";
import { Field, FieldError, describedBy, inputClass } from "../form-fields";
import { PhotoPlaceholder } from "../space-cards";
import {
  OTHER_CITY,
  demoCities,
  newRule,
  parsePesos,
  toRules,
  type Draft,
  type Errors,
  type RuleDraft,
} from "./draft";

export interface StepProps {
  draft: Draft;
  errors: Errors;
  update: (patch: Partial<Draft>) => void;
}

const SPACE_TYPES = Object.keys(SPACE_TYPE_LABEL) as SpaceType[];
const VEHICLES = Object.keys(VEHICLE_LABEL) as VehicleSize[];
const FEATURES = Object.keys(FEATURE_LABEL) as Feature[];

// ---------------------------------------------------------------- (a) Datos básicos

export function BasicsStep({ draft, errors, update }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <Field
        id="title"
        label="Título"
        hint="Algo corto y claro, por ejemplo: “Cochera cubierta cerca de Plaza Serrano”."
        error={errors.title}
      >
        <input
          id="title"
          className={inputClass}
          value={draft.title}
          maxLength={100}
          onChange={(e) => update({ title: e.target.value })}
          aria-invalid={!!errors.title}
          aria-describedby={describedBy("title", true, errors.title)}
        />
      </Field>
      <Field
        id="description"
        label="Descripción"
        hint="Contá cómo es el lugar y cómo se ingresa. No incluyas la dirección exacta."
        error={errors.description}
      >
        <textarea
          id="description"
          rows={4}
          className={inputClass}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          aria-invalid={!!errors.description}
          aria-describedby={describedBy("description", true, errors.description)}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="type" label="Tipo de espacio" error={errors.type}>
          <select
            id="type"
            className={inputClass}
            value={draft.type}
            onChange={(e) => update({ type: e.target.value as SpaceType | "" })}
            aria-invalid={!!errors.type}
            aria-describedby={describedBy("type", false, errors.type)}
          >
            <option value="">Elegí una opción</option>
            {SPACE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SPACE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="maxVehicle"
          label="Vehículo máximo"
          hint="El vehículo más grande que entra cómodo."
          error={errors.maxVehicle}
        >
          <select
            id="maxVehicle"
            className={inputClass}
            value={draft.maxVehicle}
            onChange={(e) => update({ maxVehicle: e.target.value as VehicleSize | "" })}
            aria-invalid={!!errors.maxVehicle}
            aria-describedby={describedBy("maxVehicle", true, errors.maxVehicle)}
          >
            <option value="">Elegí una opción</option>
            {VEHICLES.map((v) => (
              <option key={v} value={v}>
                {VEHICLE_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- (b) Ubicación

export function LocationStep({ draft, errors, update }: StepProps) {
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
        hint="Es lo que ven todos antes de reservar. Ejemplo: “A ~3 cuadras de Plaza Serrano”."
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
        hint="Solo se comparte con conductores con reserva confirmada."
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
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-ink-300 bg-ink-50 p-4 text-sm text-ink-500">
        <PinIcon className="shrink-0" />
        <span>
          <strong className="font-semibold text-ink-700">Mapa: próximamente.</strong> Por ahora no se puede
          marcar la ubicación en un mapa.
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- (c) Características

export function FeaturesStep({ draft, errors, update }: StepProps) {
  function toggle(f: Feature) {
    update({
      features: draft.features.includes(f)
        ? draft.features.filter((x) => x !== f)
        : [...draft.features, f],
    });
  }
  function setCondition(i: number, value: string) {
    update({ conditions: draft.conditions.map((c, j) => (j === i ? value : c)) });
  }
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium text-ink-900">
          Características <span className="font-normal text-ink-500">(marcá todas las que apliquen)</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <label
              key={f}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={draft.features.includes(f)}
                onChange={() => toggle(f)}
              />
              {FEATURE_LABEL[f]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3" aria-describedby={errors.conditions ? "conditions-error" : "conditions-ayuda"}>
        <legend className="text-sm font-medium text-ink-900">Condiciones de acceso</legend>
        <p id="conditions-ayuda" className="text-xs text-ink-500">
          Reglas que el conductor tiene que cumplir. Ejemplo: “Altura máxima 1,90 m.”
        </p>
        <ul className="flex flex-col gap-2">
          {draft.conditions.map((c, i) => (
            <li key={i} className="flex gap-2">
              <label htmlFor={`condition-${i}`} className="sr-only">
                Condición {i + 1}
              </label>
              <input
                id={`condition-${i}`}
                className={inputClass}
                value={c}
                placeholder={`Condición ${i + 1}`}
                onChange={(e) => setCondition(i, e.target.value)}
                aria-invalid={!!errors.conditions && !c.trim()}
              />
              <Button
                variant="secondary"
                className="shrink-0"
                onClick={() => update({ conditions: draft.conditions.filter((_, j) => j !== i) })}
              >
                Quitar <span className="sr-only">condición {i + 1}</span>
              </Button>
            </li>
          ))}
        </ul>
        {draft.conditions.length === 0 && (
          <p className="text-sm text-ink-500">Sin condiciones. Podés agregar las que necesites.</p>
        )}
        <FieldError id="conditions-error" message={errors.conditions} />
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => update({ conditions: [...draft.conditions, ""] })}
        >
          <PlusIcon width={18} height={18} /> Agregar condición
        </Button>
      </fieldset>
    </div>
  );
}

// ---------------------------------------------------------------- (d) Fotos

const PHOTO_OPTIONS: { variant: PhotoVariant; label: string }[] = [
  { variant: "garage", label: "Garage" },
  { variant: "cochera", label: "Cochera" },
  { variant: "patio", label: "Patio" },
  { variant: "subsuelo", label: "Subsuelo" },
  { variant: "porton", label: "Portón" },
];

export function PhotosStep({ draft, update }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div
        aria-disabled="true"
        className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-ink-300 bg-ink-50 p-6 text-center text-ink-500"
      >
        <CameraIcon width={32} height={32} />
        <p className="text-sm">Arrastrá tus fotos acá o elegilas desde tu dispositivo.</p>
        <Button variant="secondary" disabled>
          Elegir fotos
        </Button>
      </div>
      <DemoNotice title="La carga de fotos todavía no está disponible">
        Mientras tanto, podés elegir una ilustración de muestra para ver cómo quedaría la publicación. No es
        una foto real de tu espacio.
      </DemoNotice>
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-ink-900">Ilustración de muestra para la vista previa</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PHOTO_OPTIONS.map((o) => (
            <PhotoChoice
              key={o.variant}
              label={o.label}
              checked={draft.photo === o.variant}
              onSelect={() => update({ photo: o.variant })}
            >
              <SpacePhoto variant={o.variant} label="Muestra" className="aspect-[16/10] w-full" />
            </PhotoChoice>
          ))}
          <PhotoChoice label="Sin ilustración" checked={draft.photo === null} onSelect={() => update({ photo: null })}>
            <PhotoPlaceholder className="aspect-[16/10] w-full" />
          </PhotoChoice>
        </div>
      </fieldset>
    </div>
  );
}

function PhotoChoice({
  label,
  checked,
  onSelect,
  children,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-ink-200 bg-white has-[:checked]:border-brand-600 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500">
      {children}
      <span className="flex items-center gap-2 px-3 py-2 text-sm text-ink-900">
        <input type="radio" name="photo" className="accent-brand-600" checked={checked} onChange={onSelect} />
        {label}
      </span>
    </label>
  );
}

// ---------------------------------------------------------------- (e) Precio

const EXAMPLE_START = "2026-01-05T10:00"; // fecha cualquiera, solo para calcular duraciones

export function PriceStep({ draft, errors, update }: StepProps) {
  const hourly = parsePesos(draft.hourly);
  const daily = draft.daily.trim() ? parsePesos(draft.daily) : undefined;
  const minHours = Number(draft.minHours);
  const canPreview =
    hourly > 0 && (daily === undefined || daily > 0) && Number.isInteger(minHours) && minHours >= 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="hourly" label="Precio por hora (ARS)" error={errors.hourly}>
          <MoneyInput
            id="hourly"
            value={draft.hourly}
            onChange={(v) => update({ hourly: v })}
            error={errors.hourly}
          />
        </Field>
        <Field
          id="daily"
          label="Precio por día (ARS)"
          optional
          hint="Se aplica a cada bloque de 24 h."
          error={errors.daily}
        >
          <MoneyInput
            id="daily"
            value={draft.daily}
            onChange={(v) => update({ daily: v })}
            error={errors.daily}
            hint
          />
        </Field>
        <Field id="minHours" label="Mínimo de horas" error={errors.minHours}>
          <input
            id="minHours"
            type="number"
            inputMode="numeric"
            min={1}
            max={24}
            className={inputClass}
            value={draft.minHours}
            onChange={(e) => update({ minHours: e.target.value })}
            aria-invalid={!!errors.minHours}
            aria-describedby={describedBy("minHours", false, errors.minHours)}
          />
        </Field>
      </div>

      <section aria-labelledby="quote-preview" className="rounded-2xl bg-ink-50 p-4">
        <h3 id="quote-preview" className="text-sm font-semibold text-ink-900">
          Cuánto pagaría un conductor (ejemplos)
        </h3>
        {canPreview ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {[2, 8, 24].map((h) => {
              const q = quote(
                { hourlyPrice: hourly * 100, dailyPrice: daily ? daily * 100 : undefined, minHours },
                EXAMPLE_START,
                fromMs(toMs(EXAMPLE_START) + h * HOUR_MS),
              );
              return (
                <li key={h} className="rounded-xl border border-ink-200 bg-white p-3">
                  <p className="text-xs text-ink-500">{h} horas</p>
                  {q.ok ? (
                    <p className="text-lg font-bold text-ink-900">{formatARS(q.total)}</p>
                  ) : (
                    <p className="text-sm text-ink-700">{q.reason}</p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-500">Completá el precio por hora para ver ejemplos.</p>
        )}
        <p className="mt-3 text-xs text-ink-500">
          Regla de cálculo propuesta (pendiente de confirmación): las horas se redondean hacia arriba y el cobro
          por horas nunca supera la tarifa diaria. Comisión de la plataforma: a definir.
        </p>
      </section>
    </div>
  );
}

function MoneyInput({
  id,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: boolean;
}) {
  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-500">
        $
      </span>
      <input
        id={id}
        inputMode="numeric"
        className={`${inputClass} pl-7`}
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, hint, error)}
      />
    </div>
  );
}

// ---------------------------------------------------------------- (f) Disponibilidad

const WEEK = [
  { d: 1, short: "Lun", long: "Lunes" },
  { d: 2, short: "Mar", long: "Martes" },
  { d: 3, short: "Mié", long: "Miércoles" },
  { d: 4, short: "Jue", long: "Jueves" },
  { d: 5, short: "Vie", long: "Viernes" },
  { d: 6, short: "Sáb", long: "Sábado" },
  { d: 0, short: "Dom", long: "Domingo" },
];

export function AvailabilityStep({ draft, errors, update }: StepProps) {
  function patchRule(key: number, patch: Partial<RuleDraft>) {
    update({ rules: draft.rules.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
  }
  const preview = describeAvailability({ availability: toRules(draft.rules) });

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-700">
        Indicá en qué días y horarios los conductores pueden usar tu espacio. Podés cargar varias franjas (por
        ejemplo, una para días de semana y otra para el fin de semana).
      </p>
      {draft.rules.map((r, i) => {
        const daysErr = errors[`rule-${r.key}-days`];
        const timeErr = errors[`rule-${r.key}-time`];
        return (
          <fieldset key={r.key} className="flex flex-col gap-4 rounded-2xl border border-ink-200 bg-white p-4">
            <legend className="sr-only">Franja {i + 1}</legend>
            <div className="flex items-center justify-between gap-2">
              <p aria-hidden="true" className="text-sm font-semibold text-ink-900">
                Franja {i + 1}
              </p>
              {draft.rules.length > 1 && (
                <Button
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => update({ rules: draft.rules.filter((x) => x.key !== r.key) })}
                >
                  Quitar <span className="sr-only">franja {i + 1}</span>
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2" role="group" aria-label={`Días de la franja ${i + 1}`}>
              <div className="flex flex-wrap gap-1.5">
                {WEEK.map((w) => (
                  <label
                    key={w.d}
                    className="flex h-10 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-ink-200 px-2 text-sm font-medium text-ink-700 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500"
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={r.days.includes(w.d)}
                      onChange={() =>
                        patchRule(r.key, {
                          days: r.days.includes(w.d) ? r.days.filter((x) => x !== w.d) : [...r.days, w.d],
                        })
                      }
                    />
                    <span aria-hidden="true">{w.short}</span>
                    <span className="sr-only">{w.long}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 text-xs">
                <span className="py-1 text-ink-500">Atajos:</span>
                {[
                  { label: "Lun a Vie", days: [1, 2, 3, 4, 5] },
                  { label: "Fin de semana", days: [0, 6] },
                  { label: "Todos los días", days: [0, 1, 2, 3, 4, 5, 6] },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    className="rounded-md px-2 py-1 font-medium text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500"
                    onClick={() => patchRule(r.key, { days: s.days })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <FieldError message={daysErr} />
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-900">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={r.allDay}
                onChange={(e) => patchRule(r.key, { allDay: e.target.checked })}
              />
              Disponible las 24 h
            </label>

            {!r.allDay && (
              <div className="flex flex-col gap-1.5">
                <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`from-${r.key}`} className="text-sm text-ink-700">
                      Desde
                    </label>
                    <input
                      id={`from-${r.key}`}
                      type="time"
                      step={1800}
                      className={inputClass}
                      value={r.from}
                      onChange={(e) => patchRule(r.key, { from: e.target.value })}
                      aria-invalid={!!timeErr}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={`to-${r.key}`} className="text-sm text-ink-700">
                      Hasta
                    </label>
                    <input
                      id={`to-${r.key}`}
                      type="time"
                      step={1800}
                      className={inputClass}
                      value={r.to}
                      onChange={(e) => patchRule(r.key, { to: e.target.value })}
                      aria-invalid={!!timeErr}
                      aria-describedby={`to-${r.key}-ayuda`}
                    />
                  </div>
                </div>
                <p id={`to-${r.key}-ayuda`} className="text-xs text-ink-500">
                  Usá 00:00 en “Hasta” para indicar “hasta medianoche”.
                </p>
                <FieldError message={timeErr} />
              </div>
            )}
          </fieldset>
        );
      })}
      <FieldError message={errors.rules} />
      <Button
        variant="secondary"
        className="self-start"
        onClick={() => update({ rules: [...draft.rules, newRule({ days: [0, 6], from: "09:00", to: "18:00" })] })}
      >
        <PlusIcon width={18} height={18} /> Agregar franja
      </Button>

      <div className="rounded-2xl bg-ink-50 p-4">
        <p className="text-sm font-semibold text-ink-900">Así se va a ver tu horario</p>
        {preview.length ? (
          <ul className="mt-2 list-disc pl-5 text-sm text-ink-700">
            {preview.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-500">Elegí al menos un día.</p>
        )}
        <p className="mt-2 text-xs text-ink-500">Bloqueo de fechas puntuales (feriados, vacaciones): próximamente.</p>
      </div>
    </div>
  );
}
