"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { ParkingIcon, ShieldIcon } from "@/components/ui/icons";
import { useAuth, type AuthUser } from "@/lib/auth/auth-provider";
import {
  PASSWORD_MIN_LENGTH,
  signOut,
  updateDisplayName,
  updatePassword,
  type AuthResult,
} from "@/lib/auth/actions";
import { AccountsDisabled, Field, FormMessage, Loading, ShowPassword } from "./form-parts";

export function AccountPanel() {
  const auth = useAuth();

  return (
    <Container className="max-w-3xl pb-12">
      <PageHeader title="Tu cuenta" />
      {auth.status === "disabled" ? (
        <Card className="p-5">
          <AccountsDisabled />
        </Card>
      ) : auth.status === "loading" ? (
        <Loading />
      ) : auth.status === "signed-out" ? (
        <Card className="space-y-4 p-5">
          <p className="text-ink-700">Ingresá o creá una cuenta para publicar tu cochera.</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/ingresar/">Ingresar</ButtonLink>
            <ButtonLink href="/crear-cuenta/" variant="secondary">
              Crear cuenta
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <SignedIn user={auth.user} />
      )}
    </Container>
  );
}

function SignedIn({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function onSignOut() {
    setLeaving(true);
    await signOut();
    router.replace("/");
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <ParkingIcon />
          </span>
          <div>
            <p className="font-semibold text-ink-900">Mis garages</p>
            <p className="text-sm text-ink-500">Publicá y administrá tus cocheras.</p>
          </div>
        </div>
        <ButtonLink href="/mis-garages/">Ir a mis garages</ButtonLink>
      </Card>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <ShieldIcon />
          </span>
          <div>
            <p className="font-semibold text-ink-900">Verificación de identidad</p>
            <p className="text-sm text-ink-500">DNI, selfie, licencia y vehículos. Necesaria para reservar y publicar.</p>
          </div>
        </div>
        <ButtonLink href="/verificacion/" variant="secondary">
          Verificarme
        </ButtonLink>
      </Card>

      <NameForm user={user} />
      <PasswordForm />

      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-500">
          Sesión iniciada como <strong className="text-ink-900">{user.email}</strong>
        </p>
        <Button variant="secondary" onClick={onSignOut} disabled={leaving}>
          {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
        </Button>
      </Card>
    </div>
  );
}

function NameForm({ user }: { user: AuthUser }) {
  const [name, setName] = useState(user.displayName);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setResult({ ok: false, message: "El nombre no puede quedar vacío." });
      return;
    }
    setBusy(true);
    setResult(await updateDisplayName(name));
    setBusy(false);
  }

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <h2 className="text-lg font-semibold text-ink-900">Tus datos</h2>
        <Field
          id="cuenta-nombre"
          label="Nombre"
          autoComplete="name"
          value={name}
          maxLength={60}
          onChange={(e) => {
            setName(e.target.value);
            setResult(null);
          }}
          hint="Es el nombre que van a ver los demás usuarios."
        />
        <FormMessage result={result} />
        <Button type="submit" disabled={busy || name.trim() === user.displayName}>
          {busy ? "Guardando…" : "Guardar"}
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
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
    const r = await updatePassword(password);
    setBusy(false);
    setResult(r);
    if (r.ok) setPassword("");
  }

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <h2 className="text-lg font-semibold text-ink-900">Cambiar contraseña</h2>
        <Field
          id="cuenta-clave"
          label="Contraseña nueva"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setResult(null);
          }}
          hint={`Al menos ${PASSWORD_MIN_LENGTH} caracteres.`}
        />
        <ShowPassword checked={show} onChange={setShow} />
        <FormMessage result={result} />
        <Button type="submit" disabled={busy || !password}>
          {busy ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </form>
    </Card>
  );
}
