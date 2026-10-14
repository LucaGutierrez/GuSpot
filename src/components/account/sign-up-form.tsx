"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PASSWORD_HINT, passwordProblem, signUp, type AuthResult } from "@/lib/auth/actions";
import { normalizePhone } from "@/lib/data/profile";
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
import { SocialButtons } from "./social-buttons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_RE = /^[\p{L}][\p{L}' -]*$/u;

type Form = {
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string;
  phone: string;
  email: string;
  password: string;
  password2: string;
};

const EMPTY: Form = { firstName: "", lastName: "", dni: "", birthDate: "", phone: "", email: "", password: "", password2: "" };

function isAdult(date: string): boolean {
  const birth = new Date(`${date}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return false;
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 18);
  return birth <= limit;
}

/** Errores por campo (vacío si está todo bien). */
function validate(f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {};
  if (!NAME_RE.test(f.firstName.trim())) e.firstName = "Escribí tu nombre como figura en el DNI.";
  if (!NAME_RE.test(f.lastName.trim())) e.lastName = "Escribí tu apellido como figura en el DNI.";
  if (!/^\d{7,8}$/.test(f.dni.replace(/\D/g, ""))) e.dni = "El DNI tiene que tener 7 u 8 números.";
  if (!f.birthDate) e.birthDate = "Indicá tu fecha de nacimiento.";
  else if (!isAdult(f.birthDate)) e.birthDate = "Tenés que tener 18 años o más.";
  const phoneDigits = normalizePhone(f.phone).replace(/\D/g, "");
  if (phoneDigits.length < 12 || phoneDigits.length > 15) e.phone = "Escribí tu celular con código de área (ej.: 11 2345 6789).";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Revisá el email: no parece válido.";
  const passwordError = passwordProblem(f.password);
  if (passwordError) e.password = passwordError;
  if (f.password2 !== f.password) e.password2 = "Las contraseñas no coinciden.";
  return e;
}

export function SignUpForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("volver"));
  const auth = useRedirectWhenSignedIn(next);

  const [form, setForm] = useState<Form>(EMPTY);
  const [tried, setTried] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const errors = tried ? validate(form) : {};
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    const found = validate(form);
    if (Object.keys(found).length) {
      setResult({ ok: false, message: "Revisá los datos marcados." });
      return;
    }
    setBusy(true);
    setResult(null);
    const r = await signUp({
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      dni: form.dni.replace(/\D/g, ""),
      birthDate: form.birthDate,
      phone: normalizePhone(form.phone),
    });
    setBusy(false);
    if (r.ok && r.message) setSentTo(form.email.trim());
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

  const err = (k: keyof Form) =>
    errors[k] ? (
      <p id={`crear-${k}-error`} className="mt-1 text-xs font-medium text-red-700">
        {errors[k]}
      </p>
    ) : null;

  return (
    <AuthCard title="Crear cuenta" subtitle="Tus datos tal como figuran en tu DNI. Los usamos para verificar tu identidad.">
      {auth.status === "disabled" ? (
        <AccountsDisabled />
      ) : auth.status === "loading" || auth.status === "signed-in" ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          <SocialButtons next={next} separator="o creá tu cuenta con tu email" />
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Field id="crear-nombre" label="Nombre" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} maxLength={60} aria-invalid={!!errors.firstName} required />
              {err("firstName")}
            </div>
            <div>
              <Field id="crear-apellido" label="Apellido" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} maxLength={60} aria-invalid={!!errors.lastName} required />
              {err("lastName")}
            </div>
            <div>
              <Field id="crear-dni" label="Número de DNI" inputMode="numeric" placeholder="Sin puntos" value={form.dni} onChange={set("dni")} maxLength={10} aria-invalid={!!errors.dni} required />
              {err("dni")}
            </div>
            <div>
              <Field id="crear-nacimiento" label="Fecha de nacimiento" type="date" autoComplete="bday" value={form.birthDate} onChange={set("birthDate")} aria-invalid={!!errors.birthDate} required />
              {err("birthDate")}
            </div>
          </div>
          <div>
            <Field
              id="crear-celular"
              label="Celular"
              type="tel"
              autoComplete="tel"
              placeholder="11 2345 6789"
              value={form.phone}
              onChange={set("phone")}
              hint="Con código de área. Pronto lo vas a confirmar con un código por SMS."
              aria-invalid={!!errors.phone}
              required
            />
            {err("phone")}
          </div>
          <div>
            <Field id="crear-email" label="Email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} required />
            {err("email")}
          </div>
          <div>
            <Field
              id="crear-clave"
              label="Contraseña"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              hint={PASSWORD_HINT}
              aria-invalid={!!errors.password}
              required
            />
            {err("password")}
          </div>
          <div>
            <Field
              id="crear-clave2"
              label="Repetí la contraseña"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={form.password2}
              onChange={set("password2")}
              aria-invalid={!!errors.password2}
              required
            />
            {err("password2")}
          </div>
          <ShowPassword checked={show} onChange={setShow} />
          <FormMessage result={result} />
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
          <p className="text-xs text-ink-500">
            Al crear tu cuenta aceptás los <TextLink href="/terminos/">Términos y condiciones</TextLink> y la{" "}
            <TextLink href="/privacidad/">Política de privacidad</TextLink>. Después vas a verificar tu identidad con tu
            DNI y un reconocimiento facial.
          </p>
          <p className="text-center text-sm text-ink-500">
            ¿Ya tenés cuenta? <TextLink href="/ingresar/">Ingresá</TextLink>
          </p>
        </form>
        </div>
      )}
    </AuthCard>
  );
}
