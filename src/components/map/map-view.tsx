"use client";

// Mapa interactivo de GuSpot con MapLibre GL JS y mapas base de OpenFreeMap.
// La biblioteca se carga solo en el cliente (import dinámico dentro de un
// efecto), así no se evalúa durante la exportación estática.
// Contrato con las pantallas: ./types.ts.

import "maplibre-gl/dist/maplibre-gl.css";
import "./map-view.css";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { LngLatLike, Map as MapLibreMap, Marker } from "maplibre-gl";
import type { LatLng } from "@/lib/types";
import type { MapMarker, MapViewProps } from "./types";

type MapLibreModule = typeof import("maplibre-gl");
type Padding = NonNullable<MapViewProps["padding"]>;

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const WORKER_URL = "/vendor/maplibre-gl-worker.mjs";
const MAX_FIT_ZOOM = 15;
const SINGLE_ZOOM = 15;
const EMPTY_ZOOM = 12.5;
/** Si el estilo no termina de cargar en este tiempo, mostramos el error. */
const LOAD_TIMEOUT_MS = 20000;
/** Alto aproximado de la píldora (con punta) por encima del punto. */
const PILL_HEIGHT = 44;
/** Margen extra para que las píldoras no queden pegadas al borde. */
const EDGE_MARGIN = 16;
/** Medio ancho aproximado de una píldora. */
const PILL_HALF_WIDTH = 48;
/** Alto aproximado de la atribución desplegada. */
const ATTRIBUTION_HEIGHT = 28;

const NO_PADDING: Padding = { top: 0, right: 0, bottom: 0, left: 0 };

const LOCALE_ES: Record<string, string> = {
  "AttributionControl.ToggleAttribution": "Mostrar u ocultar la atribución",
  "AttributionControl.MapFeedback": "Reportar un error en el mapa",
  "Map.Title": "Mapa",
  "Marker.Title": "Marcador",
  "NavigationControl.ZoomIn": "Acercar",
  "NavigationControl.ZoomOut": "Alejar",
  "NavigationControl.ResetBearing": "Orientar al norte",
};

let workerConfigured = false;

type Status = "loading" | "ready" | "error";

interface MarkerRecord {
  marker: Marker;
  el: HTMLButtonElement;
  pill: HTMLSpanElement;
  data: MapMarker;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function toLngLat(p: LatLng): [number, number] {
  return [p.lng, p.lat];
}

/** Padding de encuadre: lo que tapan otros elementos + espacio para las píldoras. */
function fitPadding(map: MapLibreMap, p: Padding): Padding {
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  const pad = {
    top: p.top + PILL_HEIGHT + EDGE_MARGIN,
    right: p.right + PILL_HALF_WIDTH + EDGE_MARGIN,
    bottom: p.bottom + EDGE_MARGIN,
    left: p.left + PILL_HALF_WIDTH + EDGE_MARGIN,
  };
  // Si el padding no entra en el contenedor, lo achicamos proporcionalmente.
  const maxH = Math.max(0, h - 40);
  const maxW = Math.max(0, w - 40);
  if (pad.top + pad.bottom > maxH) {
    const k = maxH / (pad.top + pad.bottom);
    pad.top *= k;
    pad.bottom *= k;
  }
  if (pad.left + pad.right > maxW) {
    const k = maxW / (pad.left + pad.right);
    pad.left *= k;
    pad.right *= k;
  }
  return pad;
}

function createMarkerElement(): { el: HTMLButtonElement; pill: HTMLSpanElement } {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "gs-map-marker";
  const pill = document.createElement("span");
  pill.className = "gs-map-pill";
  el.appendChild(pill);
  return { el, pill };
}

/** Encuadra todos los marcadores (y la ubicación si corresponde). Devuelve false si el contenedor no tiene tamaño. */
function fitAll(ml: MapLibreModule, m: MapLibreMap, p: MapViewProps, instant: boolean): boolean {
  const container = m.getContainer();
  if (container.clientWidth === 0 || container.clientHeight === 0) return false;

  const points: LatLng[] = p.markers.map((mk) => mk.position);
  if (p.includeUserInFit && p.userLocation) points.push(p.userLocation);

  const pad = fitPadding(m, p.padding ?? NO_PADDING);
  const duration = instant || prefersReducedMotion() ? 0 : 600;
  // Desplazamiento del centro para compensar lo que tapan barra y tarjeta.
  const offset: [number, number] = [(pad.left - pad.right) / 2, (pad.top - pad.bottom) / 2];

  m.stop();
  if (points.length === 0) {
    m.easeTo({ center: toLngLat(p.fallbackCenter), zoom: EMPTY_ZOOM, offset, duration });
  } else if (points.length === 1) {
    m.easeTo({ center: toLngLat(points[0]), zoom: SINGLE_ZOOM, offset, duration });
  } else {
    const bounds = new ml.LngLatBounds(toLngLat(points[0]), toLngLat(points[0]));
    for (const pt of points) bounds.extend(toLngLat(pt));
    const camera = m.cameraForBounds(bounds, { padding: pad, maxZoom: MAX_FIT_ZOOM });
    if (p.minFitZoom !== undefined && camera?.zoom !== undefined && camera.zoom < p.minFitZoom) {
      // Centro de masa de los puntos: queda donde hay más garages, no en el medio del rectángulo.
      const lat = points.reduce((a, pt) => a + pt.lat, 0) / points.length;
      const lng = points.reduce((a, pt) => a + pt.lng, 0) / points.length;
      m.easeTo({ center: [lng, lat], zoom: p.minFitZoom, offset, duration });
    } else {
      m.fitBounds(bounds, { padding: pad, maxZoom: MAX_FIT_ZOOM, duration });
    }
  }
  return true;
}

function attachMarkerHandlers(
  el: HTMLButtonElement,
  id: string,
  propsRef: { readonly current: MapViewProps },
) {
  let down: { x: number; y: number } | null = null;
  el.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY };
  });
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    // Si el gesto fue un arrastre del mapa que empezó sobre la píldora, no seleccionamos.
    const start = down;
    down = null;
    if (start && e.detail > 0 && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
    propsRef.current.onSelect(id);
  });
  // Doble toque sobre un marcador no debe hacer zoom.
  el.addEventListener("dblclick", (e) => e.stopPropagation());
}

