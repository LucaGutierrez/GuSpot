-- 2026-10-12 (pedido del usuario): una reserva descuenta un lugar de los libres
-- que ve el conductor, y el dueño ve las reservas en el panel del garaje.
--
-- Cómo se cuenta:
-- - Una reserva confirmada "guarda" un lugar desde 15 min antes de la entrada
--   hasta la salida, mientras el auto no llegó. Ese lugar se descuenta de los
--   libres que se muestran (`reserved_spots_now`), sin tocar `available_spots`.
-- - Cuando el auto llega, el garaje toca "Llegó" (`mark_booking_arrived`): la
--   reserva deja de guardar el lugar y se resta 1 de `available_spots` (ya es
--   un auto adentro, como cualquier otro). Al irse, el garaje toca "+".
-- - Si no viene, el lugar se libera solo a la hora de salida.

alter table public.bookings add column arrived_at timestamptz;

-- Lugares guardados ahora por reservas, por garaje. Público (sin datos personales).
create or replace function public.reserved_spots_now()
returns table (garage_id uuid, spots integer)
language sql
stable
security definer
set search_path = ''
as $$
  select b.garage_id, count(*)::integer
    from public.bookings b
    join public.garages g on g.id = b.garage_id and g.status = 'publicado'
   where b.status = 'confirmada'
     and b.arrived_at is null
     and b.start_at - interval '15 minutes' <= public.ar_now()
     and b.end_at > public.ar_now()
   group by b.garage_id
$$;

revoke all on function public.reserved_spots_now() from public;
grant execute on function public.reserved_spots_now() to anon, authenticated;

-- El dueño marca que llegó el auto de una reserva.
create or replace function public.mark_booking_arrived(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings%rowtype;
begin
  select bk.* into b
    from public.bookings bk
    join public.garages g on g.id = bk.garage_id and g.owner_id = auth.uid()
   where bk.id = p_booking_id
     for update of bk;
  if not found then
    raise exception 'not_found';
  end if;
  if b.status <> 'confirmada' then
    raise exception 'not_active';
  end if;
  if b.arrived_at is not null then
    return;
  end if;
  update public.bookings set arrived_at = now() where id = b.id;
  update public.garages
     set available_spots = greatest(available_spots - 1, 0)
   where id = b.garage_id and available_spots is not null;
end;
$$;

revoke all on function public.mark_booking_arrived(uuid) from public;
grant execute on function public.mark_booking_arrived(uuid) to authenticated;
