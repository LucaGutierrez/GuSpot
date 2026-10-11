"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { AvailabilityState, CommercialInfo } from "@/lib/types";
import type { ArrivalNotice, ArrivalStatus, OwnerGarage } from "@/lib/data/types";
import { getMyGarage, updateLiveAvailability } from "@/lib/data/garages";
import { listGarageArrivals, setArrivalStatus, subscribeArrivals } from "@/lib/data/arrivals";
import { agoText } from "@/lib/live";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/card";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { ErrorBox, RequireSignIn, errorMessage } from "./shared";

/** /mis-garages/panel/?id= — Lee `?id=`: montarlo dentro de <Suspense>. */
export function OperatorPanelPage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  return (
    <Container className="max-w-2xl pb-16">
      <Link href="/mis-garages/" className="inline-flex items-center gap-1 pt-4 text-sm font-medium text-brand-700 hover:underline">
        <ChevronLeftIcon width={16} height={16} /> Mis garages
      </Link>
      <RequireSignIn back={`/mis-garages/panel/?id=${id}`}>{() => <PanelLoader key={id} id={id} />}</RequireSignIn>
    </Container>
  );
}

function PanelLoader({ id }: { id: string }) {
  const [garage, setGarage] = useState<OwnerGarage | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getMyGarage(id)
      .then((g) => !cancelled && setGarage(g))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id]);
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (garage === undefined) return <p className="pt-6 text-sm text-ink-500">Cargando…</p>;
  if (!garage) return <ErrorBox>No encontramos ese garage entre los tuyos.</ErrorBox>;
  return <Panel garage={garage} />;
}

