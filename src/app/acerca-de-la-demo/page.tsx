import type { Metadata } from "next";
import { Card, Container, PageHeader } from "@/components/ui/card";
import { CheckIcon, InfoIcon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Qué incluye la demo" };

const works = [
  "Mapa interactivo como pantalla principal: mover, acercar, tocar un garage y ver su tarjeta.",
  "Búsqueda por ciudad o barrio, fecha y horario sobre espacios de ejemplo; recuerda la última zona buscada.",
  "Ubicación del dispositivo, solo si tocás \"Mi ubicación\" y das permiso (no se guarda ni se envía).",
  "Cálculo de precio por hora, tarifa diaria y mínimo de horas.",
  "Verificación de disponibilidad según el horario semanal de cada espacio.",
  "Navegación entre el mapa, la lista, el detalle, la solicitud, mis reservas y la sección de propietarios.",
  "Diseño adaptable a celulares y escritorio.",
];

const demoOnly = [
  "Espacios, propietarios, precios, reseñas y reservas: son datos de ejemplo.",
  "Fotos: son ilustraciones; la carga de fotos no está implementada.",
  "Solicitudes de reserva, aceptar/rechazar y publicar: no se guardan ni notifican a nadie.",
  "Cuentas de usuario e inicio de sesión: no existen todavía.",
  "Códigos de llegada: no se generan; solo se muestra cómo se verán.",
  "Ubicaciones del mapa: puntos aproximados (100–200 m) de garages ficticios. La dirección exacta no se muestra porque requiere una reserva confirmada y pagada.",
];

const notIntegrated = [
  "Pagos con Mercado Pago o tarjetas (requisito para el lanzamiento público).",
  "Búsqueda por dirección (geocodificación).",
  "Mapas con garantía de disponibilidad: la demo usa OpenFreeMap, gratuito pero sin SLA.",
  "Mensajes, emails y notificaciones.",
  "Políticas de cancelación, verificación de propietarios y aspectos legales: a definir.",
];

function List({ items, icon }: { items: string[]; icon: "check" | "info" }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((text) => (
        <li key={text} className="flex gap-2 text-ink-700">
          {icon === "check" ? (
            <CheckIcon className="mt-0.5 shrink-0 text-emerald-600" />
          ) : (
            <InfoIcon className="mt-0.5 shrink-0 text-ink-400" />
          )}
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AboutDemoPage() {
  return (
    <Container className="max-w-3xl">
      <PageHeader
        title="Qué incluye esta demo"
        subtitle="GuSpot está en etapa de prototipo. Esta versión sirve para ver la experiencia y dar feedback."
      />
      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="font-semibold text-ink-900">Funciona en esta demo</h2>
          <List items={works} icon="check" />
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-ink-900">Es solo demostración</h2>
          <List items={demoOnly} icon="info" />
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-ink-900">Todavía no integrado</h2>
          <List items={notIntegrated} icon="info" />
        </Card>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink href="/">Buscar en el mapa</ButtonLink>
        <ButtonLink href="/propietarios/" variant="secondary">
          Ver sección de propietarios
        </ButtonLink>
      </div>
    </Container>
  );
}
