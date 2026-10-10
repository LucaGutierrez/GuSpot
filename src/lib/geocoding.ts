// Búsqueda de direcciones (geocodificación) desde el navegador, sin clave:
// 1. Georef (API oficial y gratuita de datos.gob.ar): normaliza direcciones de
//    Argentina y calcula el punto por la altura de la calle.
// 2. Photon (OpenStreetMap, komoot) como respaldo y para obtener el barrio.
// Ninguno tiene garantía de servicio: si fallan, la persona puede marcar el
// punto en el mapa. Para cambiar de proveedor (p. ej. Google), tocar solo este archivo.

import type { LatLng } from "./types";

export interface Province {
  id: string; // código de Georef
  name: string;
}

export const PROVINCES: Province[] = [
  { id: "02", name: "Ciudad Autónoma de Buenos Aires" },
  { id: "06", name: "Buenos Aires" },
  { id: "10", name: "Catamarca" },
  { id: "22", name: "Chaco" },
  { id: "26", name: "Chubut" },
  { id: "14", name: "Córdoba" },
  { id: "18", name: "Corrientes" },
  { id: "30", name: "Entre Ríos" },
  { id: "34", name: "Formosa" },
  { id: "38", name: "Jujuy" },
  { id: "42", name: "La Pampa" },
  { id: "46", name: "La Rioja" },
  { id: "50", name: "Mendoza" },
  { id: "54", name: "Misiones" },
  { id: "58", name: "Neuquén" },
  { id: "62", name: "Río Negro" },
  { id: "66", name: "Salta" },
  { id: "70", name: "San Juan" },
  { id: "74", name: "San Luis" },
  { id: "78", name: "Santa Cruz" },
  { id: "82", name: "Santa Fe" },
  { id: "86", name: "Santiago del Estero" },
  { id: "94", name: "Tierra del Fuego" },
  { id: "90", name: "Tucumán" },
];

export const CABA_ID = "02";

export interface AddressMatch {
  /** Línea principal: calle y altura ("Gurruchaga 1500") o nombre del lugar. */
  label: string;
  /** Línea secundaria: barrio, ciudad ("Palermo, CABA"). */
  detail: string;
  location: LatLng;
  /** Ciudad o localidad sugerida ("CABA" para la Ciudad de Buenos Aires). */
  city: string;
  /** Barrio, si se conoce. */
  neighborhood: string;
  /**
   * "exact": punto del edificio en OpenStreetMap; "street": por la altura de la
   * calle (Georef); "calle": solo la calle, falta la altura (no sirve como ubicación).
   */
  kind: "exact" | "street" | "calle";
}

/** Texto completo para guardar como dirección. */
export function fullAddress(m: AddressMatch): string {
  return [m.label, m.detail].filter(Boolean).join(", ");
}

const GEOREF = "https://apis.datos.gob.ar/georef/api/direcciones";
const PHOTON = "https://photon.komoot.io";
const AR_BBOX = "-74,-56,-53,-21";
/** CABA y alrededores, para priorizar resultados porteños. */
const CABA_BBOX = "-58.75,-34.85,-58.2,-34.45";

/** "AV SANTA FE" → "Av. Santa Fe" */
function streetCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/^Av /, "Av. ")
    .replace(/\b(De|Del|La|Las|Los|Y)\b/g, (w) => w.toLowerCase());
}

interface GeorefAddress {
  calle: { nombre: string | null };
  altura: { valor: number | null };
  localidad_censal?: { nombre: string | null };
  departamento?: { nombre: string | null };
  provincia?: { id: string | null; nombre: string | null };
  ubicacion: { lat: number | null; lon: number | null };
}

