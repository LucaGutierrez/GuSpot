import type { Metadata } from "next";
import { PasswordPage } from "@/components/account/account-panel";

export const metadata: Metadata = { title: "Contraseña" };

export default function ContrasenaPage() {
  return <PasswordPage />;
}
