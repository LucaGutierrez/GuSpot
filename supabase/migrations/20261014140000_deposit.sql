-- 2026-10-14, decisión del usuario: al reservar se cobra una SEÑA (50 % de la
-- tarifa, configurable) con Mercado Pago, y el resto se paga en el garaje.
-- El cargo de servicio de GuSpot (10 % de la tarifa TOTAL) sale de esa seña:
-- lo paga el garaje, no se le suma al conductor.
--
-- Ejemplo: tarifa $12.000 → seña $6.000 (GuSpot $1.200 + garaje $4.800) y
-- $6.000 en el garaje. El conductor paga $12.000 en total.
--
-- bookings.deposit = seña cobrada con Mercado Pago (centavos, pesos enteros).
-- Reservas anteriores: deposit = 0 → se cobraba tarifa + cargo (no cambian).

insert into public.app_settings (key, value) values ('deposit_percent', '50')
on conflict (key) do nothing;

alter table public.bookings add column if not exists deposit bigint not null default 0;

-- La seña se calcula al crear la reserva (create_booking ya calculó tarifa y cargo).
-- Nunca menos que el cargo de servicio ni más que la tarifa.
create or replace function public.bookings_set_deposit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.deposit := least(
    new.total_price,
    greatest(new.service_fee,
             round(new.total_price * public.setting_int('deposit_percent', 50) / 10000.0) * 100));
  return new;
end;
$$;

drop trigger if exists bookings_set_deposit on public.bookings;
create trigger bookings_set_deposit before insert on public.bookings
  for each row execute function public.bookings_set_deposit();
revoke execute on function public.bookings_set_deposit() from public, anon;

-- Reglas que muestra la página (ahora con el % de seña).
drop function if exists public.payment_settings();
create function public.payment_settings()
returns table (service_fee_percent integer, refund_window_minutes integer, payment_hold_minutes integer,
               deposit_percent integer)
language sql
stable
security definer
set search_path = ''
as $$
  select public.setting_int('service_fee_percent', 10),
         public.setting_int('refund_window_minutes', 10),
         public.setting_int('payment_hold_minutes', 15),
         public.setting_int('deposit_percent', 50)
$$;
revoke all on function public.payment_settings() from public;
grant execute on function public.payment_settings() to anon, authenticated;
