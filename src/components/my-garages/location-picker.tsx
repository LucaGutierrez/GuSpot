"use client";

// Mapa para que el propietario marque el punto EXACTO de su garage (privado).
// Tocar el mapa mueve el pin; también se puede arrastrar. Si el garage ya fue
// guardado, se muestra además el punto público aproximado que calculó la base.

import "maplibre-gl/dist/maplibre-gl.css";
import "@/components/map/map-view.css";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import type { LatLng } from "@/lib/types";
import { DEFAULT_CENTER } from "@/lib/geo";
import { MAP_STYLE_URL } from "@/components/map/config";
import { Button } from "@/components/ui/button";

const WORKER_URL = "/vendor/maplibre-gl-worker.mjs";

function toLngLat(p: LatLng): [number, number] {
  return [p.lng, p.lat];
}

function round(p: { lat: number; lng: number }): LatLng {
  return { lat: Math.round(p.lat * 1e6) / 1e6, lng: Math.round(p.lng * 1e6) / 1e6 };
}

function pinElement(kind: "exact" | "public"): HTMLDivElement {
  const el = document.createElement("div");
  if (kind === "exact") {
    el.style.cssText =
      "width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#2453e0;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:grab";
  } else {
    el.style.cssText =
      "width:18px;height:18px;border-radius:50%;background:rgba(245,179,1,.35);border:2px solid #9a6700";
    el.title = "Punto público aproximado";
  }
  return el;
}

export function LocationPicker({
  value,
  onChange,
  publicLocation,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  /** Punto público ya calculado por la base (solo informativo). */
  publicLocation?: LatLng | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const publicRef = useRef<Marker | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const onChangeRef = useRef(onChange);
  const initialRef = useRef(value);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    (async () => {
      const container = containerRef.current;
      if (!container) return;
      let ml: typeof import("maplibre-gl");
      try {
        ml = await import("maplibre-gl");
      } catch {
        if (!cancelled) setStatus("error");
        return;
      }
      if (cancelled) return;
      mlRef.current = ml;
      ml.setWorkerUrl(WORKER_URL);
      const start = initialRef.current;
      try {
        map = new ml.Map({
          container,
          style: MAP_STYLE_URL,
          center: toLngLat(start ?? DEFAULT_CENTER),
          zoom: start ? 16 : 12,
          minZoom: 3,
          maxZoom: 19,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          maxPitch: 0,
          attributionControl: { compact: true },
          maplibreLogo: false,
        });
      } catch {
        setStatus("error");
        return;
      }
      const m = map;
      m.touchZoomRotate.disableRotation();
      m.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      m.on("load", () => !cancelled && setStatus("ready"));
      m.on("click", (e) => onChangeRef.current(round(e.lngLat)));
      mapRef.current = m;
    })();
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      publicRef.current?.remove();
      markerRef.current = null;
      publicRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Pin exacto (arrastrable) sincronizado con `value`.
  useEffect(() => {
    const ml = mlRef.current;
    const map = mapRef.current;
    if (!ml || !map || status !== "ready") return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const marker = new ml.Marker({ element: pinElement("exact"), draggable: true, anchor: "bottom" })
        .setLngLat(toLngLat(value))
        .addTo(map);
      marker.on("dragend", () => onChangeRef.current(round(marker.getLngLat())));
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat(toLngLat(value));
    }
    // Si el punto llegó de afuera (dirección elegida) y no se ve bien, ir hasta él.
    if (!map.getBounds().contains(toLngLat(value)) || map.getZoom() < 15) {
      map.easeTo({ center: toLngLat(value), zoom: 17 });
    }
  }, [value, status]);

  // Punto público (informativo).
  useEffect(() => {
    const ml = mlRef.current;
    const map = mapRef.current;
    if (!ml || !map || status !== "ready") return;
    publicRef.current?.remove();
    publicRef.current = publicLocation
      ? new ml.Marker({ element: pinElement("public") }).setLngLat(toLngLat(publicLocation)).addTo(map)
      : null;
  }, [publicLocation, status]);

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no permite obtener la ubicación.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = round({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        onChangeRef.current(p);
        mapRef.current?.flyTo({ center: toLngLat(p), zoom: 17 });
      },
      () => {
        setLocating(false);
        setGeoError("No pudimos obtener tu ubicación. Marcá el punto tocando el mapa.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="gs-map relative h-72 w-full rounded-xl border border-ink-200 sm:h-96">
        <div ref={containerRef} className="gs-map-canvas" aria-label="Mapa para marcar la ubicación del garage" />
        {status !== "ready" && (
          <div className="absolute inset-0 grid place-items-center bg-ink-100 text-sm text-ink-500">
            {status === "loading" ? "Cargando mapa…" : "No se pudo cargar el mapa. Probá recargar la página."}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-500">
          {value
            ? "Tocá el mapa o arrastrá el pin para ajustar el punto exacto."
            : "Tocá el mapa en la entrada de tu garage."}
          {publicLocation && " El círculo amarillo es el punto aproximado que ven los demás."}
        </p>
        <Button variant="secondary" onClick={locateMe} disabled={locating || status !== "ready"}>
          {locating ? "Buscando…" : "Usar mi ubicación"}
        </Button>
      </div>
      {geoError && <p className="text-sm font-medium text-red-700">{geoError}</p>}
    </div>
  );
}
