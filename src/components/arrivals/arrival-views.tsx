"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Space } from "@/lib/types";
import { DataError, type ArrivalNotice, type BookingAccess, type Requirement, type Vehicle } from "@/lib/data/types";
import { getArrival, getArrivalAccess, notifyArrival, setArrivalStatus, subscribeArrivals } from "@/lib/data/arrivals";
import { getPublishedGarage } from "@/lib/data/garages";
import { REQUIREMENT_LABEL, isInsured, listMyVehicles, myMissingRequirements } from "@/lib/data/profile";
import { useAuth } from "@/lib/auth/auth-provider";
import { liveStatus } from "@/lib/live";
import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/card";
import { ChevronLeftIcon, KeyIcon, PinIcon } from "@/components/ui/icons";
import { MapView } from "@/components/map/map-view";
import { NavigateButtons } from "@/components/garage/navigate-buttons";
import { fitsVehicle } from "@/components/driver/vehicles";
import { useNow } from "@/components/driver/use-now";
import { ErrorBox, RequireSignIn, SuccessBox } from "@/components/my-garages/shared";

const errText = (err: unknown) => (err instanceof DataError ? err.message : "Algo salió mal. Probá de nuevo.");
const ETAS = [5, 10, 15, 20, 30, 45];

export const NOT_A_RESERVATION =
  "Avisar que vas no es una reserva: el lugar no queda guardado. El garaje recibe tu aviso para prepararse.";

// ---------------------------------------------------------------- "Voy a este" (en la ficha)

type DriverState = { state: "loading" } | { state: "error" } | { state: "ready"; missing: Requirement[]; vehicles: Vehicle[] };

