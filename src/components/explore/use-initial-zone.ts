"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_MAP_ZONE } from "@/lib/geo";
import { initialZone } from "@/lib/last-zone";

// La zona guardada no cambia mientras la pantalla está abierta (la escribe esta
// misma pantalla al buscar, y en ese caso la URL ya trae la zona).
const subscribe = () => () => {};
// En el build estático y durante la hidratación se usa CABA; después, la
// última zona buscada en este navegador.
const getServerSnapshot = () => DEFAULT_MAP_ZONE;

/**
 * Zona a mostrar cuando la URL no trae `zona`: la última buscada o CABA. Se lee
 * solo en el navegador, sin romper la hidratación.
 */
export function useInitialZone(): string {
  return useSyncExternalStore(subscribe, initialZone, getServerSnapshot);
}
