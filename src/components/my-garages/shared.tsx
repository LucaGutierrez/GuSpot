"use client";

import { useState, type ReactNode } from "react";
import type { ListingStatus } from "@/lib/types";
import { DataError } from "@/lib/data/types";
import { setGarageStatus } from "@/lib/data/garages";
import { useAuth, type AuthUser } from "@/lib/auth/auth-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingStatusBadge } from "@/components/ui/badge";
import { DemoNotice } from "@/components/ui/demo-notice";

export function errorMessage(err: unknown): string {
  return err instanceof DataError ? err.message : "Algo salió mal. Probá de nuevo en unos minutos.";
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {children}
    </p>
  );
}

export function SuccessBox({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      {children}
    </p>
  );
}

/** Muestra `children` solo con sesión; si no, explica qué hacer. */
export function RequireSignIn({ back, children }: { back: string; children: (user: AuthUser) => ReactNode }) {
  const auth = useAuth();
  if (auth.status === "disabled") {
    return (
      <div className="space-y-4">
        <DemoNotice title="Las cuentas no están disponibles en esta versión">
          Esta copia del sitio no está conectada al servidor: no se pueden usar cuentas.
        </DemoNotice>
      </div>
    );
  }
  if (auth.status === "loading") return <p className="text-sm text-ink-500">Cargando…</p>;
  if (auth.status === "signed-out") {
    const volver = `?volver=${encodeURIComponent(back)}`;
    return (
      <Card className="space-y-4 p-5">
        <p className="text-ink-700">Para seguir, ingresá a tu cuenta o creá una.</p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/ingresar/${volver}`}>Ingresar</ButtonLink>
          <ButtonLink href={`/crear-cuenta/${volver}`} variant="secondary">
            Crear cuenta
          </ButtonLink>
        </div>
      </Card>
    );
  }
  return <>{children(auth.user)}</>;
}

const HELP: Record<ListingStatus, string> = {
  publicado: "Aparece en la búsqueda para todos.",
  pausado: "No aparece en la búsqueda. Podés reanudarlo cuando quieras.",
  borrador: "Solo lo ves vos. Publicalo cuando esté listo.",
};

/** Estado de la publicación con el botón para cambiarlo (se guarda en la base). */
export function StatusControl({
  garageId,
  status,
  onChange,
  compact = false,
}: {
  garageId: string;
  status: ListingStatus;
  onChange: (s: ListingStatus) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next: ListingStatus = status === "publicado" ? "pausado" : "publicado";
  const label = status === "publicado" ? "Pausar" : status === "pausado" ? "Reanudar" : "Publicar";

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      await setGarageStatus(garageId, next);
      onChange(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <ListingStatusBadge status={status} />
          {!compact && <p className="text-sm text-ink-500">{HELP[status]}</p>}
        </div>
        <Button variant={status === "publicado" ? "secondary" : "primary"} onClick={onClick} disabled={busy}>
          {busy ? "Guardando…" : label}
        </Button>
      </div>
      {error && (
        <ErrorBox>
          {error}
          {error.includes("verificá tu identidad") && (
            <>
              {" "}
              <a href="/verificacion/" className="font-semibold underline">
                Ir a verificación
              </a>
            </>
          )}
        </ErrorBox>
      )}
    </div>
  );
}