async function georef(query: string, provinceId: string, signal?: AbortSignal): Promise<AddressMatch[]> {
  const qs = new URLSearchParams({ direccion: query, provincia: provinceId, max: "5" });
  const res = await fetch(`${GEOREF}?${qs}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { direcciones?: GeorefAddress[] };
  return (data.direcciones ?? []).flatMap((d): AddressMatch[] => {
    if (d.ubicacion.lat == null || d.ubicacion.lon == null || !d.calle.nombre || !d.altura.valor) return [];
    const caba = d.provincia?.id === CABA_ID;
    const city = caba ? "CABA" : (d.localidad_censal?.nombre ?? d.departamento?.nombre ?? "");
    return [
      {
        label: `${streetCase(d.calle.nombre)} ${d.altura.valor}`,
        detail: [caba ? "" : city, caba ? "CABA" : d.provincia?.nombre].filter(Boolean).join(", "),
        location: { lat: d.ubicacion.lat, lng: d.ubicacion.lon },
        city,
        neighborhood: "",
        kind: "street",
      },
    ];
  });
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    countrycode?: string;
    type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    locality?: string;
    city?: string;
    state?: string;
  };
}

/** OpenStreetMap nombra a la Ciudad en español o en inglés según el dato. */
function isCaba(p: PhotonFeature["properties"]): boolean {
  return /aut[oó]noma de buenos aires|autonomous city of buenos aires/i.test(`${p.state ?? ""} ${p.city ?? ""}`);
}

function fromPhoton(f: PhotonFeature): AddressMatch {
  const p = f.properties;
  const caba = isCaba(p);
  const city = caba ? "CABA" : (p.city ?? p.locality ?? "");
  const neighborhood = p.district ?? (caba ? (p.locality ?? "") : "");
  const kind: AddressMatch["kind"] = p.housenumber ? "exact" : p.type === "street" ? "calle" : "exact";
  const label = p.housenumber
    ? `${p.street ?? p.name ?? ""} ${p.housenumber}`
    : (p.name ?? p.street ?? "");
  const detail = [
    p.housenumber || kind === "calle" ? "" : p.street,
    neighborhood,
    caba ? "CABA" : city,
    caba ? "" : p.state,
  ]
    .filter(Boolean)
    .join(", ");
  return {
    label,
    detail,
    location: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] },
    city,
    neighborhood,
    kind,
  };
}

async function photon(query: string, provinceId: string, signal?: AbortSignal): Promise<AddressMatch[]> {
  const caba = provinceId === CABA_ID;
  const provinceName = PROVINCES.find((p) => p.id === provinceId)?.name ?? "";
  const qs = new URLSearchParams({
    q: caba ? query : `${query}, ${provinceName}`,
    limit: "12",
    bbox: caba ? CABA_BBOX : AR_BBOX,
  });
  const res = await fetch(`${PHOTON}/api/?${qs}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? [])
    .filter((f) => f.properties.countrycode === "AR")
    .filter((f) => (caba ? isCaba(f.properties) : sameText(f.properties.state, provinceName)))
    .map(fromPhoton)
    .filter((m) => m.label);
}

function sameText(a: string | undefined, b: string): boolean {
  const n = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return !!a && n(a) === n(b);
}

function metersBetween(a: LatLng, b: LatLng): number {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

/**
 * Sugerencias mientras se escribe, como en las apps de movilidad: varias
 * opciones con su barrio para tocar la correcta. Primero las que tienen el
 * punto exacto del edificio, después las calculadas por la altura y, si
 * todavía no se escribió la altura, las calles por barrio. Nunca lanza por
 * errores de red (sí si se cancela).
 */
export async function searchAddress(query: string, provinceId: string, signal?: AbortSignal): Promise<AddressMatch[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const hasNumber = /\d/.test(q);
  const [osm, official] = await Promise.all([
    photon(q, provinceId, signal).catch((err) => {
      if (signal?.aborted) throw err;
      return [] as AddressMatch[];
    }),
    hasNumber
      ? georef(q, provinceId, signal).catch((err) => {
          if (signal?.aborted) throw err;
          return [] as AddressMatch[];
        })
      : Promise.resolve([] as AddressMatch[]),
  ]);

  const exact = osm.filter((m) => m.kind === "exact");
  const streets = official.filter((g) => !exact.some((e) => metersBetween(e.location, g.location) < 80));
  const calles = osm.filter((m) => m.kind === "calle");

  // Sin repetidos: misma calle y barrio, o la misma altura a pocos metros.
  const kept: AddressMatch[] = [];
  for (const m of [...exact, ...streets, ...calles]) {
    const dup = kept.some(
      (k) =>
        (k.label.toLowerCase() === m.label.toLowerCase() && k.neighborhood === m.neighborhood && m.kind === "calle") ||
        (k.kind !== "calle" && m.kind !== "calle" && metersBetween(k.location, m.location) < 30),
    );
    if (!dup) kept.push(m);
  }
  return kept.slice(0, 8);
}

/** Barrio y ciudad de un punto (OpenStreetMap). Devuelve null si no se pudo. */
export async function reverseLookup(p: LatLng): Promise<{ city: string; neighborhood: string } | null> {
  try {
    const res = await fetch(`${PHOTON}/reverse?lat=${p.lat}&lon=${p.lng}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: PhotonFeature[] };
    const f = data.features?.[0];
    if (!f) return null;
    const m = fromPhoton(f);
    return { city: m.city, neighborhood: m.neighborhood };
  } catch {
    return null;
  }
}

/** Enlace para ver un punto en Google Maps (sin clave: es un enlace común). */
export function googleMapsUrl(p: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}
