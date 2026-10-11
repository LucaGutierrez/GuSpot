import type { LatLng } from "@/lib/types";
import { buttonClass } from "@/components/ui/button";

/**
 * Navegación hasta el garaje con la app que la persona ya tiene (Google Maps,
 * Waze o Mapas de Apple). Son enlaces: la navegación ocurre fuera de GuSpot,
 * sin costo ni claves. Si la app no está instalada, se abre la versión web.
 * Mostrar solo a quien ya puede ver el punto exacto (reserva confirmada o aviso).
 */
export function NavigateButtons({ to }: { to: LatLng }) {
  const ll = `${to.lat},${to.lng}`;
  const google = `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=driving`;
  const waze = `https://waze.com/ul?ll=${ll}&navigate=yes`;
  const apple = `https://maps.apple.com/?daddr=${ll}&dirflg=d`;
  const link = { target: "_blank", rel: "noopener noreferrer" } as const;
  return (
    <div className="flex flex-col gap-2">
      <a href={google} {...link} className={buttonClass("primary", "lg")}>
        Iniciar navegación · Google Maps
      </a>
      <div className="grid grid-cols-2 gap-2">
        <a href={waze} {...link} className={buttonClass("secondary")}>
          Waze
        </a>
        <a href={apple} {...link} className={buttonClass("secondary")}>
          Mapas de Apple
        </a>
      </div>
    </div>
  );
}
