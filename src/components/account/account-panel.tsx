"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { CameraIcon, CarIcon, ChevronLeftIcon, ChevronRightIcon, KeyIcon, ParkingIcon, PinIcon, ShieldIcon, TicketIcon, WalletIcon } from "@/components/ui/icons";
import { NavAppPicker } from "@/components/garage/navigate-buttons";
import { useAuth, type AuthUser } from "@/lib/auth/auth-provider";
import { PASSWORD_HINT, passwordProblem, signOut, updatePassword, type AuthResult } from "@/lib/auth/actions";
import type { Profile, Requirement } from "@/lib/data/types";
import { avatarUrl, getMyAvatarPath, getMyProfile, myMissingRequirements, removeAvatar, uploadAvatar } from "@/lib/data/profile";
import { RequireSignIn } from "@/components/my-garages/shared";
import { AccountsDisabled, Field, FormMessage, Loading, ShowPassword } from "./form-parts";

// ---------------------------------------------------------------- /cuenta/

export function AccountPanel() {
  const auth = useAuth();

  return (
    <Container className="max-w-2xl pb-12">
      <PageHeader title="Tu cuenta" />
      {auth.status === "disabled" ? (
        <Card className="p-5">
          <AccountsDisabled />
        </Card>
      ) : auth.status === "loading" ? (
        <Loading />
      ) : auth.status === "signed-out" ? (
        <Card className="space-y-4 p-5">
          <p className="text-ink-700">Ingresá o creá una cuenta para reservar o publicar tu cochera.</p>
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

const STATUS: Record<Profile["identityStatus"], { text: string; tone: string }> = {
  verificada: { text: "Identidad verificada", tone: "bg-emerald-50 text-emerald-800" },
  en_revision: { text: "Verificación en revisión", tone: "bg-accent-100 text-ink-900" },
  rechazada: { text: "Verificación rechazada", tone: "bg-red-50 text-red-800" },
  sin_verificar: { text: "Identidad sin verificar", tone: "bg-ink-100 text-ink-700" },
};

function MenuItem({
  href,
  icon,
  title,
  detail,
  badge,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  detail?: string;
  badge?: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-4 py-3.5 hover:bg-ink-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink-900">{title}</span>
          {detail && <span className="block truncate text-sm text-ink-500">{detail}</span>}
        </span>
        {badge}
        <ChevronRightIcon width={18} height={18} className="shrink-0 text-ink-400" />
      </Link>
    </li>
  );
}

function SignedIn({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState<Requirement[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyProfile(), myMissingRequirements("conductor")])
      .then(([p, m]) => {
        if (cancelled) return;
        setProfile(p);
        setMissing(m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSignOut() {
    setLeaving(true);
    await signOut();
    router.replace("/");
  }

  const fullName = profile && (profile.firstName || profile.lastName)
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : user.displayName;
  const status = profile ? STATUS[profile.identityStatus] : null;
  const vehiclesMissing = missing?.includes("vehiculo") || missing?.includes("seguro");

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex items-center gap-4 p-5">
        <AvatarPicker initial={fullName.charAt(0).toUpperCase()} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink-900">{fullName}</p>
          <p className="truncate text-sm text-ink-500">{user.email}</p>
          {status && (
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.tone}`}>
              {status.text}
            </span>
          )}
        </div>
      </Card>

      <section aria-label="Perfil">
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-500 uppercase">Perfil</h2>
        <Card className="overflow-hidden">
          <ul className="divide-y divide-ink-100">
            <MenuItem
              href="/verificacion/"
              icon={<ShieldIcon />}
              title="Datos personales y verificación"
              detail="Nombre, DNI, celular, verificación de identidad y licencia"
            />
            <MenuItem
              href="/cuenta/vehiculos/"
              icon={<CarIcon />}
              title="Mis vehículos"
              detail="Los autos con los que reservás"
              badge={
                vehiclesMissing ? (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700">Falta</span>
                ) : undefined
              }
            />
            <MenuItem
              href="/cuenta/navegacion/"
              icon={<PinIcon />}
              title="App para ir"
              detail="Google Maps, Waze u otra: la que abre el botón Ir"
            />
          </ul>
        </Card>
      </section>

      <section aria-label="Actividad">
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-500 uppercase">Actividad</h2>
        <Card className="overflow-hidden">
          <ul className="divide-y divide-ink-100">
            <MenuItem href="/mis-reservas/" icon={<TicketIcon />} title="Mis reservas" detail="Tus reservas como conductor" />
            <MenuItem href="/mis-garages/" icon={<ParkingIcon />} title="Mis garajes" detail="Publicá y administrá tus cocheras" />
          </ul>
        </Card>
      </section>

      <section aria-label="Pagos">
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-500 uppercase">Pagos</h2>
        <Card className="overflow-hidden">
          <ul className="divide-y divide-ink-100">
            <MenuItem
              href="/cuenta/cobros/"
              icon={<WalletIcon />}
              title="Cobros con Mercado Pago"
              detail="Conectá tu cuenta para cobrar las reservas de tus garajes"
            />
          </ul>
        </Card>
      </section>

      <section aria-label="Seguridad">
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-500 uppercase">Seguridad</h2>
        <Card className="overflow-hidden">
          <ul className="divide-y divide-ink-100">
            <MenuItem href="/cuenta/contrasena/" icon={<KeyIcon />} title="Contraseña" detail="Cambiá tu contraseña" />
          </ul>
        </Card>
      </section>

      <Button variant="secondary" size="lg" onClick={onSignOut} disabled={leaving} className="w-full">
        {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
      </Button>
    </div>
  );
}

/** Foto de perfil: tocás la foto para cambiarla. La ve el garaje cuando reservás o avisás que vas. */
function AvatarPicker({ initial }: { initial: string }) {
  const [path, setPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getMyAvatarPath()
      .then((p) => !cancelled && setPath(p))
      .catch(() => !cancelled && setPath(""));
    return () => {
      cancelled = true;
    };
  }, []);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setPath(await uploadAvatar(file));
    } catch {
      setError("No pudimos subir la foto. Probá con otra.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    try {
      await removeAvatar();
      setPath("");
    } catch {
      setError("No pudimos quitar la foto.");
    } finally {
      setBusy(false);
    }
  }

  const url = path ? avatarUrl(path) : "";
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || path === null}
        aria-label={url ? "Cambiar foto de perfil" : "Agregar foto de perfil"}
        className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-brand-100 text-xl font-bold text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-70"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- sitio estático, sin optimización de imágenes
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
        <span className="absolute right-0 bottom-0 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white ring-2 ring-white">
          <CameraIcon width={13} height={13} />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={onFile} />
      {busy ? (
        <span className="text-xs text-ink-500">Subiendo…</span>
      ) : url ? (
        <button type="button" onClick={onRemove} className="text-xs font-semibold text-ink-500 hover:underline">
          Quitar
        </button>
      ) : null}
      {error && <span role="alert" className="max-w-24 text-center text-xs text-red-700">{error}</span>}
    </div>
  );
}

// ---------------------------------------------------------------- subpáginas

function BackToAccount() {
  return (
    <Link
      href="/cuenta/"
      className="inline-flex items-center gap-1 pt-4 text-sm font-medium text-brand-700 hover:underline"
    >
      <ChevronLeftIcon width={16} height={16} /> Tu cuenta
    </Link>
  );
}

/** /cuenta/navegacion/ (la elección queda en este navegador, no hace falta sesión). */
export function NavigationAppPage() {
  return (
    <Container className="max-w-2xl pb-12">
      <BackToAccount />
      <PageHeader
        title="App para ir"
        subtitle="La que se abre al tocar Ir en un garaje, con el camino ya iniciado. Si no está instalada, se abre en el navegador."
      />
      <NavAppPicker />
    </Container>
  );
}

/** /cuenta/contrasena/ */
export function PasswordPage() {
  return (
    <Container className="max-w-2xl pb-12">
      <BackToAccount />
      <PageHeader title="Contraseña" subtitle="Elegí una contraseña nueva para entrar a GuSpot." />
      <RequireSignIn back="/cuenta/contrasena/">{() => <PasswordForm />}</RequireSignIn>
    </Container>
  );
}

function PasswordForm() {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(password);
    if (problem) {
      setResult({ ok: false, message: problem });
      return;
    }
    if (password !== password2) {
      setResult({ ok: false, message: "Las contraseñas no coinciden." });
      return;
    }
    setBusy(true);
    const r = await updatePassword(password);
    setBusy(false);
    setResult(r);
    if (r.ok) {
      setPassword("");
      setPassword2("");
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
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
          hint={PASSWORD_HINT}
        />
        <Field
          id="cuenta-clave2"
          label="Repetí la contraseña nueva"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={password2}
          onChange={(e) => {
            setPassword2(e.target.value);
            setResult(null);
          }}
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

export { BackToAccount };
