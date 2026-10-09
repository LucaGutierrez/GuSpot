import type { ReactNode } from "react";
import { OwnerSubnav } from "@/components/owner/owner-subnav";
import { demoOwner } from "@/components/owner/owner-data";

export default function OwnersLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <OwnerSubnav ownerName={demoOwner.displayName} />
      {children}
    </>
  );
}
