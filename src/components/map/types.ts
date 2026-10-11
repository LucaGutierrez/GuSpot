// Contrato entre el componente de mapa (src/components/map/**) y las pantallas
// que lo usan (src/components/explore/**). Lo mantiene el coordinador: si hace
// falta cambiarlo, se acuerda antes de tocarlo.

import type { LatLng } from "@/lib/types";

export interface MapMarker {
  id: string;
  position: LatLng;
  /** Texto del marcador, normalmente el precio ("$ 15.000"). */
  label: string;
  /** Nombre accesible del marcador (lector de pantalla). */
  ariaLabel: string;
  /** Garaje comercial (marca distinta de las cocheras particulares). */
  variant?: "garage" | "cochera";
  /** Disponibilidad: color del ícono del garaje. */
  tone?: "ok" | "few" | "none" | "closed";
  /** Estado corto junto al precio ("5 libres", "Lleno", "Cerrado"). */
  badge?: string;
  /** Nombre del garaje: se muestra arriba del marcador cuando está elegido. */
  name?: string;
}

/** Rectángulo visible del mapa (grados). */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewProps {
  markers: MapMarker[];
  selectedId: string | null;
  /** Se llama al tocar un marcador (id) o el fondo del mapa (null). */
  onSelect: (id: string | null) => void;
  /**
   * Cada vez que cambia este valor, el mapa se encuadra para mostrar todos los
   * marcadores (o `fallbackCenter` si no hay ninguno). Usarlo al cambiar la
   * búsqueda y para el botón "volver a centrar".
   */
  fitKey: string;
  /** Centro a usar cuando no hay marcadores que encuadrar. */
  fallbackCenter: LatLng;
  /** Ubicación del conductor si dio permiso; se dibuja como punto azul. */
  userLocation: LatLng | null;
  /**
   * Zoom mínimo al encuadrar. Si para mostrar todos los marcadores habría que
   * alejarse más, se centra en ellos con este zoom (en celular evita que las
   * píldoras de precio se amontonen; el resto se ve moviendo el mapa).
   */
  minFitZoom?: number;
  /** Si es true, el encuadre de `fitKey` incluye también `userLocation`. */
  includeUserInFit?: boolean;
  /**
   * Espacio en píxeles que tapan otros elementos sobre el mapa (barra de
   * búsqueda arriba, tarjeta inferior abajo). Se usa como padding al encuadrar
   * y al centrar el marcador seleccionado, para que nunca quede tapado.
   */
  padding?: { top: number; right: number; bottom: number; left: number };
  /**
   * Se llama cuando la PERSONA termina de mover o hacer zoom en el mapa (no
   * cuando lo mueve el encuadre automático), con el rectángulo visible.
   * Sirve para ofrecer "Buscar en esta zona".
   */
  onUserMove?: (bounds: MapBounds) => void;
  className?: string;
}
