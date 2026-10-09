import type { Metadata } from "next";
import Link from "next/link";
import { cities, publishedSpaces } from "@/lib/demo-data";
import { searchQuery } from "@/lib/search";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/card";
import { DemoBadge } from "@/components/ui/badge";
import {
  CheckIcon,
  ChevronRightIcon,
  KeyIcon,
  ParkingIcon,
  PinIcon,
  SearchIcon,
  TicketIcon,
} from "@/components/ui/icons";
import { MapIcon } from "@/components/explore/icons";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description:
    "Cómo buscar y solicitar una cochera en GuSpot, y cómo publicar la tuya (versión de demostración).",
};

const STEPS = [
  {
    icon: SearchIcon,
    title: "Buscá",
    text: "Elegí zona, día y horario. Ves el precio total del período antes de decidir.",
  },
  {
    icon: TicketIcon,
    title: "Solicitá",
    text: "Mandá la solicitud con tu vehículo y un mensaje para el propietario.",
  },
  {
    icon: KeyIcon,
    title: "El propietario confirma",
    text: "Cuando acepta, la reserva queda confirmada. La dirección exacta se comparte cuando la reserva esté confirmada y pagada.",
  },
];

export default function ComoFuncionaPage() {
  const spaces = publishedSpaces();
  const byCity = cities().map(({ city, neighborhoods }) => ({
    city,
    neighborhoods,
    count: spaces.filter((s) => s.city === city).length,
  }));

  // La búsqueda en el mapa es la pantalla principal ("/"); esta página explica
  // el servicio y lleva de vuelta al mapa.
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-ink-50">
        <Container className="py-10 md:py-16">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
              <ParkingIcon /> Cocheras de propietarios en Argentina
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Estacioná cerca, con precio claro
            </h1>
            <p className="mt-4 max-w-prose text-lg text-ink-700">
              Encontrá una cochera por horas o por día, mirá el total antes de solicitar y
              esperá la confirmación del propietario.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink-700">
              {[
                "Precio total del período, sin sorpresas",
                "Ubicación aproximada (±200 m) antes de reservar; la dirección exacta, cuando la reserva esté confirmada y pagada",
                "Cada reserva la acepta el propietario",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 shrink-0 text-brand-600" />
                  {t}
                </li>
              ))}
            </ul>
            <ButtonLink href="/" size="lg" className="mt-6">
              <MapIcon /> Buscar en el mapa
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Container className="space-y-14 py-12">
        <section aria-labelledby="ciudades">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="ciudades" className="text-xl font-bold text-ink-900">
              Buscá por ciudad
            </h2>
            <DemoBadge label="Espacios de ejemplo" />
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {byCity.map(({ city, neighborhoods, count }) => (
              <li key={city}>
                <Link
                  href={`/?${searchQuery({ zona: city })}`}
                  className="flex h-full items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm hover:border-brand-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  <PinIcon className="mt-0.5 shrink-0 text-brand-600" />
                  <span className="flex-1">
                    <span className="block font-semibold text-ink-900">{city}</span>
                    <span className="block text-sm text-ink-500">
                      {count} {count === 1 ? "espacio" : "espacios"} · {neighborhoods.join(", ")}
                    </span>
                  </span>
                  <ChevronRightIcon className="mt-0.5 shrink-0 text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="como-funciona">
          <h2 id="como-funciona" className="text-xl font-bold text-ink-900">
            Cómo funciona
          </h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title}>
                <Card className="h-full p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <Icon />
                    </span>
                    <span className="text-sm font-semibold text-ink-500">Paso {i + 1}</span>
                  </div>
                  <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
                  <p className="mt-1 text-sm text-ink-700">{text}</p>
                </Card>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-ink-500">
            En esta versión de demostración las solicitudes no se envían a nadie y todavía no se
            pueden hacer pagos.
          </p>
        </section>

        <section
          aria-labelledby="propietarios"
          className="flex flex-col gap-5 rounded-3xl bg-ink-900 p-6 text-white sm:p-10 md:flex-row md:items-center md:justify-between"
        >
          <div className="max-w-xl">
            <h2 id="propietarios" className="text-2xl font-bold">
              ¿Tenés una cochera que no usás todo el día?
            </h2>
            <p className="mt-2 text-ink-200">
              Publicala, definí tus horarios y tarifas, y aceptá solo las solicitudes que te
              sirvan.
            </p>
          </div>
          <ButtonLink href="/propietarios/publicar/" variant="accent" size="lg" className="shrink-0">
            Publicá tu cochera
          </ButtonLink>
        </section>
      </Container>
    </>
  );
}