/** Panel "Voy a este" de la ficha de un garaje comercial. */
export function ArrivalPanel({ space, autoOpen }: { space: Space; autoOpen: boolean }) {
  const auth = useAuth();
  const router = useRouter();
  const now = useNow();
  const live = liveStatus(space, now);
  const [open, setOpen] = useState(autoOpen);
  const [driver, setDriver] = useState<DriverState>({ state: "loading" });
  const [eta, setEta] = useState(15);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || auth.status !== "signed-in") return;
    let cancelled = false;
    Promise.all([myMissingRequirements("conductor"), listMyVehicles()])
      .then(([missing, vehicles]) => !cancelled && setDriver({ state: "ready", missing, vehicles }))
      .catch(() => !cancelled && setDriver({ state: "error" }));
    return () => {
      cancelled = true;
    };
  }, [open, auth.status]);

  if (!live) return null;
  const here = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";
  const fitting = driver.state === "ready" ? driver.vehicles.filter((v) => fitsVehicle(space.maxVehicle, v.size) && isInsured(v, now ? now.slice(0, 10) : "")) : [];
  const vehicleId = chosen && fitting.some((v) => v.id === chosen) ? chosen : (fitting[0]?.id ?? null);

  async function onConfirm() {
    if (!vehicleId) return;
    setBusy(true);
    setError(null);
    try {
      const id = await notifyArrival(space.id, eta, vehicleId);
      router.push(`/aviso/?id=${id}`);
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-lg font-semibold text-ink-900">¿Vas para allá?</h2>
      {!live.accepting ? (
        <p className="text-sm text-ink-700">
          {live.tone === "none" ? "Ahora no tiene lugar." : "Ahora no está recibiendo conductores."} Probá con otro garaje.
        </p>
      ) : !open ? (
        <>
          <p className="text-sm text-ink-700">Avisale al garaje que vas, así se prepara para recibirte.</p>
          <Button size="lg" onClick={() => setOpen(true)}>
            Voy a este
          </Button>
        </>
      ) : auth.status === "signed-out" ? (
        <ButtonLink href={`/ingresar/?volver=${encodeURIComponent(here)}`} size="lg">
          Ingresá para avisar
        </ButtonLink>
      ) : driver.state === "loading" ? (
        <p className="text-sm text-ink-500">Cargando…</p>
      ) : driver.state === "error" ? (
        <ErrorBox>No pudimos cargar tus datos. Probá de nuevo.</ErrorBox>
      ) : driver.missing.length > 0 ? (
        <div className="rounded-xl border border-accent-300 bg-accent-100 p-3 text-sm text-ink-900">
          <p className="font-semibold">Para avisar que vas, completá tu perfil de conductor:</p>
          <ul className="mt-1 list-disc pl-5">
            {driver.missing.map((m) => (
              <li key={m}>{REQUIREMENT_LABEL[m]}</li>
            ))}
          </ul>
          <ButtonLink href={`/verificacion/?volver=${encodeURIComponent(here)}`} className="mt-3 w-full">
            Completar perfil
          </ButtonLink>
        </div>
      ) : fitting.length === 0 ? (
        <p className="text-sm text-ink-700">
          Ninguno de tus vehículos con seguro vigente entra en este garaje.{" "}
          <Link href="/cuenta/vehiculos/" className="font-semibold text-brand-700 hover:underline">
            Revisá tus vehículos
          </Link>
          .
        </p>
      ) : (
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-900">¿En cuánto llegás?</legend>
            <div className="grid grid-cols-3 gap-2">
              {ETAS.map((m) => (
                <label
                  key={m}
                  className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-ink-200 text-sm font-semibold text-ink-900 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-600 has-[:checked]:text-white"
                >
                  <input type="radio" name="eta" className="sr-only" checked={eta === m} onChange={() => setEta(m)} />
                  {m} min
                </label>
              ))}
            </div>
          </fieldset>
          {fitting.length > 1 ? (
            <label className="text-sm text-ink-700">
              Vas con
              <select
                className="mt-1 block h-11 w-full rounded-xl border border-ink-300 bg-white px-3 text-sm"
                value={vehicleId ?? ""}
                onChange={(e) => setChosen(e.target.value)}
              >
                {fitting.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} · {v.plate}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-ink-700">
              Vas con <strong>{fitting[0].brand} {fitting[0].model}</strong> · {fitting[0].plate}
            </p>
          )}
          <p className="rounded-xl bg-ink-50 p-3 text-xs text-ink-700">{NOT_A_RESERVATION}</p>
          {error && <ErrorBox>{error}</ErrorBox>}
          <Button size="lg" onClick={onConfirm} disabled={busy}>
            {busy ? "Avisando…" : `Avisar que llego en ${eta} min`}
          </Button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-ink-500 hover:underline">
            Cancelar
          </button>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- /aviso/?id=

/** Estado del aviso y qué hacer al llegar. Lee `?id=`: montarlo dentro de <Suspense>. */
export function ArrivalPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <Container className="max-w-2xl pt-4 pb-16">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        <ChevronLeftIcon width={16} height={16} /> Volver al mapa
      </Link>
      <div className="mt-4">
        <RequireSignIn back={`/aviso/?id=${id}`}>{() => <ArrivalLoader key={id} id={id} />}</RequireSignIn>
      </div>
    </Container>
  );
}

const STATUS_TEXT: Record<ArrivalNotice["status"], { title: string; body: string; tone: string }> = {
  en_camino: {
    title: "Aviso enviado",
    body: "El garaje recibió tu aviso. Cuando lo vea, te va a aparecer acá que te espera.",
    tone: "border-brand-200 bg-brand-50 text-ink-900",
  },
  recibido: { title: "El garaje te espera", body: "Vieron tu aviso y se preparan para recibirte.", tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  llego: { title: "¡Llegaste!", body: "El garaje marcó que llegaste.", tone: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  no_hay_lugar: {
    title: "El garaje avisó que no tiene lugar",
    body: "Buscá otro garaje cerca en el mapa.",
    tone: "border-red-200 bg-red-50 text-red-900",
  },
  cancelado: { title: "Aviso cancelado", body: "Le avisamos al garaje que no vas.", tone: "border-ink-200 bg-ink-50 text-ink-900" },
};

function ArrivalLoader({ id }: { id: string }) {
  const [notice, setNotice] = useState<ArrivalNotice | null | undefined>(undefined);
  const [access, setAccess] = useState<BookingAccess | null>(null);
  const [garage, setGarage] = useState<Space | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeArrivals({ id }, () => setVersion((v) => v + 1)), [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const n = await getArrival(id);
      if (!n) return { n, a: null, g: null };
      const [a, g] = await Promise.all([getArrivalAccess(id), getPublishedGarage(n.garageId)]);
      return { n, a, g };
    })()
      .then(({ n, a, g }) => {
        if (cancelled) return;
        setNotice(n);
        setAccess(a);
        if (g) setGarage(g);
      })
      .catch((err) => !cancelled && setError(errText(err)));
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  const marker = useMemo(
    () => (access ? [{ id, position: access.location, label: garage?.title ?? "Garaje", ariaLabel: "Ubicación del garaje", variant: "garage" as const }] : []),
    [access, garage, id],
  );

  async function onCancel() {
    setBusy(true);
    try {
      await setArrivalStatus(id, "cancelado");
      setVersion((v) => v + 1);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (notice === undefined) return <p className="text-sm text-ink-500">Cargando…</p>;
  if (!notice) return <ErrorBox>No encontramos ese aviso.</ErrorBox>;

  const s = STATUS_TEXT[notice.status];
  const active = notice.status === "en_camino" || notice.status === "recibido";
  const eta = new Date(Date.parse(notice.createdAt) + notice.etaMinutes * 60000).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <div className="flex flex-col gap-4">
      <div role="status" aria-live="polite" className={`rounded-2xl border p-4 ${s.tone}`}>
        <p className="text-lg font-semibold">{s.title}</p>
        <p className="text-sm">{s.body}</p>
        {active && <p className="mt-1 text-sm">Llegada estimada: cerca de las {eta}.</p>}
      </div>

      <Card className="flex flex-col gap-1 p-5">
        <h1 className="text-xl font-bold text-ink-900">{garage?.title ?? "Garaje"}</h1>
        <p className="text-sm text-ink-500">
          {notice.car} · {notice.plate}
        </p>
        <p className="mt-2 rounded-xl bg-ink-50 p-3 text-xs text-ink-700">{NOT_A_RESERVATION}</p>
      </Card>

      {access && active && (
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-lg font-semibold text-ink-900">Qué hacer al llegar</h2>
          <p className="flex items-start gap-2 text-ink-900">
            <PinIcon className="mt-0.5 shrink-0 text-brand-600" />
            <span className="font-medium">{access.address}</span>
          </p>
          {access.arrivalInstructions ? (
            <div className="flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-sm text-ink-900">
              <KeyIcon className="mt-0.5 shrink-0 text-brand-600" />
              <p className="whitespace-pre-line">{access.arrivalInstructions}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-700">Presentate en la entrada y decí que avisaste por GuSpot.</p>
          )}
          <div className="relative h-52 overflow-hidden rounded-xl border border-ink-200">
            <MapView
              className="absolute inset-0 h-full w-full"
              markers={marker}
              selectedId={null}
              onSelect={() => {}}
              fitKey={id}
              fallbackCenter={access.location}
              userLocation={null}
            />
          </div>
          <NavigateButtons to={access.location} />
          {garage?.commercial?.contactPhone && (
            <a href={`tel:${garage.commercial.contactPhone}`} className={buttonClass("secondary", "lg")}>
              Llamar al garaje
            </a>
          )}
        </Card>
      )}

      {notice.status === "no_hay_lugar" && <ButtonLink href="/">Buscar otro garaje</ButtonLink>}
      {notice.status === "llego" && <SuccessBox>¡Buen estacionamiento!</SuccessBox>}

      {active && (
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {busy ? "Cancelando…" : "Ya no voy"}
        </Button>
      )}
    </div>
  );
}
