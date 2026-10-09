"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FEATURE_LABEL, SPACE_TYPE_LABEL, VEHICLE_LABEL } from "@/lib/format";
import { describeAvailability } from "@/lib/availability";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import { DemoNotice } from "@/components/ui/demo-notice";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { InfoList } from "../form-fields";
import { getOwnerSpace } from "../owner-data";
import { DriverPreviewCard } from "../space-cards";
import {
  STEPS,
  cityOf,
  draftFromSpace,
  emptyDraft,
  parsePesos,
  toRules,
  validateStep,
  type Draft,
  type Errors,
} from "./draft";
import {
  AvailabilityStep,
  BasicsStep,
  FeaturesStep,
  LocationStep,
  PhotosStep,
  PriceStep,
  type StepProps,
} from "./steps";

/**
 * Lee `?espacio=<id>` para precargar un espacio del propietario demo
 * (botones "Editar"). Debe renderizarse dentro de <Suspense>.
 */
export function PublishWizardFromParams() {
  const params = useSearchParams();
  const id = params.get("espacio") ?? "";
  const space = id ? getOwnerSpace(id) : undefined;
  return <PublishWizard key={space?.id ?? "nuevo"} editing={space ? { id: space.id, title: space.title } : null} />;
}

function PublishWizard({ editing }: { editing: { id: string; title: string } | null }) {
  const [draft, setDraft] = useState<Draft>(() => {
    const space = editing ? getOwnerSpace(editing.id) : undefined;
    return space ? draftFromSpace(space) : emptyDraft();
  });
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [published, setPublished] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Al cambiar de paso, mover el foco al título del paso (lectores de pantalla y teclado).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setPublished(false);
  }

  function goTo(next: number) {
    setErrors({});
    setStep(next);
  }

  function onNext() {
    const e = validateStep(step, draft);
    setErrors(e);
    if (Object.keys(e).length) {
      // Esperar a que se pinte el resumen de errores antes de enfocarlo.
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function onPublish() {
    // Revalida todo por si se editó algo saltando pasos.
    for (let i = 0; i < STEPS.length - 1; i++) {
      const e = validateStep(i, draft);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(i);
        return;
      }
    }
    setPublished(true);
  }

  const stepProps: StepProps = { draft, errors, update };
  const isLast = step === STEPS.length - 1;
  const errorCount = Object.keys(errors).length;
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 pt-6">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {editing ? "Editar espacio" : "Publicá tu espacio"}
          <DemoBadge />
        </h1>
        <p className="text-ink-500">
          {editing
            ? `Estás editando “${editing.title}”. Los cambios no se guardan en la demo.`
            : "Completá los pasos. En la demo nada se guarda: es para ver cómo funcionará."}
        </p>
      </div>

      {/* Progreso */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <p className="font-medium text-ink-900">
            Paso {step + 1} de {STEPS.length}: {STEPS[step]}
          </p>
          <p className="text-ink-500">{progress}%</p>
        </div>
        <div
          role="progressbar"
          aria-label="Progreso de la publicación"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-2 overflow-hidden rounded-full bg-ink-200"
        >
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <ol className="hidden flex-wrap gap-1 sm:flex" aria-label="Pasos">
          {STEPS.map((name, i) => {
            const done = i < step;
            const current = i === step;
            const cls = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              current ? "bg-brand-600 text-white" : done ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-500"
            }`;
            return (
              <li key={name}>
                {done ? (
                  <button
                    type="button"
                    className={`${cls} hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-500`}
                    onClick={() => goTo(i)}
                  >
                    <CheckIcon width={14} height={14} /> {name}
                    <span className="sr-only"> (completado, volver a este paso)</span>
                  </button>
                ) : (
                  <span className={cls} aria-current={current ? "step" : undefined}>
                    {i + 1}. {name}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="flex flex-col gap-5 p-4 sm:p-6">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="scroll-mt-28 text-xl font-semibold text-ink-900 focus:outline-none"
          >
            {STEPS[step]}
          </h2>

          {errorCount > 0 && (
            <div
              ref={summaryRef}
              tabIndex={-1}
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 focus:outline-2 focus:outline-red-400"
            >
              <p className="font-semibold">
                {errorCount === 1 ? "Hay 1 dato para revisar" : `Hay ${errorCount} datos para revisar`} antes de
                seguir.
              </p>
              <ul className="mt-1 list-disc pl-5">
                {[...new Set(Object.values(errors))].map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {step === 0 && <BasicsStep {...stepProps} />}
          {step === 1 && <LocationStep {...stepProps} />}
          {step === 2 && <FeaturesStep {...stepProps} />}
          {step === 3 && <PhotosStep {...stepProps} />}
          {step === 4 && <PriceStep {...stepProps} />}
          {step === 5 && <AvailabilityStep {...stepProps} />}
          {step === 6 && <ReviewStep draft={draft} onEdit={goTo} />}

          <div role="status" aria-live="polite">
            {published && (
              <DemoNotice title="Demo: la publicación no se guardó.">
                En la versión real quedará pendiente de verificación (proceso de verificación: a definir).{" "}
                <Link href="/propietarios/" className="font-semibold underline">
                  Volver al panel
                </Link>
              </DemoNotice>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-between">
            {step > 0 ? (
              <Button variant="secondary" size="lg" onClick={() => goTo(step - 1)}>
                <ChevronLeftIcon /> Atrás
              </Button>
            ) : (
              <ButtonLink href="/propietarios/" variant="ghost" size="lg">
                Cancelar
              </ButtonLink>
            )}
            {isLast ? (
              <Button size="lg" onClick={onPublish}>
                {editing ? "Guardar cambios" : "Publicar"}
              </Button>
            ) : (
              <Button size="lg" onClick={onNext}>
                Siguiente <ChevronRightIcon />
              </Button>
            )}
          </div>
        </Card>

        {/* Vista previa en vivo (escritorio). En celular se ve en el paso de revisión. */}
        <aside className="hidden lg:block" aria-label="Vista previa">
          <div className="sticky top-24 flex flex-col gap-2">
            <p className="text-sm font-medium text-ink-500">Vista previa para conductores</p>
            <Preview draft={draft} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Preview({ draft }: { draft: Draft }) {
  const hourly = parsePesos(draft.hourly);
  const daily = parsePesos(draft.daily);
  const minHours = Number(draft.minHours);
  return (
    <DriverPreviewCard
      title={draft.title.trim()}
      neighborhood={draft.neighborhood.trim()}
      city={cityOf(draft)}
      approxLocation={draft.approxLocation.trim()}
      type={draft.type || undefined}
      maxVehicle={draft.maxVehicle || undefined}
      features={draft.features}
      photoVariant={draft.photo}
      hourlyPrice={hourly > 0 ? hourly * 100 : undefined}
      dailyPrice={daily > 0 ? daily * 100 : undefined}
      minHours={Number.isInteger(minHours) && minHours > 0 ? minHours : undefined}
    />
  );
}

function ReviewStep({ draft, onEdit }: { draft: Draft; onEdit: (step: number) => void }) {
  const schedule = describeAvailability({ availability: toRules(draft.rules) });
  const conditions = draft.conditions.map((c) => c.trim()).filter(Boolean);
  const daily = parsePesos(draft.daily);

  const sections: { title: string; step: number; items: { label: string; value: React.ReactNode }[] }[] = [
    {
      title: "Datos básicos",
      step: 0,
      items: [
        { label: "Título", value: draft.title },
        { label: "Descripción", value: draft.description },
        { label: "Tipo", value: draft.type ? SPACE_TYPE_LABEL[draft.type] : "—" },
        { label: "Vehículo máximo", value: draft.maxVehicle ? VEHICLE_LABEL[draft.maxVehicle] : "—" },
      ],
    },
    {
      title: "Ubicación",
      step: 1,
      items: [
        { label: "Ciudad y barrio", value: `${draft.neighborhood}, ${cityOf(draft)}` },
        { label: "Referencia pública", value: draft.approxLocation },
        {
          label: "Dirección exacta",
          value: (
            <>
              {draft.exactAddress}
              <span className="block text-xs font-normal text-ink-500">
                Privada: solo para conductores con reserva confirmada.
              </span>
            </>
          ),
        },
      ],
    },
    {
      title: "Características y acceso",
      step: 2,
      items: [
        {
          label: "Características",
          value: draft.features.length ? draft.features.map((f) => FEATURE_LABEL[f]).join(", ") : "Ninguna",
        },
        {
          label: "Condiciones",
          value: conditions.length ? (
            <ul className="list-disc pl-4">
              {conditions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          ) : (
            "Ninguna"
          ),
        },
      ],
    },
    {
      title: "Precio",
      step: 4,
      items: [
        { label: "Por hora", value: `$ ${draft.hourly}` },
        { label: "Por día", value: daily > 0 ? `$ ${draft.daily}` : "Sin tarifa diaria" },
        { label: "Mínimo", value: `${draft.minHours} h` },
      ],
    },
    {
      title: "Disponibilidad",
      step: 5,
      items: [{ label: "Horario", value: schedule.join(" · ") || "—" }],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-ink-900">Así te verían los conductores</h3>
        <div className="max-w-sm">
          <Preview draft={draft} />
        </div>
        <p className="text-xs text-ink-500">
          La dirección exacta no aparece en la publicación. {draft.photo ? "La imagen es una ilustración de muestra." : ""}
        </p>
      </div>
      {sections.map((s) => (
        <section key={s.title} aria-label={s.title} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink-900">{s.title}</h3>
            <Button variant="ghost" className="h-8 px-2" onClick={() => onEdit(s.step)}>
              Editar <span className="sr-only">{s.title.toLowerCase()}</span>
            </Button>
          </div>
          <InfoList items={s.items} />
        </section>
      ))}
      <p className="text-xs text-ink-500">
        Requisitos para publicar (verificación de identidad, documentación del espacio, etc.): a definir.
      </p>
    </div>
  );
}
