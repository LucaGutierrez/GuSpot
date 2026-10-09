// Proveedor de mapas base. Es el ÚNICO lugar a cambiar para usar otro.
//
// Demo: instancia pública de OpenFreeMap (sin clave, sin límite de vistas,
// uso comercial permitido según su documentación) — pero SIN garantía de
// disponibilidad (SLA). Ver docs/mapas.md.
//
// Para cambiar de proveedor sin tocar código, definir en el entorno del build:
//   NEXT_PUBLIC_MAP_STYLE_URL=<URL de un estilo compatible con MapLibre>
// (p. ej. un plan pago con SLA o mapas propios con PMTiles). Si el proveedor
// usa clave, va en esa URL y queda visible en el navegador: usar una clave
// restringida por dominio, nunca una secreta.

const DEFAULT_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

export const MAP_STYLE_URL: string =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL?.trim() || DEFAULT_STYLE_URL;

/** Origen del proveedor, para abrir la conexión antes de cargar el mapa. */
export const MAP_ORIGIN: string = new URL(MAP_STYLE_URL).origin;
