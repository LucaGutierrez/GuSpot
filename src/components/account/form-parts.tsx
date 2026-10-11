"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type InputHTMLAttributes, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { DemoNotice } from "@/components/ui/demo-notice";

import { fieldInput, fieldLabel } from "@/components/driver/range-fields";
import { useAuth } from "@/lib/auth/auth-provider";
import { getMyProfile } from "@/lib/data/profile";
import type { AuthResult } from "@/lib/auth/actions";

/** Destino después de ingresar: solo rutas internas (evita redirecciones abiertas). */
export function safeNext(value: string | null, fallback = "/cuenta/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

/** Si ya hay sesión, lleva a `to` (para ingresar / crear cuenta). */
/**
 * Si ya hay sesión, lleva a `to`. Si a la cuenta le faltan los datos personales
 * (p. ej. recién creada con Google o Apple), primero a completarlos.
 */
export function useRedirectWhenSignedIn(to: string) {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (auth.status !== "signed-in") return;
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (cancelled) return;
        const incomplete = !p.firstName || !p.lastName || !p.dni || !p.birthDate || !p.phone;
        router.replace(incomplete ? `/verificacion/?completar=1&volver=${encodeURIComponent(to)}` : to);
      })
      .catch(() => !cancelled && router.replace(to));
    return () => {
      cancelled = true;
    };
  }, [auth.status, router, to]);
  return auth;
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-12">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </Card>
    </div>
  );
}

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return (
    <div>
      <label htmlFor={props.id} className={fieldLabel}>
        {label}
      </label>
      <input className={fieldInput} aria-describedby={hint ? `${props.id}-ayuda` : undefined} {...props} />
      {hint && (
        <p id={`${props.id}-ayuda`} className="mt-1 text-xs text-ink-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export function ShowPassword({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-ink-300 accent-brand-600"
      />
      Mostrar contraseña
    </label>
  );
}

/** Resultado de una acción: verde si salió bien, rojo si no. */
export function FormMessage({ result }: { result: AuthResult | null }) {
  if (!result?.message) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={`rounded-xl border p-3 text-sm ${
        result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {result.message}
    </p>
  );
}

/** Copia del sitio sin conexión al servidor: no hay cuentas. */
export function AccountsDisabled() {
  return (
    <div className="space-y-4">
      <DemoNotice title="Las cuentas no están disponibles en esta versión">
        Esta copia del sitio no está conectada al servidor: no se pueden crear cuentas ni ingresar.
      </DemoNotice>
    </div>
  );
}

export function Loading() {
  return <p className="text-sm text-ink-500">Cargando…</p>;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-brand-700 hover:underline">
      {children}
    </Link>
  );
}
