"use client";

/**
 * Cómo activar la ubicación cuando el navegador ya no la pregunta.
 *
 * Una vez que la persona (o el celular) bloqueó la ubicación, el navegador no
 * vuelve a mostrar su aviso y una página no puede abrir la configuración: lo
 * único que se puede hacer es explicar dónde se activa en ese equipo.
 * - "denied": el permiso está bloqueado (en iPhone también si la localización
 *   del celular está apagada).
 * - "off": el navegador tiene permiso pero el celular no da la ubicación
 *   (en Android, la ubicación apagada).
 */
export type LocationProblem = "denied" | "off";

type Device = { ios: boolean; android: boolean; inApp: boolean; iosChrome: boolean };

function detectDevice(): Device {
  if (typeof navigator === "undefined") return { ios: false, android: false, inApp: false, iosChrome: false };
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return {
    ios,
    android: /Android/.test(ua),
    // Navegador interno de una app (se abrió un enlace desde una red social, etc.).
    inApp: /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|Snapchat|Line\/|; wv\)/i.test(ua),
    iosChrome: ios && /CriOS/.test(ua),
  };
}

export function locationSteps(problem: LocationProblem, retryLabel = "Reintentar"): string[] {
  const d = detectDevice();
  const steps: string[] = [];
  if (d.inApp) {
    steps.push(
      "Abriste GuSpot dentro de otra app, que puede no dejar usar la ubicación: tocá el menú (⋯ arriba a la derecha) → «Abrir en el navegador».",
    );
  }
  if (d.ios) {
    steps.push("Abrí Ajustes del iPhone → Privacidad y seguridad → Localización y activala.");
    steps.push(
      d.iosChrome
        ? "En esa misma lista, entrá a Chrome y elegí «Al usar la app»."
        : "En esa misma lista, entrá a «Sitios web de Safari» y elegí «Al usar la app».",
    );
    if (problem === "denied") {
      steps.push(
        d.iosChrome
          ? "Cuando Chrome te pregunte, tocá «Permitir»."
          : "Volvé a GuSpot en Safari, tocá «Aa» en la barra de la dirección → Configuración del sitio web → Ubicación → Permitir.",
      );
    }
  } else if (d.android) {
    if (problem === "off") {
      steps.push("Deslizá desde arriba de la pantalla y prendé «Ubicación».");
    } else {
      steps.push(
        "Tocá el ícono a la izquierda de la dirección (arriba) → Permisos → Ubicación → Permitir.",
      );
      steps.push(
        "Si sigue sin andar: Configuración del celular → Ubicación → prendela, y en «Permisos de apps» elegí tu navegador → «Permitir solo mientras la app está en uso».",
      );
    }
  } else if (problem === "off") {
    steps.push("Activá la ubicación en la configuración de tu equipo.");
  } else {
    steps.push("Tocá el candado a la izquierda de la dirección → Ubicación → Permitir.");
  }
  steps.push(`Volvé acá y tocá «${retryLabel}» (si no anda, recargá la página).`);
  return steps;
}

export function LocationSteps({
  problem,
  retryLabel,
  className = "",
}: {
  problem: LocationProblem;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <ol className={`list-decimal space-y-1 pl-5 text-sm text-ink-700 ${className}`}>
      {locationSteps(problem, retryLabel).map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}
