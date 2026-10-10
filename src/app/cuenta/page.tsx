import type { Metadata } from "next";
import { AccountPanel } from "@/components/account/account-panel";

export const metadata: Metadata = { title: "Tu cuenta" };

export default function CuentaPage() {
  return <AccountPanel />;
}
