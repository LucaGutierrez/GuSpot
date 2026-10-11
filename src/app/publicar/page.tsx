import type { Metadata } from "next";
import Link from "next/link";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { ChevronRightIcon, HomeIcon, ParkingIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Publicar un espacio" };

/** Elegir qué tipo de espacio se publica. Cada tipo tiene su propio formulario. */
export default function PublicarPage() {
  return (
    <Container className="max-w-2xl pb-12">
      <PageHeader title="Publicar un espacio" subtitle="¿Qué tipo de espacio querés ofrecer?" />
      <div className="flex flex-col gap-4">
        <Link
          href="/mis-garages/nuevo/"
          className="group rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <Card className="flex items-center gap-4 p-5 transition-shadow group-hover:shadow-md">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <ParkingIcon width={26} height={26} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-semibold text-ink-900">Garaje o estacionamiento comercial</span>
              <span className="block text-sm text-ink-500">
                Un establecimiento con varios lugares, horarios y tarifas. Actualizás tu disponibilidad y recibís avisos
                de los conductores que van en camino.
              </span>
            </span>
            <ChevronRightIcon className="shrink-0 text-ink-400" />
          </Card>
        </Link>

        <Card aria-disabled="true" className="flex items-center gap-4 p-5 opacity-70">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-500">
            <HomeIcon width={26} height={26} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink-900">
              Cochera particular
              <span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-ink-900">Próximamente</span>
            </span>
            <span className="block text-sm text-ink-500">
              Para personas con uno o pocos lugares libres en su casa o edificio que quieren generar un ingreso. Se va a
              habilitar en una próxima etapa.
            </span>
          </span>
        </Card>
      </div>
    </Container>
  );
}
