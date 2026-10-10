import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard, Loading } from "@/components/account/form-parts";
import { SignInForm } from "@/components/account/sign-in-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function IngresarPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Ingresar">
          <Loading />
        </AuthCard>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
