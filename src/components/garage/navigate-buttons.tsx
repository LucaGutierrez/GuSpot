"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { LatLng } from "@/lib/types";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/**
 * Botón "Ir": pensado para quien va manejando, un solo toque abre la app de
 * mapas con la navegación hasta el garaje. Sin preferencia, Google Maps; la app
 * se cambia en Tu cuenta → App para ir (queda en este navegador).
 * Son enlaces: la navegación ocurre fuera de GuSpot, sin costo ni claves. Si
 * la app no está instalada, se abre la versión web.
 * Lleva al punto del mapa (público); la dirección escrita y las indicaciones
 * siguen siendo solo para reserva confirmada o aviso.
 */

type NavApp = "google" | "waze" | "apple" | "otra";

const KEY = "guspot:navegacion";

const NAMES: Record<NavApp, string> = {
  google: "Google Maps",
  waze: "Waze",
  apple: "Mapas de Apple",
  otra: "tu app de mapas",
};

function navUrl(app: NavApp, to: LatLng): string {
  const ll = `${to.lat},${to.lng}`;
  switch (app) {
    case "google":
      return `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=driving&dir_action=navigate`;
    case "waze":
      return `https://waze.com/ul?ll=${ll}&navigate=yes`;
    case "apple":
      return `https://maps.apple.com/?daddr=${ll}&dirflg=d`;
    case "otra":
      // Android ofrece elegir entre las apps de mapas instaladas.
      return `geo:${ll}?q=${ll}`;
  }
}

/** Apps que tienen sentido en este equipo. */
function availableApps(): NavApp[] {
  const ua = navigator.userAgent;
  const apple = /iPhone|iPad|iPod|Macintosh/i.test(ua);
  const android = /Android/i.test(ua);
  return ["google", "waze", ...(apple ? (["apple"] as const) : []), ...(android ? (["otra"] as const) : [])];
}

function savedApp(apps: NavApp[]): NavApp | null {
  try {
    const v = window.localStorage.getItem(KEY) as NavApp | null;
    return v && apps.includes(v) ? v : null;
  } catch {
    return null;
  }
}

function saveApp(app: NavApp) {
  try {
    window.localStorage.setItem(KEY, app);
  } catch {
    // Sin almacenamiento: se vuelve a preguntar la próxima vez.
  }
}

// El equipo y la preferencia guardada no cambian con la pantalla abierta.
const subscribe = () => () => {};

/** "geo:" lo abre el sistema; las demás, en otra pestaña o en la app. */
const linkProps = (a: NavApp) => (a === "otra" ? {} : ({ target: "_blank", rel: "noopener noreferrer" } as const));

/** App para ir: la elegida o, si no hay, Google Maps. */
function useNavApp() {
  // En el build estático y la hidratación: las apps comunes, sin preferencia.
  const appsKey = useSyncExternalStore(subscribe, () => availableApps().join(","), () => "google,waze");
  const apps = useMemo(() => appsKey.split(",") as NavApp[], [appsKey]);
  const stored = useSyncExternalStore(subscribe, () => savedApp(apps) ?? "", () => "");
  const [chosen, setChosen] = useState<NavApp | null>(null);
  const app: NavApp = chosen ?? (stored ? (stored as NavApp) : "google");
  const choose = (a: NavApp) => {
    saveApp(a);
    setChosen(a);
  };
  return { apps, app, choose };
}

/** Botón "Ir" de un toque (ficha del mapa, detalle, reserva, aviso). */
export function GoButton({
  to,
  size = "lg",
  className = "",
}: {
  to: LatLng;
  size?: "md" | "lg";
  className?: string;
}) {
  const { app } = useNavApp();
  return (
    <a
      href={navUrl(app, to)}
      {...linkProps(app)}
      aria-label={`Ir con ${NAMES[app]}`}
      className={buttonClass("primary", size, className)}
    >
      <NavigationIcon /> Ir
    </a>
  );
}

/** Versión de la reserva confirmada y el aviso: "Ir con Waze" y enlace para cambiar la app. */
export function NavigateButtons({ to }: { to: LatLng }) {
  const { app } = useNavApp();
  return (
    <div className="flex flex-col items-center gap-1">
      <a href={navUrl(app, to)} {...linkProps(app)} className={buttonClass("primary", "lg", "w-full")}>
        <NavigationIcon /> Ir con {NAMES[app]}
      </a>
      <Link href="/cuenta/navegacion/" className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline">
        Cambiar app
      </Link>
    </div>
  );
}

/** Elección de la app para ir (Tu cuenta → App para ir). */
export function NavAppPicker() {
  const { apps, app, choose } = useNavApp();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">App para ir</legend>
      {apps.map((a) => (
        <label
          key={a}
          className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3.5 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
        >
          <input
            type="radio"
            name="nav-app"
            checked={a === app}
            onChange={() => choose(a)}
            className="h-4 w-4 accent-brand-600"
          />
          <span className="font-medium text-ink-900">{a === "otra" ? "La app de mapas del celular" : NAMES[a]}</span>
        </label>
      ))}
    </fieldset>
  );
}

function NavigationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z" />
    </svg>
  );
}
