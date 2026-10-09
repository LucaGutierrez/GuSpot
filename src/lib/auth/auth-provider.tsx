"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import { isBackendConfigured } from "../supabase/config";

/**
 * Estado de la sesión:
 * - "disabled": modo demo (Supabase no configurado), no hay cuentas.
 * - "loading": todavía no se sabe (primer render / build estático).
 */
export type AuthState =
  | { status: "disabled" }
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: AuthUser };

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata as { display_name?: unknown } | undefined;
  const email = user.email ?? "";
  const displayName =
    typeof meta?.display_name === "string" && meta.display_name.trim()
      ? meta.display_name.trim()
      : email.split("@")[0];
  return { id: user.id, email, displayName };
}

const AuthContext = createContext<AuthState>({ status: "loading" });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(
    isBackendConfigured ? { status: "loading" } : { status: "disabled" },
  );

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    // onAuthStateChange emite INITIAL_SESSION al suscribirse, así que cubre la carga inicial.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session?.user ? { status: "signed-in", user: toAuthUser(session.user) } : { status: "signed-out" });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
