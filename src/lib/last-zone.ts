// Última zona buscada por esta persona, guardada en su navegador. Es solo una
// comodidad: si el almacenamiento no está disponible, se usa la zona inicial.

import { DEFAULT_MAP_ZONE } from "./geo";

const KEY = "guspot:ultima-zona";

export function getLastZone(): string | null {
  try {
    const value = window.localStorage.getItem(KEY)?.trim();
    return value ? value.slice(0, 80) : null;
  } catch {
    return null;
  }
}

export function setLastZone(zona: string): void {
  const value = zona.trim();
  if (!value) return;
  try {
    window.localStorage.setItem(KEY, value.slice(0, 80));
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): no pasa nada.
  }
}

/** Zona a usar cuando la URL no trae una: la última buscada o CABA. */
export function initialZone(): string {
  return getLastZone() ?? DEFAULT_MAP_ZONE;
}
