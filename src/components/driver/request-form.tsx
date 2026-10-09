"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import type { LocalDateTime, Space, VehicleSize } from "@/lib/types";
import { VEHICLE_LABEL, formatARS, formatRange } from "@/lib/format";
import { BookingStatusBadge, DemoBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoNotice } from "@/components/ui/demo-notice";
import { AvailabilityBadge } from "./availability-status";
import { checkBooking } from "./booking-check";
import { PriceBreakdown } from "./price-breakdown";
import { rangeQuery, readRange } from "./range";
import { RangeFields, fieldInput, fieldLabel } from "./range-fields";
import { useRange } from "./use-range";
import { VEHICLE_ORDER, fitsVehicle } from "./vehicles";

interface Submitted {
  start: LocalDateTime;
  end: LocalDateTime;
  total: number;
  vehicle: VehicleSize;
  plate: string;
}

/**
 * Formulario de solicitud. Solo guarda estado en el navegador: no hace
 * pedidos de red ni envía nada a ningún propietario.
 */
export function RequestForm({ space }: { space: Space }) {
  const id = useId();
  const params = useSearchParams();
  const { value, setValue, now } = useRange(readRange(params));
  const [vehicle, setVehicle] = useState<VehicleSize | "">("");
  const [plate, setPlate] = useState("");
  const [message, setMessage] = useState("");
  const [tried, setTried] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);

  const check = checkBooking(space, value, now);
  const vehicleError = !vehicle
    ? "Elegí el tamaño de tu vehículo."
    : !fitsVehicle(space.maxVehicle, vehicle)
      ? `Este espacio admite hasta ${VEHICLE_LABEL[space.maxVehicle].toLowerCase()}.`
      : null;

  if (submitted) return <RequestResult space={space} data={submitted} />;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTried(true);
    if (!check.status.ok || !check.quote.ok || !check.interval || vehicleError || !vehicle) return;
    setSubmitted({
      start: check.interval.start,
      end: check.interval.end,
      total: check.quote.total,
      vehicle,
      plate: plate.trim(),
    });
    window.scrollTo({ top: 0 });
  };

  const backHref = `/espacios/${space.id}/${rangeQuery({ zona: params.get("zona") ?? "", ...value })}`;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink-900">Período</h2>
          <Link href={backHref} className="text-sm font-medium text-brand-700 hover:underline">
            Ver el espacio
          </Link>
        </div>
        <RangeFields value={value} onChange={setValue} idPrefix={id} />
        <div className="space-y-3" aria-live="polite" id={`${id}-estado`}>
          <AvailabilityBadge status={check.status} />
          {!check.status.ok && check.status.detail && (
            <p className="text-sm text-ink-500">{check.status.detail}</p>
          )}
          {check.interval && check.quote.ok && (
            <>
              <p className="text-sm text-ink-700">{formatRange(check.interval.start, check.interval.end)}</p>
              <PriceBreakdown space={space} quote={check.quote} />
              <p className="text-xs text-ink-500">
                Precio estimado con la tarifa actual del espacio (datos de ejemplo).
              </p>
            </>
          )}
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-ink-900">Tu vehículo</h2>
        <div>
          <label htmlFor={`${id}-vehiculo`} className={fieldLabel}>
            Tamaño del vehículo <span aria-hidden="true">*</span>
          </label>
          <select
            id={`${id}-vehiculo`}
            required
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value as VehicleSize | "")}
            aria-invalid={tried && !!vehicleError}
            aria-describedby={`${id}-vehiculo-ayuda`}
            className={fieldInput}
          >
            <option value="">Elegí una opción</option>
            {VEHICLE_ORDER.map((v) => (
              <option key={v} value={v}>
                {VEHICLE_LABEL[v]}
              </option>
            ))}
          </select>
          <p
            id={`${id}-vehiculo-ayuda`}
            className={`mt-1 text-xs ${(tried || vehicle) && vehicleError ? "text-red-700" : "text-ink-500"}`}
          >
            {(tried || vehicle) && vehicleError
              ? vehicleError
              : `Admite hasta: ${VEHICLE_LABEL[space.maxVehicle]}.`}
          </p>
        </div>
        <div>
          <label htmlFor={`${id}-patente`} className={fieldLabel}>
            Patente <span className="font-normal text-ink-500">(opcional)</span>
          </label>
          <input
            id={`${id}-patente`}
            type="text"
            autoComplete="off"
            maxLength={10}
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="Ej.: AB 123 CD"
            className={`${fieldInput} uppercase`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-mensaje`} className={fieldLabel}>
            Mensaje al propietario <span className="font-normal text-ink-500">(opcional)</span>
          </label>
          <textarea
            id={`${id}-mensaje`}
            rows={3}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ej.: Llego tipo 10 h, es un auto chico."
            className={`${fieldInput} h-auto py-2`}
          />
          <p className="mt-1 text-xs text-ink-500">
            En la demo el mensaje no se envía. {message.length}/500
          </p>
        </div>
      </Card>

      <Card className="space-y-3 p-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-ink-900">Política de cancelación</span>
          <span className="text-ink-500">A definir</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold text-ink-900">Estado del pago</span>
          <PaymentStatusBadge status="no_disponible" />
        </div>
        <p className="text-ink-500">
          El propietario debe aceptar la solicitud. Los pagos todavía no están disponibles: no
          se te va a cobrar nada.
        </p>
      </Card>

      {tried && (!check.status.ok || vehicleError) && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se puede crear la solicitud: {!check.status.ok ? check.status.label : vehicleError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full">
        Enviar solicitud de demostración
      </Button>
    </form>
  );
}

function RequestResult({ space, data }: { space: Space; data: Submitted }) {
  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        <DemoBadge label="Demostración" />
        <h2
          tabIndex={-1}
          ref={(el) => el?.focus()}
          className="text-xl font-bold text-ink-900 focus:outline-none"
        >
          Solicitud de demostración creada — no se envió a ningún propietario
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-500">Reserva:</span>
          <BookingStatusBadge status="solicitada" />
          <span className="ml-2 text-ink-500">Pago:</span>
          <PaymentStatusBadge status="no_disponible" />
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
          <dt className="text-ink-500">Espacio</dt>
          <dd className="text-ink-900">{space.title}</dd>
          <dt className="text-ink-500">Período</dt>
          <dd className="text-ink-900">{formatRange(data.start, data.end)}</dd>
          <dt className="text-ink-500">Vehículo</dt>
          <dd className="text-ink-900">
            {VEHICLE_LABEL[data.vehicle]}
            {data.plate && ` · ${data.plate}`}
          </dd>
          <dt className="text-ink-500">Total estimado</dt>
          <dd className="font-semibold text-ink-900">{formatARS(data.total)}</dd>
        </dl>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-ink-900">¿Qué pasaría después?</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-700">
          <li>El propietario revisa la solicitud y la acepta o la rechaza.</li>
          <li>
            Si la acepta, la reserva pasa a <strong>confirmada</strong> y vas a ver la dirección
            exacta.
          </li>
          <li>
            El código de llegada aparece desde 2 h antes del inicio, solo para vos y el
            propietario.
          </li>
        </ol>
      </Card>

      <DemoNotice>
        Esta solicitud solo existe en esta pantalla: no se guarda ni aparece en Mis reservas. Ahí
        podés ver reservas de ejemplo.
      </DemoNotice>

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/mis-reservas/" size="lg">
          Ir a Mis reservas
        </ButtonLink>
        <ButtonLink href="/buscar/" variant="secondary" size="lg">
          Seguir buscando
        </ButtonLink>
      </div>
    </div>
  );
}
