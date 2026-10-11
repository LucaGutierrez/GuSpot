"use client";

import { useEffect, useState } from "react";
import { enabledProviders, signInWithProvider, type OAuthProvider } from "@/lib/auth/actions";

/** Logo de Google para el botón de ingreso (colores oficiales). */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

/** Logo de Apple para el botón de ingreso (ícono de Font Awesome Free, CC BY 4.0). */
function AppleLogo() {
  return (
    <svg viewBox="0 0 384 512" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

/**
 * Botones "Continuar con Apple / Google". Solo aparecen los métodos activados en
 * Supabase (Authentication → Providers), así nunca hay un botón que no funcione.
 */
export function SocialButtons({ next, separator }: { next: string; separator: string }) {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    enabledProviders().then((p) => !cancelled && setProviders(p));
    return () => {
      cancelled = true;
    };
  }, []);

  if (providers.length === 0) return null;

  async function onClick(provider: OAuthProvider) {
    setBusy(provider);
    setError(null);
    const result = await signInWithProvider(provider, next);
    // Si salió bien, el navegador ya está yendo a Google / Apple.
    if (!result.ok) {
      setError(result.message);
      setBusy(null);
    }
  }

  const base =
    "flex h-12 w-full items-center justify-center gap-3 rounded-xl px-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-3">
      {providers.includes("apple") && (
        <button type="button" onClick={() => onClick("apple")} disabled={busy !== null} className={`${base} bg-black text-white hover:bg-ink-900`}>
          <AppleLogo />
          {busy === "apple" ? "Abriendo Apple…" : "Continuar con Apple"}
        </button>
      )}
      {providers.includes("google") && (
        <button
          type="button"
          onClick={() => onClick("google")}
          disabled={busy !== null}
          className={`${base} border border-ink-300 bg-white text-ink-900 hover:bg-ink-50`}
        >
          <GoogleLogo />
          {busy === "google" ? "Abriendo Google…" : "Continuar con Google"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="my-1 flex items-center gap-3 text-xs text-ink-500">
        <span className="h-px flex-1 bg-ink-200" />
        {separator}
        <span className="h-px flex-1 bg-ink-200" />
      </div>
    </div>
  );
}
