"use client";

import { useCallback, useState } from "react";
import type { LatLng } from "@/lib/types";

export type LocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ok"; coords: LatLng }
  | { status: "denied" | "error" | "unsupported" };

/**
 * Ubicación del conductor. Solo se pide cuando se llama a `request()` (al tocar
 * "Mi ubicación"). Queda en memoria mientras la pantalla está abierta: nunca se
 * guarda ni se envía a ningún lado.
 */
export function useDriverLocation(onLocated?: (coords: LatLng) => void) {
  const [state, setState] = useState<LocationState>({ status: "idle" });

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ status: "unsupported" });
      return;
    }
    setState({ status: "locating" });
    // El `timeout` del navegador empieza a contar recién cuando se concede el
    // permiso: si la persona no responde el aviso, sin esto quedaría "buscando".
    // Si después llega la ubicación, igual se usa.
    const watchdog = setTimeout(() => {
      setState((s) => (s.status === "locating" ? { status: "error" } : s));
    }, 15_000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(watchdog);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setState({ status: "ok", coords });
        onLocated?.(coords);
      },
      (err) => {
        clearTimeout(watchdog);
        setState({ status: err.code === err.PERMISSION_DENIED ? "denied" : "error" });
      },
      { timeout: 10_000, maximumAge: 60_000, enableHighAccuracy: false },
    );
  }, [onLocated]);

  return { state, request };
}
