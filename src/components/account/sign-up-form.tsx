"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH, signUp, type AuthResult } from "@/lib/auth/actions";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignUpForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("volver"));
  const auth = useRedirectWhenSignedIn(next);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function validate(): string | null {
    if (!name.trim()) return "Contanos tu nombre.";
    if (!EMAIL_RE.test(email.trim())) return "Revisá el email: no parece válido.";
    if (password.length < PASSWORD_MIN_LENGTH)
      return `La contraseña tiene que tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const error = validate();
    if (error) {
      setResult({ ok: false, message: error });
      return;
    }
    setBusy(true);
    setResult(null);
    const r = await signUp(email, password, name);
    setBusy(false);
    if (r.ok && r.message) setSentTo(email.trim());
    setResult(r);
  }

  if (sentTo) {
    return (
      <AuthCard title="Revisá tu email">
        <div className="space-y-4 text-sm text-ink-700">
          <p>
            Te enviamos un enlace a <strong className="text-ink-900">{sentTo}</strong> para confirmar tu
            cuenta. Abrilo desde este mismo navegador.
          </p>
          <p className="text-ink-500">
            Si no llega en unos minutos, revisá la carpeta de spam. Si ya tenías una cuenta con ese email,
            probá <TextLink href="/ingresar/">ingresar</TextLink> o{" "}
            <TextLink href="/recuperar/">recuperar la contraseña</TextLink>.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Crear cuenta" subtitle="Para publicar tu cochera y, más adelante, reservar.">
      {auth.status === "disabled" ? (
        <AccountsDisabled />
      ) : auth.status === "loading" || auth.status === "signed-in" ? (
        <Loading />
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field
            id="crear-nombre"
            label="Nombre"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            hint="Es el nombre que van a ver los demás usuarios."
            required
          />
          <Field
            id="crear-email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            id="crear-clave"
            label="Contraseña"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={`Al menos ${PASSWORD_MIN_LENGTH} caracteres.`}
            required
          />
          <ShowPassword checked={show} onChange={setShow} />
          <FormMessage result={result} />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
          <p className="text-xs text-ink-500">
            Los términos de uso y la política de privacidad están a definir.
          </p>
          <p className="text-center text-sm text-ink-500">
            ¿Ya tenés cuenta? <TextLink href="/ingresar/">Ingresá</TextLink>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
