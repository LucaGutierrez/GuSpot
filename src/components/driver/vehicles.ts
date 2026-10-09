import type { VehicleSize } from "@/lib/types";

/** Tamaños de vehículo de menor a mayor. */
export const VEHICLE_ORDER: VehicleSize[] = ["moto", "auto_chico", "auto_mediano", "camioneta"];

/** ¿Un vehículo de tamaño `vehicle` entra en un espacio que admite hasta `max`? */
export function fitsVehicle(max: VehicleSize, vehicle: VehicleSize): boolean {
  return VEHICLE_ORDER.indexOf(vehicle) <= VEHICLE_ORDER.indexOf(max);
}
