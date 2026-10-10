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
  /** Texto para mostrar y guardar ("Av. Santa Fe 1860, Recoleta, CABA"). */
  label: string;
  location: LatLng;
  /** Ciudad o localidad sugerida ("CABA" para la Ciudad de Buenos Aires). */
  city: string;
  /** Barrio, si se conoce. */
  neighborhood: string;
}

const GEOREF = "https://apis.datos.gob.ar/georef/api/direcciones";
const PHOTON = "https://photon.komoot.io";
const AR_BBOX = "-74,-56,-53,-21";

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
  return (data.direcciones ?? []).flatMap((d) => {
    if (d.ubicacion.lat == null || d.ubicacion.lon == null || !d.calle.nombre) return [];
    const caba = d.provincia?.id === CABA_ID;
    const city = caba ? "CABA" : (d.localidad_censal?.nombre ?? d.departamento?.nombre ?? "");
    const street = `${streetCase(d.calle.nombre)}${d.altura.valor ? ` ${d.altura.valor}` : ""}`;
    return [
      {
        label: [street, city, caba ? "" : d.provincia?.nombre].filter(Boolean).join(", "),
        location: { lat: d.ubicacion.lat, lng: d.ubicacion.lon },
        city,
        neighborhood: "",
      },
    ];
  });
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    countrycode?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    locality?: string;
    city?: string;
    state?: string;
  };
}

function fromPhoton(f: PhotonFeature): AddressMatch {
  const p = f.properties;
  const caba = /autónoma de buenos aires/i.test(p.state ?? "") || /autónoma de buenos aires/i.test(p.city ?? "");
  const city = caba ? "CABA" : (p.city ?? p.locality ?? "");
  const neighborhood = p.district ?? (caba ? (p.locality ?? "") : "");
  const street = p.street ? `${p.street}${p.housenumber ? ` ${p.housenumber}` : ""}` : (p.name ?? "");
  return {
    label: [street, neighborhood, city].filter(Boolean).join(", "),
    location: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] },
    city,
    neighborhood,
  };
}

async function photon(query: string, provinceName: string, signal?: AbortSignal): Promise<AddressMatch[]> {
  const qs = new URLSearchParams({ q: `${query}, ${provinceName}, Argentina`, limit: "5", bbox: AR_BBOX });
  const res = await fetch(`${PHOTON}/api/?${qs}`, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? []).filter((f) => f.properties.countrycode === "AR").map(fromPhoton);
}

/** Sugerencias para "calle y altura" dentro de una provincia. Nunca lanza por errores de red. */
export async function searchAddress(query: string, provinceId: string, signal?: AbortSignal): Promise<AddressMatch[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const provinceName = PROVINCES.find((p) => p.id === provinceId)?.name ?? "";
  try {
    const official = await georef(q, provinceId, signal);
    if (official.length) return official;
  } catch (err) {
    if (signal?.aborted) throw err;
  }
  try {
    return await photon(q, provinceName, signal);
  } catch (err) {
    if (signal?.aborted) throw err;
    return [];
  }
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
