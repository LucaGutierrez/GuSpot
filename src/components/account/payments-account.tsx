"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  disconnectPayments,
  finishConnect,
  getMyPaymentAccount,
  getPaymentSettings,
  startConnect,
  type PaymentAccount,
} from "@/lib/data/payments";
import { Button } from "@/components/ui/button";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { BackToAccount } from "@/components/account/account-panel";
import { ErrorBox, RequireSignIn, SuccessBox, errorMessage } from "@/components/my-garages/shared";

type Load<T> = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; data: T };

function useAccount(tick: number) {
  const [load, setLoad] = useState<Load<PaymentAccount>>({ state: "loading" });
  useEffect(() => {
    let cancelled = false;
    getMyPaymentAccount()
      .then((data) => !cancelled && setLoad({ state: "ready", data }))
      .catch((err) => !cancelled && setLoad({ state: "error", message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [tick]);
  return load;
}

function useFeePercent() {
  const [percent, setPercent] = useState<number | null>(null);
  useEffect(() => {
    getPaymentSettings().then((s) => setPercent(s.serviceFeePercent));
  }, []);
  return percent;
}

/** Tarjeta "Cobro de reservas": conectar o ver la cuenta de Mercado Pago. */
export function PaymentsCard({ compact = false }: { compact?: boolean }) {
  const [tick, setTick] = useState(0);
  const load = useAccount(tick);
  const percent = useFeePercent();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function onConnect() {
    setBusy(true);
    setError(null);
    try {
      window.location.assign(await startConnect());
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function onDisconnect() {
    setBusy(true);
    setError(null);
    try {
      await disconnectPayments();
      setConfirming(false);
      setTick((t) => t + 1);
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy(false);
  }

  if (load.state === "loading") return <p className="text-sm text-ink-500">Cargando cobros…</p>;
  if (load.state === "error") return <ErrorBox>{load.message}</ErrorBox>;
  const acc = load.data;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink-900">Cobro de reservas</h2>
        {acc.connected ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-semibold text-emerald-800">
            Mercado Pago conectado ✓
          </span>
        ) : (
          <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-sm font-semibold text-ink-700">Sin conectar</span>
        )}
      </div>

      {acc.connected ? (
        <p className="text-sm text-ink-700">
          Las reservas se pagan al reservar y la plata entra directo en tu cuenta de Mercado Pago.
          {!acc.liveMode && " (Cuenta de prueba: los pagos no son reales.)"}
        </p>
      ) : (
        <p className="text-sm text-ink-700">
          Para recibir reservas, conectá tu cuenta de Mercado Pago. El conductor paga al reservar y la plata entra directo
          en tu cuenta. {!compact && "Si no la conectás, los conductores igual pueden avisarte que van en camino."}
        </p>
      )}

      {!compact && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-500">
          <li>Recibís tu tarifa completa, menos la comisión de Mercado Pago.</li>
          <li>
            GuSpot le cobra al conductor un cargo de servicio
            {percent !== null ? ` del ${percent} %` : ""} aparte, que se le muestra antes de pagar.
          </li>
          <li>GuSpot nunca ve tus claves ni tu saldo.</li>
        </ul>
      )}

      {error && <ErrorBox>{error}</ErrorBox>}

      {acc.connected ? (
        compact ? null : confirming ? (
          <div className="flex flex-col gap-2 rounded-xl bg-ink-50 p-3">
            <p className="text-sm text-ink-700">Si desconectás Mercado Pago, tus garages dejan de recibir reservas.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDisconnect}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Desconectando…" : "Sí, desconectar"}
              </button>
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
                Volver
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              Desconectar Mercado Pago
            </Button>
          </div>
        )
      ) : (
        <div>
          <Button onClick={onConnect} disabled={busy}>
            {busy ? "Abriendo Mercado Pago…" : "Conectar Mercado Pago"}
          </Button>
        </div>
      )}
      {compact && (
        <Link href="/cuenta/cobros/" className="text-sm font-semibold text-brand-700 hover:underline">
          Ver cómo funcionan los cobros
        </Link>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- /cuenta/cobros/

/** Página de cobros (Tu cuenta); también recibe la vuelta de Mercado Pago (?code=&state=). Montar dentro de <Suspense>. */
export function PaymentsPage() {
  const params = useSearchParams();
  const code = params.get("code");
  const state = params.get("state") ?? "";
  const denied = params.has("error");
  return (
    <Container className="max-w-2xl pb-12">
      <BackToAccount />
      <PageHeader title="Cobros con Mercado Pago" subtitle="Cómo te pagan las reservas de tus garages." />
      <RequireSignIn back="/cuenta/cobros/">
        {() => (code ? <FinishConnect code={code} state={state} /> : <Overview denied={denied} />)}
      </RequireSignIn>
    </Container>
  );
}

function Overview({ denied }: { denied: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {denied && <ErrorBox>No se conectó la cuenta de Mercado Pago. Podés intentarlo de nuevo cuando quieras.</ErrorBox>}
      <PaymentsCard />
    </div>
  );
}

function FinishConnect({ code, state }: { code: string; state: string }) {
  const [result, setResult] = useState<{ ok: true } | { ok: false; message: string } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Un código sirve una sola vez (y React puede montar dos veces en desarrollo).
    if (started.current) return;
    started.current = true;
    finishConnect(code, state)
      .then(() => setResult({ ok: true }))
      .catch((err) => setResult({ ok: false, message: errorMessage(err) }))
      .finally(() => window.history.replaceState(null, "", "/cuenta/cobros/"));
  }, [code, state]);

  if (!result) return <p className="text-sm text-ink-500">Conectando tu cuenta de Mercado Pago…</p>;
  return (
    <div className="flex flex-col gap-4">
      {result.ok ? (
        <SuccessBox>¡Listo! Tu cuenta de Mercado Pago quedó conectada. Ya podés recibir reservas pagas.</SuccessBox>
      ) : (
        <ErrorBox>{result.message}</ErrorBox>
      )}
      <PaymentsCard />
    </div>
  );
}

// ---------------------------------------------------------------- /mis-garages/cobros/

/**
 * Dirección de vuelta registrada en la app de Mercado Pago (OAuth). Solo pasa
 * el código a /cuenta/cobros/, donde está la pantalla de cobros.
 */
export function PaymentsReturnRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();
  useEffect(() => {
    router.replace(`/cuenta/cobros/${query ? `?${query}` : ""}`);
  }, [router, query]);
  return <p className="px-4 pt-6 text-sm text-ink-500">Volviendo a GuSpot…</p>;
}