/** Re-render cada 30 s para que "hace X min" y los tiempos de llegada se actualicen. */
function useTick(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const STATES: { value: AvailabilityState; label: string; tone: string }[] = [
  { value: "disponible", label: "Hay lugar", tone: "has-[:checked]:bg-emerald-600 has-[:checked]:text-white" },
  { value: "pocos", label: "Quedan pocos", tone: "has-[:checked]:bg-amber-400 has-[:checked]:text-ink-900" },
  { value: "sin_lugar", label: "Sin lugar", tone: "has-[:checked]:bg-red-600 has-[:checked]:text-white" },
  { value: "cerrado", label: "Cerrado", tone: "has-[:checked]:bg-ink-700 has-[:checked]:text-white" },
];

function Panel({ garage }: { garage: OwnerGarage }) {
  const now = useTick();
  const [live, setLive] = useState<CommercialInfo>(garage.live);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const capacity = garage.capacity ?? null;

  async function save(patch: Partial<Pick<CommercialInfo, "availableSpots" | "state" | "acceptingDrivers">>) {
    setBusy(true);
    setError(null);
    const previous = live;
    setLive((l) => ({ ...l, ...patch }));
    try {
      setLive(await updateLiveAvailability(garage.id, patch));
    } catch (err) {
      setLive(previous);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const spots = live.availableSpots;
  const step = (delta: number) => {
    const base = spots ?? 0;
    const next = Math.max(0, capacity ? Math.min(capacity, base + delta) : base + delta);
    const state: AvailabilityState | undefined =
      next === 0 ? "sin_lugar" : live.state === "sin_lugar" || live.state === "cerrado" ? "disponible" : undefined;
    save({ availableSpots: next, ...(state ? { state } : {}) });
  };
  const minutesAgo = live.updatedAt ? Math.max(0, Math.round((now - Date.parse(live.updatedAt)) / 60000)) : null;

  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{garage.title}</h1>
          <p className="text-sm text-ink-500">
            Panel del garage · {garage.status === "publicado" ? "Publicado" : garage.status === "pausado" ? "Pausado" : "Borrador (no se ve en el mapa)"}
          </p>
        </div>
        <ButtonLink href={`/mis-garages/editar/?id=${garage.id}`} variant="secondary">
          Horario, tarifa y datos
        </ButtonLink>
      </div>

      <Card className="flex flex-col gap-5 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink-900">Lugares libres</h2>
          <p className={`text-xs ${minutesAgo !== null && minutesAgo > 30 ? "font-semibold text-amber-900" : "text-ink-500"}`}>
            {minutesAgo === null ? "Nunca actualizado" : `Actualizado ${agoText(minutesAgo)}`}
          </p>
        </div>

        {spots !== null ? (
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={busy || spots <= 0}
              aria-label="Restar un lugar"
              className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-100 text-3xl font-bold text-ink-900 hover:bg-ink-200 disabled:opacity-40"
            >
              −
            </button>
            <div className="min-w-28 text-center" aria-live="polite">
              <p className="text-5xl font-bold tabular-nums text-ink-900">{spots}</p>
              <p className="text-sm text-ink-500">{capacity ? `de ${capacity} lugares` : "lugares"}</p>
            </div>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={busy || (capacity !== null && spots >= capacity)}
              aria-label="Sumar un lugar"
              className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-600 text-3xl font-bold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              +
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-ink-700">No estás informando una cantidad exacta: los conductores ven solo el estado.</p>
            <Button onClick={() => save({ availableSpots: capacity ?? 0 })} disabled={busy}>
              Informar cantidad de lugares
            </Button>
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-900">Estado rápido</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATES.map((s) => (
              <label
                key={s.value}
                className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-ink-200 px-2 text-center text-sm font-semibold text-ink-900 ${s.tone}`}
              >
                <input
                  type="radio"
                  name="estado"
                  className="sr-only"
                  checked={live.state === s.value}
                  onChange={() => save({ state: s.value })}
                  disabled={busy}
                />
                {s.label}
              </label>
            ))}
          </div>
        </fieldset>

        {spots !== null && (
          <button
            type="button"
            onClick={() => save({ availableSpots: null })}
            disabled={busy}
            className="w-fit text-xs font-semibold text-ink-500 underline-offset-2 hover:underline"
          >
            No informar cantidad exacta (mostrar solo el estado)
          </button>
        )}

        <label className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 p-3">
          <span>
            <span className="block text-sm font-semibold text-ink-900">Recibir conductores</span>
            <span className="block text-xs text-ink-500">
              Pausalo si tenés un problema: no vas a recibir avisos de llegada ni reservas nuevas.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={live.acceptingDrivers}
            onChange={(e) => save({ acceptingDrivers: e.target.checked })}
            disabled={busy}
            className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-ink-300 transition-colors before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-white before:transition-transform checked:bg-emerald-600 checked:before:translate-x-5.5"
          />
        </label>
        {error && <ErrorBox>{error}</ErrorBox>}
      </Card>

      <Arrivals garageId={garage.id} now={now} />
    </div>
  );
}

const ARRIVAL_LABEL: Record<ArrivalStatus, string> = {
  en_camino: "En camino",
  recibido: "Lo esperás",
  llego: "Llegó",
  cancelado: "Canceló",
  no_hay_lugar: "Sin lugar",
};

function Arrivals({ garageId, now }: { garageId: string; now: number }) {
  const [items, setItems] = useState<ArrivalNotice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => subscribeArrivals({ garageId }, () => setVersion((v) => v + 1)), [garageId]);

  useEffect(() => {
    let cancelled = false;
    listGarageArrivals(garageId)
      .then((list) => !cancelled && setItems(list))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [garageId, version]);

  async function act(id: string, status: ArrivalStatus) {
    setBusyId(id);
    setError(null);
    try {
      await setArrivalStatus(id, status);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const active = items?.filter((a) => a.status === "en_camino" || a.status === "recibido") ?? [];
  const done = items?.filter((a) => !active.includes(a)) ?? [];

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">
          Conductores en camino {active.length > 0 && <span className="text-brand-700">({active.length})</span>}
        </h2>
        <p className="text-xs text-ink-500">
          Llegan al instante mientras tengas esta pantalla abierta. Un aviso no es una reserva: el conductor solo te
          avisa que va.
        </p>
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {items === null ? (
        <p className="text-sm text-ink-500">Cargando…</p>
      ) : active.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-300 p-4 text-center text-sm text-ink-500">
          Nadie avisó que viene por ahora.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {active.map((a) => {
            const eta = Date.parse(a.createdAt) + a.etaMinutes * 60000;
            const left = Math.round((eta - now) / 60000);
            const at = new Date(eta).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires" });
            return (
              <li key={a.id} className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{a.driverName || "Conductor"}</p>
                    <p className="text-sm text-ink-700">
                      {a.car} · <span className="font-mono font-semibold">{a.plate}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink-900">{left > 0 ? `Llega en ~${left} min` : "Debería estar llegando"}</p>
                    <p className="text-xs text-ink-500">cerca de las {at} · {ARRIVAL_LABEL[a.status]}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.status === "en_camino" && (
                    <Button onClick={() => act(a.id, "recibido")} disabled={busyId === a.id}>
                      Te esperamos
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => act(a.id, "llego")} disabled={busyId === a.id}>
                    Llegó
                  </Button>
                  <Button variant="secondary" onClick={() => act(a.id, "no_hay_lugar")} disabled={busyId === a.id}>
                    No hay lugar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {done.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-ink-700">Avisos anteriores ({done.length})</summary>
          <ul className="mt-2 divide-y divide-ink-100">
            {done.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 py-2 text-ink-700">
                <span>
                  {a.driverName || "Conductor"} · {a.plate}
                </span>
                <span className="text-ink-500">{ARRIVAL_LABEL[a.status]}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
