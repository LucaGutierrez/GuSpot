"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import type { IdentityDoc, Profile, Requirement, Vehicle } from "@/lib/data/types";
import { DataError } from "@/lib/data/types";
import type { VehicleSize } from "@/lib/types";
import { VEHICLE_LABEL } from "@/lib/format";
import {
  REQUIREMENT_LABEL,
  addVehicle,
  deleteVehicle,
  docPreviewUrl,
  getMyProfile,
  listMyVehicles,
  myMissingRequirements,
  myUploadedDocs,
  normalizePhone,
  normalizePlate,
  saveMyProfile,
  startIdentityCheck,
  syncIdentityCheck,
  uploadIdentityDoc,
} from "@/lib/data/profile";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { CameraIcon, CheckIcon } from "@/components/ui/icons";
import { Field, inputClass } from "@/components/owner/form-fields";
import { VEHICLE_ORDER } from "@/components/driver/vehicles";
import { ErrorBox, RequireSignIn, SuccessBox } from "@/components/my-garages/shared";
import { safeNext } from "./form-parts";
import { BackToAccount } from "./account-panel";

const errText = (err: unknown) => (err instanceof DataError ? err.message : "Algo salió mal. Probá de nuevo.");

const LICENSE_CATEGORIES = ["A1", "A2", "A3", "B1", "B2", "C", "D1", "D2", "D3", "E1", "E2", "G"];

const STATUS_TEXT: Record<Profile["identityStatus"], string> = {
  sin_verificar: "Sin verificar",
  en_revision: "En revisión",
  verificada: "Identidad verificada",
  rechazada: "Verificación rechazada",
};

