import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, Loading } from "@/components/account/form-parts";
import { SignUpForm } from "@/components/account/sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function CrearCuentaPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Crear cuenta">
          <Loading />
        </AuthCard>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
