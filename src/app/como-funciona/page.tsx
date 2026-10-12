import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/card";
import {
  CheckIcon,
  KeyIcon,
  ParkingIcon,
  PinIcon,
  SearchIcon,
  ShieldIcon,
  TicketIcon,
  WalletIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description: "Cómo encontrar estacionamiento en GuSpot y cómo sumar tu garaje.",
};

const DRIVER_STEPS = [
  {
    icon: SearchIcon,
    title: "Buscá cerca tuyo",
    text: "En el mapa ves los garajes de la zona con su precio por hora y si tienen lugar, informado en vivo por cada garaje.",
  },
  {
    icon: PinIcon,
    title: "¿Vas ahora? Avisá que vas",
    text: "Con “Voy a este” el garaje sabe que llegás y te ve en su panel. Ves la dirección y cómo entrar. Avisar no reserva el lugar.",
  },
  {
    icon: TicketIcon,
    title: "¿Querés asegurarte el lugar? Reservá",
    text: "Elegí desde ahora o para otro día, y pagá con Mercado Pago. La reserva se confirma sola cuando se aprueba el pago.",
  },
];

const GARAGE_STEPS = [
  {
    icon: ParkingIcon,
    title: "Publicá tu garaje",
    text: "Cargá ubicación, tarifas, horario, capacidad y fotos. Verificamos tu identidad y tu celular antes de publicar.",
  },
  {
    icon: KeyIcon,
    title: "Actualizá tu disponibilidad",
    text: "Desde el panel sumás o restás lugares con un toque, pausás la recepción y ves quién va en camino.",
  },
  {
    icon: WalletIcon,
    title: "Cobrá las reservas",
    text: "Conectá tu cuenta de Mercado Pago: el pago de cada reserva entra directo en tu cuenta.",
  },
];

function Steps({ steps }: { steps: typeof DRIVER_STEPS }) {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {steps.map(({ icon: Icon, title, text }, i) => (
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
  );
}

export default function ComoFuncionaPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-ink-50">
        <Container className="py-10 md:py-16">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
              <ParkingIcon /> Estacionamiento en toda la Argentina
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 md:text-4xl">
              Encontrá dónde estacionar, con lugar y precio a la vista
            </h1>
            <p className="mt-3 text-lg text-ink-700">
              GuSpot te muestra los garajes cerca tuyo con sus lugares libres en vivo. Vas en el momento o reservás y
              pagás desde el celular.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/" size="lg">
                <SearchIcon /> Buscar en el mapa
              </ButtonLink>
              <ButtonLink href="/publicar/" size="lg" variant="secondary">
                Sumar mi garaje
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <Container className="space-y-12 py-10">
        <section aria-labelledby="conductores" className="space-y-4">
          <h2 id="conductores" className="text-2xl font-bold tracking-tight text-ink-900">
            Si buscás dónde estacionar
          </h2>
          <Steps steps={DRIVER_STEPS} />
          <ul className="space-y-1 text-sm text-ink-700">
            <li className="flex gap-2">
              <CheckIcon className="shrink-0 text-brand-600" /> Ves el total antes de pagar: tarifa del garaje + cargo de
              servicio.
            </li>
            <li className="flex gap-2">
              <CheckIcon className="shrink-0 text-brand-600" /> Si te equivocaste, cancelá en los primeros minutos y te
              devolvemos todo.
            </li>
          </ul>
        </section>

        <section aria-labelledby="garages" className="space-y-4">
          <h2 id="garages" className="text-2xl font-bold tracking-tight text-ink-900">
            Si tenés un garaje o estacionamiento
          </h2>
          <Steps steps={GARAGE_STEPS} />
          <p className="text-sm text-ink-500">Las cocheras particulares se van a poder sumar más adelante.</p>
        </section>

        <section aria-labelledby="seguridad">
          <Card className="flex gap-4 p-5">
            <ShieldIcon className="mt-0.5 shrink-0 text-brand-600" />
            <div>
              <h2 id="seguridad" className="font-semibold text-ink-900">
                Personas verificadas
              </h2>
              <p className="mt-1 text-sm text-ink-700">
                Quien reserva y quien publica verifica su identidad con su DNI y una foto de su cara. Al garaje le
                llegan el nombre y los datos del vehículo de quien va. Tus documentos no se muestran a nadie.
              </p>
            </div>
          </Card>
        </section>
      </Container>
    </>
  );
}