function Section({ id, title, subtitle, done, children }: { id?: string; title: string; subtitle?: string; done?: boolean; children: ReactNode }) {
  return (
    <Card id={id} className="flex scroll-mt-24 flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
        </div>
        {done !== undefined && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${done ? "bg-emerald-50 text-emerald-800" : "bg-ink-100 text-ink-700"}`}
          >
            {done ? "Completo" : "Falta"}
          </span>
        )}
      </div>
      {children}
    </Card>
  );
}

/** /verificacion/: lee `?volver=`. Montarlo dentro de <Suspense>. */
export function VerificationPage() {
  const params = useSearchParams();
  const back = params.get("volver") ? safeNext(params.get("volver"), "/") : null;
  // Didit vuelve a /verificacion/?didit=1&verificationSessionId=…&status=…
  const returning = params.get("didit") === "1";
  return (
    <Container className="max-w-2xl pb-16">
      <BackToAccount />
      <PageHeader
        title="Datos personales y verificación"
        subtitle="Para reservar o publicar necesitamos saber quién sos. Tus documentos son privados."
      />
      <RequireSignIn back="/verificacion/">{() => <Verification back={back} returning={returning} />}</RequireSignIn>
    </Container>
  );
}

function Verification({ back, returning }: { back: string | null; returning: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [docs, setDocs] = useState<Set<IdentityDoc>>(new Set());
  const [missing, setMissing] = useState<{ conductor: Requirement[]; propietario: Requirement[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  async function refreshMissing() {
    const [conductor, propietario] = await Promise.all([
      myMissingRequirements("conductor"),
      myMissingRequirements("propietario"),
    ]);
    setMissing({ conductor, propietario });
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyProfile(), myUploadedDocs(), myMissingRequirements("conductor"), myMissingRequirements("propietario")])
      .then(([p, d, conductor, propietario]) => {
        if (cancelled) return;
        setProfile(p);
        setDocs(d);
        setMissing({ conductor, propietario });
        if (d.size > 0) setConsent(true);
      })
      .catch((err) => !cancelled && setError(errText(err)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!profile || !missing) return <p className="text-sm text-ink-500">Cargando…</p>;

  const onDocUploaded = (doc: IdentityDoc) => {
    setDocs((d) => new Set(d).add(doc));
    refreshMissing().catch(() => {});
  };

  return (
    <div className="flex flex-col gap-5">
      <StatusCard profile={profile} missing={missing} back={back} />

      <PersonalForm
        profile={profile}
        onSaved={(p) => {
          setProfile(p);
          refreshMissing().catch(() => {});
        }}
      />

      <IdentitySection
        profile={profile}
        returning={returning}
        onStatus={(identityStatus) => {
          setProfile((p) => (p ? { ...p, identityStatus } : p));
          refreshMissing().catch(() => {});
        }}
      />

      <LicenseSection
        profile={profile}
        consent={consent}
        onConsent={setConsent}
        docs={docs}
        onSaved={(p) => {
          setProfile(p);
          refreshMissing().catch(() => {});
        }}
        onDocUploaded={onDocUploaded}
      />

    </div>
  );
}

function StatusCard({
  profile,
  missing,
  back,
}: {
  profile: Profile;
  missing: { conductor: Requirement[]; propietario: Requirement[] };
  back: string | null;
}) {
  const row = (label: string, list: Requirement[]) => (
    <div className="flex flex-col gap-1">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        {list.length === 0 ? <CheckIcon className="text-emerald-600" /> : <span className="h-2 w-2 rounded-full bg-accent-500" />}
        {label}
      </p>
      {list.length > 0 && (
        <ul className="list-disc pl-9 text-sm text-ink-700">
          {list.map((m) => (
            <li key={m}>
              {m === "vehiculo" ? (
                <Link href="/cuenta/vehiculos/" className="font-semibold text-brand-700 hover:underline">
                  {REQUIREMENT_LABEL[m]}
                </Link>
              ) : (
                REQUIREMENT_LABEL[m]
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="text-sm text-ink-700">
        Estado: <strong className="text-ink-900">{STATUS_TEXT[profile.identityStatus]}</strong>
      </p>
      {row(missing.conductor.length === 0 ? "Ya podés reservar" : "Para reservar te falta:", missing.conductor)}
      {row(missing.propietario.length === 0 ? "Ya podés publicar garages" : "Para publicar garages te falta:", missing.propietario)}
      {back && missing.conductor.length === 0 && (
        <ButtonLink href={back} className="w-fit">
          Volver y reservar
        </ButtonLink>
      )}
    </Card>
  );
}

function IdentitySection({
  profile,
  returning,
  onStatus,
}: {
  profile: Profile;
  returning: boolean;
  onStatus: (s: Profile["identityStatus"]) => void;
}) {
  const [busy, setBusy] = useState<"start" | "sync" | null>(returning ? "sync" : null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const status = profile.identityStatus;
  const hasPersonal = !!(profile.firstName && profile.lastName && profile.dni && profile.birthDate);

  useEffect(() => {
    // Al volver de Didit (o si quedó en revisión), consultar el resultado.
    if (!returning && status !== "en_revision") return;
    let cancelled = false;
    syncIdentityCheck()
      .then((r) => {
        if (cancelled) return;
        onStatus(r.status);
        if (r.reason === "dni_distinto")
          setNote("El DNI escaneado no coincide con el número que cargaste en tus datos. Revisalo y volvé a verificar.");
      })
      .catch((err) => !cancelled && setError(errText(err)))
      .finally(() => !cancelled && setBusy(null));
    return () => {
      cancelled = true;
    };
    // Solo al entrar a la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onStart() {
    setBusy("start");
    setError(null);
    try {
      const url = await startIdentityCheck(`${window.location.origin}/verificacion/?didit=1`);
      window.location.assign(url);
    } catch (err) {
      setError(errText(err));
      setBusy(null);
    }
  }

  const text: Record<Profile["identityStatus"], string> = {
    sin_verificar: "Todavía no verificaste tu identidad.",
    en_revision: "Tu verificación está en revisión. Te avisamos cuando termine (puede tardar unas horas).",
    verificada: "Tu identidad está verificada.",
    rechazada: "No pudimos verificar tu identidad. Revisá tus datos y volvé a intentarlo.",
  };

  return (
    <Section
      title="Verificá tu identidad"
      subtitle="Sacás fotos de tu DNI y hacés un reconocimiento facial con la cámara para confirmar que sos vos."
      done={status === "verificada"}
    >
      <p className={`text-sm ${status === "verificada" ? "text-emerald-800" : status === "rechazada" ? "text-red-800" : "text-ink-700"}`}>
        {busy === "sync" ? "Consultando el resultado…" : text[status]}
      </p>
      {note && <ErrorBox>{note}</ErrorBox>}
      {status !== "verificada" && status !== "en_revision" && (
        <>
          <ul className="list-disc pl-5 text-sm text-ink-700">
            <li>Tené a mano tu DNI físico (frente y dorso).</li>
            <li>Buscá buena luz y sacate anteojos y gorra.</li>
            <li>Te va a pedir mover la cara frente a la cámara (prueba de vida).</li>
          </ul>
          {!hasPersonal && <p className="text-sm text-ink-500">Primero guardá tus datos personales.</p>}
          <Button size="lg" className="w-full sm:w-fit" onClick={onStart} disabled={!hasPersonal || busy !== null}>
            {busy === "start" ? "Abriendo…" : status === "rechazada" ? "Volver a verificar" : "Verificar mi identidad"}
          </Button>
          <p className="text-xs text-ink-500">
            Al continuar aceptás que Didit procese las fotos de tu DNI y de tu cara solo para verificar tu identidad. No se
            muestran a otros usuarios. La política de privacidad de GuSpot está a definir.
          </p>
        </>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
    </Section>
  );
}

function Consent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-sm text-ink-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-brand-600"
      />
      <span>
        Acepto que GuSpot guarde las fotos de mi licencia solo para verificar que puedo manejar. No
        se muestran a otros usuarios. La política de privacidad está a definir.
      </span>
    </label>
  );
}

function PhotoSlot({
  doc,
  label,
  uploaded,
  disabled,
  capture,
  onUploaded,
}: {
  doc: IdentityDoc;
  label: string;
  uploaded: boolean;
  disabled: boolean;
  capture: "user" | "environment";
  onUploaded: (doc: IdentityDoc) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!uploaded || preview) return;
    let cancelled = false;
    docPreviewUrl(doc)
      .then((url) => !cancelled && setPreview(url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uploaded, doc, preview]);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadIdentityDoc(doc, file);
      setPreview(URL.createObjectURL(file));
      onUploaded(doc);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ink-200 p-3">
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-lg bg-ink-100 text-ink-500">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto privada con enlace temporal
          <img src={preview} alt={label} className="h-full w-full object-cover" />
        ) : (
          <CameraIcon width={32} height={32} />
        )}
        {uploaded && (
          <span className="absolute top-2 right-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
            Subida
          </span>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture={capture} className="hidden" onChange={onFile} />
      <Button variant={uploaded ? "secondary" : "primary"} onClick={() => inputRef.current?.click()} disabled={disabled || busy}>
        {busy ? "Subiendo…" : uploaded ? `Cambiar: ${label}` : `Sacar foto: ${label}`}
      </Button>
      {disabled && !uploaded && <p className="text-xs text-ink-500">Primero aceptá el uso de tus datos.</p>}
      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  );
}

function usePersonal(profile: Profile) {
  const [form, setForm] = useState(profile);
  const set = (patch: Partial<Profile>) => setForm((f) => ({ ...f, ...patch }));
  return { form, set };
}

function PersonalForm({ profile, onSaved }: { profile: Profile; onSaved: (p: Profile) => void }) {
  const { form, set } = usePersonal(profile);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const done = !!(profile.firstName && profile.lastName && profile.dni && profile.birthDate && profile.phone);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{7,8}$/.test(form.dni.replace(/\D/g, ""))) {
      setResult({ ok: false, text: "El DNI tiene que tener 7 u 8 números." });
      return;
    }
    if (form.phone.replace(/[^\d]/g, "").length < 10) {
      setResult({ ok: false, text: "Escribí tu celular con código de área (ej.: 11 2345 6789)." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const phone = normalizePhone(form.phone);
      const next = { ...form, phone };
      await saveMyProfile(next);
      onSaved({ ...next, phone: phone.replace(/[^\d+]/g, ""), dni: form.dni.replace(/\D/g, "") });
      setResult({ ok: true, text: "Guardamos tus datos." });
    } catch (err) {
      setResult({ ok: false, text: errText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Datos personales" subtitle="Tal como figuran en tu DNI." done={done}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pf-nombre" label="Nombre">
            <input id="pf-nombre" className={inputClass} autoComplete="given-name" value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} />
          </Field>
          <Field id="pf-apellido" label="Apellido">
            <input id="pf-apellido" className={inputClass} autoComplete="family-name" value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} />
          </Field>
          <Field id="pf-dni" label="Número de DNI" hint="Solo números, sin puntos.">
            <input id="pf-dni" className={inputClass} inputMode="numeric" value={form.dni} onChange={(e) => set({ dni: e.target.value })} />
          </Field>
          <Field id="pf-nacimiento" label="Fecha de nacimiento" hint="Tenés que tener 18 años o más.">
            <input id="pf-nacimiento" type="date" className={inputClass} value={form.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
          </Field>
          <Field id="pf-celular" label="Celular" hint="Con código de área. Pronto lo vas a confirmar con un código por SMS.">
            <input id="pf-celular" type="tel" className={inputClass} autoComplete="tel" placeholder="11 2345 6789" value={form.phone.replace(/^\+54/, "")} onChange={(e) => set({ phone: e.target.value })} />
          </Field>
        </div>
        {result && (result.ok ? <SuccessBox>{result.text}</SuccessBox> : <ErrorBox>{result.text}</ErrorBox>)}
        <Button type="submit" className="w-fit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar datos"}
        </Button>
      </form>
    </Section>
  );
}

function LicenseSection({
  profile,
  consent,
  onConsent,
  docs,
  onSaved,
  onDocUploaded,
}: {
  profile: Profile;
  consent: boolean;
  onConsent: (v: boolean) => void;
  docs: Set<IdentityDoc>;
  onSaved: (p: Profile) => void;
  onDocUploaded: (doc: IdentityDoc) => void;
}) {
  const [form, setForm] = useState({
    licenseNumber: profile.licenseNumber,
    licenseCategory: profile.licenseCategory,
    licenseExpiry: profile.licenseExpiry,
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const done =
    !!(profile.licenseNumber && profile.licenseCategory && profile.licenseExpiry) &&
    docs.has("licencia-frente") &&
    docs.has("licencia-dorso");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.licenseNumber.trim() || !form.licenseCategory || !form.licenseExpiry) {
      setResult({ ok: false, text: "Completá número, categoría y vencimiento." });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const next = { ...profile, ...form };
      await saveMyProfile(next);
      onSaved(next);
      setResult({ ok: true, text: "Guardamos tu licencia." });
    } catch (err) {
      setResult({ ok: false, text: errText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Licencia de conducir" subtitle="Necesaria para reservar. Si solo publicás garages, no hace falta." done={done}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="lc-numero" label="Número">
            <input id="lc-numero" className={inputClass} value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} />
          </Field>
          <Field id="lc-categoria" label="Categoría">
            <select id="lc-categoria" className={inputClass} value={form.licenseCategory} onChange={(e) => setForm((f) => ({ ...f, licenseCategory: e.target.value }))}>
              <option value="">Elegí</option>
              {LICENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field id="lc-vence" label="Vencimiento">
            <input id="lc-vence" type="date" className={inputClass} value={form.licenseExpiry} onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value }))} />
          </Field>
        </div>
        {result && (result.ok ? <SuccessBox>{result.text}</SuccessBox> : <ErrorBox>{result.text}</ErrorBox>)}
        <Button type="submit" variant="secondary" className="w-fit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar licencia"}
        </Button>
      </form>
      <Consent checked={consent} onChange={onConsent} />
      <div className="grid gap-3 sm:grid-cols-2">
        <PhotoSlot doc="licencia-frente" label="Frente de la licencia" uploaded={docs.has("licencia-frente")} disabled={!consent} capture="environment" onUploaded={onDocUploaded} />
        <PhotoSlot doc="licencia-dorso" label="Dorso de la licencia" uploaded={docs.has("licencia-dorso")} disabled={!consent} capture="environment" onUploaded={onDocUploaded} />
      </div>
    </Section>
  );
}

/** /cuenta/vehiculos/ */
export function VehiclesPage() {
  return (
    <Container className="max-w-2xl pb-16">
      <BackToAccount />
      <PageHeader title="Mis vehículos" subtitle="Reservás con uno de tus vehículos. El dueño del garage ve marca, modelo, color y patente." />
      <RequireSignIn back="/cuenta/vehiculos/">{() => <VehiclesLoader />}</RequireSignIn>
    </Container>
  );
}

function VehiclesLoader() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    listMyVehicles()
      .then((v) => !cancelled && setVehicles(v))
      .catch((err) => !cancelled && setError(errText(err)));
    return () => {
      cancelled = true;
    };
  }, []);
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!vehicles) return <p className="text-sm text-ink-500">Cargando…</p>;
  return <VehiclesSection vehicles={vehicles} onChange={setVehicles} />;
}

function VehiclesSection({ vehicles, onChange }: { vehicles: Vehicle[]; onChange: (v: Vehicle[]) => void }) {
  const empty = { brand: "", model: "", color: "", plate: "", size: "auto_mediano" as VehicleSize };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!form.brand.trim() || !form.model.trim()) {
      setError("Completá marca y modelo.");
      return;
    }
    if (!/^[A-Z0-9]{6,8}$/.test(normalizePlate(form.plate))) {
      setError("La patente no es válida (ej.: AB123CD o ABC123).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addVehicle(form);
      onChange(await listMyVehicles());
      setForm(empty);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    setRemoving(id);
    setError(null);
    try {
      await deleteVehicle(id);
      onChange(vehicles.filter((v) => v.id !== id));
    } catch (err) {
      setError(errText(err));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Section id="vehiculos" title="Tus vehículos" done={vehicles.length > 0}>
      {vehicles.length > 0 && (
        <ul className="flex flex-col gap-2">
          {vehicles.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-3">
              <div>
                <p className="font-semibold text-ink-900">
                  {v.brand} {v.model} {v.color && <span className="font-normal text-ink-500">· {v.color}</span>}
                </p>
                <p className="text-sm text-ink-700">
                  {v.plate} · {VEHICLE_LABEL[v.size]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(v.id)}
                disabled={removing !== null}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {removing === v.id ? "Quitando…" : "Quitar"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={onAdd} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field id="vh-marca" label="Marca">
            <input id="vh-marca" className={inputClass} placeholder="Fiat" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
          </Field>
          <Field id="vh-modelo" label="Modelo">
            <input id="vh-modelo" className={inputClass} placeholder="Cronos" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
          </Field>
          <Field id="vh-color" label="Color">
            <input id="vh-color" className={inputClass} placeholder="Gris" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
          </Field>
          <Field id="vh-patente" label="Patente">
            <input id="vh-patente" className={`${inputClass} uppercase`} placeholder="AB123CD" value={form.plate} onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))} />
          </Field>
          <Field id="vh-tamano" label="Tamaño">
            <select id="vh-tamano" className={inputClass} value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value as VehicleSize }))}>
              {VEHICLE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {VEHICLE_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <Button type="submit" variant="secondary" className="w-fit" disabled={busy}>
          {busy ? "Agregando…" : "Agregar vehículo"}
        </Button>
      </form>
    </Section>
  );
}