export function MapView(props: MapViewProps) {
  const { className = "", padding = NO_PADDING } = props;

  const canvasRef = useRef<HTMLDivElement>(null);
  const mlRef = useRef<MapLibreModule | null>(null);
  const markersRef = useRef(new Map<string, MarkerRecord>());
  const userMarkerRef = useRef<Marker | null>(null);
  const pendingFitRef = useRef(false);
  const firstFitRef = useRef(true);
  // Últimos props, para leerlos desde los manejadores del mapa sin recrearlo.
  const propsRef = useRef(props);

  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    propsRef.current = props;
  });

  // ---------- Creación del mapa (una sola vez por montaje) ----------
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const markerRecords = markersRef.current;

    let cancelled = false;
    let instance: MapLibreMap | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const fail = () => {
      if (!cancelled) setStatus("error");
    };

    (async () => {
      let ml: MapLibreModule;
      try {
        ml = await import("maplibre-gl");
      } catch {
        fail();
        return;
      }
      if (cancelled) return;
      mlRef.current = ml;

      if (!workerConfigured) {
        ml.setWorkerUrl(WORKER_URL);
        workerConfigured = true;
      }

      const { fallbackCenter } = propsRef.current;
      try {
        instance = new ml.Map({
          container,
          style: STYLE_URL,
          center: toLngLat(fallbackCenter),
          zoom: EMPTY_ZOOM,
          minZoom: 3,
          maxZoom: 19,
          // Sin rotación ni inclinación: mapa plano, como en apps de movilidad.
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          rollEnabled: false,
          maxPitch: 0,
          attributionControl: { compact: true },
          maplibreLogo: false,
          locale: LOCALE_ES,
          // El ResizeObserver de abajo cubre cambios del contenedor (no solo de la ventana).
          trackResize: false,
        });
      } catch {
        // Sin WebGL (GPUInitializationError) u otro fallo al crear el mapa.
        fail();
        return;
      }
      const m = instance;
      m.touchZoomRotate.disableRotation();
      m.keyboard.disableRotation();

      const nav = new ml.NavigationControl({ showCompass: false, showZoom: true });
      m.addControl(nav, "bottom-right");
      container
        .querySelector(".maplibregl-ctrl-zoom-in")
        ?.parentElement?.classList.add("gs-map-zoom");

      let loaded = false;
      m.on("load", () => {
        loaded = true;
        clearTimeout(timeout);
        if (!cancelled) setStatus("ready");
      });
      m.on("error", (e) => {
        // Después de la carga inicial no rompemos el mapa (p. ej. una tesela que falla).
        if (loaded) return;
        // Errores de teselas/fuentes: los ignoramos; si nada carga, actúa el timeout.
        if ("sourceId" in e || "tile" in e) return;
        const url = (e.error as { url?: unknown } | undefined)?.url;
        if (typeof url === "string" && url !== STYLE_URL) return;
        // El estilo no llegó (red caída, 4xx/5xx, JSON inválido).
        fail();
      });
      timeout = setTimeout(() => {
        if (!loaded) fail();
      }, LOAD_TIMEOUT_MS);

      // Tocar el fondo del mapa deselecciona (los marcadores se excluyen).
      m.on("click", (e) => {
        const target = e.originalEvent.target;
        if (target instanceof Element && target.closest(".gs-map-marker")) return;
        propsRef.current.onSelect(null);
      });

      resizeObserver = new ResizeObserver(() => {
        if (cancelled) return;
        m.resize();
        const { clientWidth, clientHeight } = container;
        if (pendingFitRef.current && clientWidth > 0 && clientHeight > 0) {
          pendingFitRef.current = !fitAll(ml, m, propsRef.current, true);
        }
      });
      resizeObserver.observe(container);

      setMap(m);
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      resizeObserver?.disconnect();
      markerRecords.forEach((r) => r.marker.remove());
      markerRecords.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      instance?.remove();
      instance = null;
      firstFitRef.current = true;
      pendingFitRef.current = false;
      setMap(null);
    };
  }, []);

  // ---------- Marcadores: alta, baja y actualización por id ----------
  const { markers, selectedId } = props;
  useEffect(() => {
    const ml = mlRef.current;
    if (!map || !ml) return;
    const records = markersRef.current;
    const seen = new Set<string>();

    for (const data of markers) {
      seen.add(data.id);
      const existing = records.get(data.id);
      if (!existing) {
        const { el, pill } = createMarkerElement();
        pill.textContent = data.label;
        el.setAttribute("aria-label", data.ariaLabel);
        attachMarkerHandlers(el, data.id, propsRef);
        const marker = new ml.Marker({ element: el, anchor: "bottom" })
          .setLngLat(toLngLat(data.position))
          .addTo(map);
        records.set(data.id, { marker, el, pill, data });
        continue;
      }
      const prev = existing.data;
      if (prev.label !== data.label) existing.pill.textContent = data.label;
      if (prev.ariaLabel !== data.ariaLabel) existing.el.setAttribute("aria-label", data.ariaLabel);
      if (prev.position.lat !== data.position.lat || prev.position.lng !== data.position.lng) {
        existing.marker.setLngLat(toLngLat(data.position));
      }
      existing.data = data;
    }

    for (const [id, rec] of records) {
      if (!seen.has(id)) {
        rec.marker.remove();
        records.delete(id);
      }
    }

    // Orden de tabulación = orden de la lista.
    // Se reordena solo si hace falta (mover un elemento con foco lo desenfoca).
    const canvasContainer = map.getCanvasContainer();
    const desired = markers.flatMap((d) => records.get(d.id)?.el ?? []);
    const current = Array.from(canvasContainer.querySelectorAll(":scope > .gs-map-marker"));
    if (desired.some((el, i) => current[i] !== el)) {
      for (const el of desired) canvasContainer.appendChild(el);
    }

    applySelection(records, propsRef.current.selectedId);
  }, [map, markers]);

  // ---------- Selección ----------
  useEffect(() => {
    if (!map) return;
    const records = markersRef.current;
    applySelection(records, selectedId);
    if (!selectedId) return;
    const rec = records.get(selectedId);
    if (!rec) return;
    ensureVisible(map, rec.data.position, propsRef.current.padding ?? NO_PADDING);
  }, [map, selectedId]);

  // La tarjeta inferior aparece (y se mide) después de seleccionar: cuando
  // cambia el padding, volvemos a asegurar que el marcador elegido no quede tapado.
  useEffect(() => {
    if (!map || !selectedId) return;
    const rec = markersRef.current.get(selectedId);
    if (rec) ensureVisible(map, rec.data.position, padding);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, padding.top, padding.right, padding.bottom, padding.left]);

  // ---------- Encuadre al montar y cada vez que cambia fitKey ----------
  const { fitKey } = props;
  useEffect(() => {
    const ml = mlRef.current;
    if (!map || !ml) return;
    const instant = firstFitRef.current;
    firstFitRef.current = false;
    // Si el contenedor está oculto (p. ej. pestaña de lista), se encuadra al mostrarse.
    pendingFitRef.current = !fitAll(ml, map, propsRef.current, instant);
  }, [map, fitKey]);

  // ---------- Ubicación del conductor ----------
  const userLat = props.userLocation?.lat;
  const userLng = props.userLocation?.lng;
  useEffect(() => {
    const ml = mlRef.current;
    if (!map || !ml) return;
    if (userLat === undefined || userLng === undefined) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLng, userLat]);
      return;
    }
    const el = document.createElement("div");
    el.className = "gs-map-user";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "Tu ubicación");
    userMarkerRef.current = new ml.Marker({ element: el, anchor: "center" })
      .setLngLat([userLng, userLat])
      .addTo(map);
  }, [map, userLat, userLng]);

  const style = {
    "--gs-map-pad-top": `${padding.top}px`,
    "--gs-map-pad-bottom": `${padding.bottom}px`,
  } as CSSProperties;

  return (
    <div className={`gs-map h-full w-full ${className}`} style={style}>
      <div ref={canvasRef} className="gs-map-canvas" />

      {status !== "error" && (
        <div
          aria-hidden="true"
          className={`gs-map-skeleton ${status === "ready" ? "is-hidden" : ""}`}
        />
      )}
      {status === "loading" && <span className="sr-only">Cargando el mapa…</span>}

      {status === "error" && (
        <div
          role="status"
          className="absolute inset-0 z-30 grid place-items-center bg-ink-100 p-6 text-center"
        >
          <div className="max-w-xs">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="mx-auto mb-3 h-8 w-8 text-ink-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
              <path d="M9 4v14M15 6v14" />
            </svg>
            <p className="text-sm font-medium text-ink-700">
              No pudimos cargar el mapa. Podés ver los resultados en la lista.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function applySelection(records: Map<string, MarkerRecord>, selectedId: string | null) {
  for (const [id, rec] of records) {
    const selected = id === selectedId;
    rec.el.classList.toggle("is-selected", selected);
    if (selected) rec.el.setAttribute("aria-pressed", "true");
    else rec.el.setAttribute("aria-pressed", "false");
  }
}

/** Si el punto quedó fuera del área visible (descontando el padding), lo trae a la vista sin cambiar el zoom. */
function ensureVisible(map: MapLibreMap, position: LatLng, p: Padding) {
  const container = map.getContainer();
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (w === 0 || h === 0) return;

  const lngLat: LngLatLike = toLngLat(position);
  const pt = map.project(lngLat);

  // Área donde la píldora seleccionada se ve completa.
  const minX = p.left + PILL_HALF_WIDTH + EDGE_MARGIN;
  const maxX = w - p.right - PILL_HALF_WIDTH - EDGE_MARGIN;
  const minY = p.top + PILL_HEIGHT + EDGE_MARGIN + 8;
  // Reserva lugar para la línea de atribución, que queda justo sobre la tarjeta.
  const maxY = h - p.bottom - EDGE_MARGIN - ATTRIBUTION_HEIGHT;

  let dx = 0;
  let dy = 0;
  if (minX > maxX) dx = pt.x - (p.left + (w - p.left - p.right) / 2);
  else if (pt.x < minX) dx = pt.x - minX;
  else if (pt.x > maxX) dx = pt.x - maxX;
  if (minY > maxY) dy = pt.y - (p.top + (h - p.top - p.bottom) / 2);
  else if (pt.y < minY) dy = pt.y - minY;
  else if (pt.y > maxY) dy = pt.y - maxY;

  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

  // Desplazar la cámara (dx, dy) mueve el punto en (-dx, -dy) en pantalla.
  const center = map.unproject([w / 2 + dx, h / 2 + dy]);
  map.easeTo({ center, duration: prefersReducedMotion() ? 0 : 450 });
}
