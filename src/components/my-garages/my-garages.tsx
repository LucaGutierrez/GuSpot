"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { OwnerGarage } from "@/lib/data/types";
import { getMyGarage, listMyGarages } from "@/lib/data/garages";
import { formatARS } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { SpacePhoto } from "@/components/ui/space-photo";
import { PlusIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { PhotoPlaceholder } from "@/components/my-garages/photo-placeholder";
import { GarageEditor } from "./garage-editor";
import { OwnerBookingsSection } from "@/components/bookings/booking-views";
import { ErrorBox, RequireSignIn, StatusControl, errorMessage } from "./shared";

type Load<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: T };

// ---------------------------------------------------------------- /mis-garages/

export function MyGaragesPage() {
  return (
    <Container className="max-w-4xl pb-12">
      <PageHeader title="Mis garajes" subtitle="Actualizá tu disponibilidad y recibí a los conductores que van en camino.">
        <ButtonLink href="/publicar/">
          <PlusIcon width={18} height={18} /> Nuevo garaje
        </ButtonLink>
      </PageHeader>
      <RequireSignIn back="/mis-garages/">
        {() => (
          <>
            <GarageList />
            <OwnerBookingsSection />
          </>
        )}
      </RequireSignIn>
    </Container>
  );
}

function GarageList() {
  const [load, setLoad] = useState<Load<OwnerGarage[]>>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    listMyGarages()
      .then((data) => !cancelled && setLoad({ state: "ready", data }))
      .catch((err) => !cancelled && setLoad({ state: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (load.state === "loading") return <p className="text-sm text-ink-500">Cargando tus garajes…</p>;
  if (load.state === "error") return <ErrorBox>{load.message}</ErrorBox>;
  if (load.data.length === 0)
    return (
      <EmptyState>
        Todavía no cargaste ningún garaje.{" "}
        <Link href="/publicar/" className="font-semibold text-brand-700 hover:underline">
          Publicá el primero
        </Link>
        .
      </EmptyState>
    );

  function setStatus(id: string, status: OwnerGarage["status"]) {
    setLoad((l) =>
      l.state === "ready" ? { ...l, data: l.data.map((g) => (g.id === id ? { ...g, status } : g)) } : l,
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {load.data.map((g) => (
        <li key={g.id}>
          <Card className="flex h-full flex-col overflow-hidden">
            {g.photos[0] ? (
              <SpacePhoto variant="garage" url={g.photos[0].url} label={g.title} className="aspect-[16/9] w-full" />
            ) : (
              <PhotoPlaceholder className="aspect-[16/9] w-full" />
            )}
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <h2 className="font-semibold text-ink-900">{g.title}</h2>
                <p className="text-sm text-ink-500">
                  {[g.neighborhood, g.city].filter(Boolean).join(", ")} ·{" "}
                  <span className="font-medium text-ink-700">{formatARS(g.hourlyPrice)}</span> / hora
                </p>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <p className="text-sm text-ink-700">
                  {g.live.availableSpots !== null
                    ? `${g.live.availableSpots} de ${g.capacity ?? "?"} lugares libres`
                    : "Sin cantidad informada"}
                  {!g.live.acceptingDrivers && " · Recepción pausada"}
                </p>
                <StatusControl garageId={g.id} status={g.status} onChange={(s) => setStatus(g.id, s)} compact />
                <div className="grid grid-cols-2 gap-2">
                  <ButtonLink href={`/mis-garages/panel/?id=${g.id}`}>Abrir panel</ButtonLink>
                  <ButtonLink href={`/mis-garages/editar/?id=${g.id}`} variant="secondary">
                    Editar datos
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- /mis-garages/nuevo/

export function NewGaragePage() {
  return (
    <Container className="max-w-3xl">
      <RequireSignIn back="/mis-garages/nuevo/">{() => <GarageEditor garage={null} />}</RequireSignIn>
    </Container>
  );
}

// ---------------------------------------------------------------- /mis-garages/editar/?id=

/** Lee `?id=`; debe renderizarse dentro de <Suspense>. */
export function EditGaragePage() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const justCreated = params.get("nuevo") === "1";
  return (
    <Container className="max-w-3xl">
      <RequireSignIn back={`/mis-garages/editar/?id=${id}`}>
        {() => <EditLoader key={id} id={id} justCreated={justCreated} />}
      </RequireSignIn>
    </Container>
  );
}

function EditLoader({ id, justCreated }: { id: string; justCreated: boolean }) {
  const [load, setLoad] = useState<Load<OwnerGarage | null>>(
    id ? { state: "loading" } : { state: "ready", data: null },
  );

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getMyGarage(id)
      .then((data) => !cancelled && setLoad({ state: "ready", data }))
      .catch((err) => !cancelled && setLoad({ state: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (load.state === "loading") return <p className="pt-6 text-sm text-ink-500">Cargando garaje…</p>;
  if (load.state === "error")
    return (
      <div className="pt-6">
        <ErrorBox>{load.message}</ErrorBox>
      </div>
    );
  if (!load.data)
    return (
      <div className="flex flex-col gap-4 pt-6">
        <ErrorBox>No encontramos ese garaje entre los tuyos.</ErrorBox>
        <ButtonLink href="/mis-garages/" variant="secondary" className="w-fit">
          Volver a mis garajes
        </ButtonLink>
      </div>
    );
  return <GarageEditor garage={load.data} justCreated={justCreated} />;
}
