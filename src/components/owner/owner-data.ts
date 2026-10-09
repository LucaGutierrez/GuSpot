import { DEMO_OWNER_ID, bookings, owners, spaces } from "@/lib/demo-data";
import { toMs } from "@/lib/datetime";
import type { Booking, Space } from "@/lib/types";

// Selectores de datos de demostración para la sección de propietarios.
// No hay sesión: la sección siempre se ve "como" el propietario demo.

export const demoOwner = owners.find((o) => o.id === DEMO_OWNER_ID)!;

export function ownerSpaces(): Space[] {
  return spaces.filter((s) => s.ownerId === DEMO_OWNER_ID);
}

export function ownerBookings(): Booking[] {
  const ids = new Set(ownerSpaces().map((s) => s.id));
  return bookings
    .filter((b) => ids.has(b.spaceId))
    .sort((a, b) => toMs(a.start) - toMs(b.start));
}

export function bookingsForSpace(spaceId: string): Booking[] {
  return ownerBookings().filter((b) => b.spaceId === spaceId);
}

export function getOwnerSpace(id: string): Space | undefined {
  return ownerSpaces().find((s) => s.id === id);
}
