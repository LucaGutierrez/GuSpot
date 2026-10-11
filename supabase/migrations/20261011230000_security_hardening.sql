-- Revisión de seguridad (2026-10-11): funciones auxiliares que solo usan otras
-- funciones de la base no tienen que poder llamarse desde la página.
revoke all on function public.vehicle_insured(public.vehicles) from public, anon, authenticated;
revoke all on function public.insurance_text(public.vehicles) from public, anon, authenticated;
revoke all on function public.booking_holds(public.bookings) from public, anon, authenticated;
