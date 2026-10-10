"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-provider";
import { PASSWORD_MIN_LENGTH, requestPasswordReset, updatePassword, type AuthResult } from "@/lib/auth/actions";
import { AccountsDisabled, AuthCard, Field, FormMessage, Loading, ShowPassword, TextLink } from "./form-parts";

/** /recuperar/: pide el enlace para crear una contraseña nueva. */
export function RequestResetForm() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setResult({ ok: false, message: "Escribí el email de tu cuenta." });
      return;
    }
    setBusy(true);
    setResult(null);
    setResult(await requestPasswordReset(email));
    setBusy(false);
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Te enviamos un enlace para crear una contraseña nueva."
    >
      {auth.status === "disabled" ? (
        <AccountsDisabled />
      ) : result?.ok ? (
        <div className="space-y-4">
          <FormMessage result={result} />
          <p className="text-sm text-ink-500">
            Abrí el enlace desde este mismo navegador. Si no llega, revisá la carpeta de spam.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field
            id="recuperar-email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <FormMessage result={result} />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Enviando…" : "Enviar enlace"}
          </Button>
          <p className="text-center text-sm text-ink-500">
            <TextLink href="/ingresar/">Volver a ingresar</TextLink>
          </p>
        </form>
      )}
    </AuthCard>
  );
}

/**
 * /recuperar/nueva/: destino del enlace del email. El cliente de Supabase canjea
 * el código de la URL y abre la sesión; con sesión se puede fijar la contraseña.
 */
export function NewPasswordForm() {
  const auth = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < PASSWORD_MIN_LENGTH) {
      setResult({ ok: false, message: `La contraseña tiene que tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` });
      return;
    }
    setBusy(true);
    setResult(null);
    const r = await updatePassword(password);
    setBusy(false);
    setResult(r);
    if (r.ok) setTimeout(() => router.replace("/cuenta/"), 1500);
  }

  return (
    <AuthCard title="Nueva contraseña">
      {auth.status === "disabled" ? (
        <AccountsDisabled />
      ) : auth.status === "loading" ? (
        <Loading />
      ) : auth.status === "signed-out" ? (
        <div className="space-y-4 text-sm text-ink-700">
          <FormMessage
            result={{
              ok: false,
              message: "El enlace no es válido o ya venció. Pedí uno nuevo y abrilo desde este mismo navegador.",
            }}
          />
          <ButtonLink href="/recuperar/" className="w-full">
            Pedir un enlace nuevo
          </ButtonLink>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <p className="text-sm text-ink-500">
            Cuenta: <strong className="text-ink-900">{auth.user.email}</strong>
          </p>
          <Field
            id="nueva-clave"
            label="Contraseña nueva"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={`Al menos ${PASSWORD_MIN_LENGTH} caracteres.`}
            required
          />
          <ShowPassword checked={show} onChange={setShow} />
          <FormMessage result={result} />
          <Button type="submit" size="lg" className="w-full" disabled={busy || result?.ok === true}>
            {busy ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
