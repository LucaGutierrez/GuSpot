"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { signIn, type AuthResult } from "@/lib/auth/actions";
import {
  AccountsDisabled,
  AuthCard,
  Field,
  FormMessage,
  Loading,
  ShowPassword,
  TextLink,
  safeNext,
  useRedirectWhenSignedIn,
} from "./form-parts";

export function SignInForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("volver"));
  const confirmed = params.get("confirmado") === "1";
  const auth = useRedirectWhenSignedIn(next);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setResult({ ok: false, message: "Completá tu email y tu contraseña." });
      return;
    }
    setBusy(true);
    setResult(null);
    const r = await signIn(email, password);
    setBusy(false);
    // Si salió bien, el cambio de sesión dispara la redirección.
    if (!r.ok) setResult(r);
  }

  const withNext = (path: string) => (next === "/cuenta/" ? path : `${path}?volver=${encodeURIComponent(next)}`);

  return (
    <AuthCard title="Ingresar" subtitle="Entrá a tu cuenta de GuSpot.">
      {auth.status === "disabled" ? (
        <AccountsDisabled />
      ) : auth.status === "loading" || auth.status === "signed-in" ? (
        <Loading />
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {confirmed && (
            <FormMessage result={{ ok: true, message: "Tu email quedó confirmado. Ingresá con tu email y contraseña." }} />
          )}
          <Field
            id="ingresar-email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            id="ingresar-clave"
            label="Contraseña"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex flex-wrap items-center justify-between gap-2 [&>label]:shrink-0">
            <ShowPassword checked={show} onChange={setShow} />
            <TextLink href="/recuperar/">¿Olvidaste tu contraseña?</TextLink>
          </div>
          <FormMessage result={result} />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Ingresando…" : "Ingresar"}
          </Button>
          <p className="text-center text-sm text-ink-500">
            ¿No tenés cuenta? <TextLink href={withNext("/crear-cuenta/")}>Creá una</TextLink>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
