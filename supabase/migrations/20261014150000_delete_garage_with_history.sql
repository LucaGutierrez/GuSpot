-- Eliminar un garaje que tuvo reservas (pedido del usuario 2026-10-14).
--
-- Antes la reserva apuntaba al garaje con ON DELETE RESTRICT: un garaje con
-- cualquier reserva (aunque estuviera cancelada) no se podía borrar.
-- Ahora las reservas viejas quedan en el historial del conductor (sin garaje,
-- con la copia de nombre y barrio que ya guardan) y el garaje se borra.
--
-- Lo que sigue bloqueado: borrar un garaje con reservas ACTIVAS (confirmadas que
-- todavía no terminaron, o esperando el pago dentro de los minutos de espera),
-- para no dejar sin lugar a un conductor que ya pagó la seña.

alter table public.bookings alter column garage_id drop not null;

alter table public.bookings drop constraint bookings_garage_id_fkey;
alter table public.bookings
  add constraint bookings_garage_id_fkey
  foreign key (garage_id) references public.garages (id) on delete set null;

create function public.garages_block_delete_with_active_bookings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.bookings b
    where b.garage_id = old.id
      and (
        (b.status = 'confirmada' and b.end_at > (now() at time zone 'America/Argentina/Buenos_Aires'))
        or (b.status = 'pendiente_pago' and b.hold_until > now())
      )
  ) then
    raise exception 'garage_has_active_bookings';
  end if;
  return old;
end;
$$;

revoke all on function public.garages_block_delete_with_active_bookings() from public, anon, authenticated;

create trigger garages_block_delete_with_active_bookings
  before delete on public.garages
  for each row execute function public.garages_block_delete_with_active_bookings();
