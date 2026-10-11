-- Etapa 2 (prueba, SIN pagos): reservas con confirmación automática.
--
-- Decisión del usuario (2026-10-10): si el horario está disponible, la reserva
-- se confirma sola (sin aprobación del dueño). En el producto real se paga al
-- reservar (tarjetas y Mercado Pago); mientras tanto payment_status queda en
-- 'no_disponible' y NUNCA se muestra una reserva como pagada.
--
-- Todo se hace con funciones (create_booking / cancel_booking): el navegador
-- no puede insertar ni modificar reservas directamente. La base valida el
-- horario del garage, que no se superponga con otra reserva y calcula el precio.
--
-- Fechas: hora local de Argentina como `timestamp` sin zona ("2026-10-10 14:00"),
-- igual que LocalDateTime en src/lib/datetime.ts (Argentina no tiene horario de verano).

create extension if not exists btree_gist with schema extensions;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete restrict,
  driver_id uuid not null references auth.users (id) on delete cascade,
  driver_name text not null default '',
  -- Copia de datos públicos del garage al reservar (para el historial).
  garage_title text not null default '',
  garage_neighborhood text not null default '',
  start_at timestamp not null,
  end_at timestamp not null check (end_at > start_at),
  period tsrange generated always as (tsrange(start_at, end_at, '[)')) stored,
  status text not null default 'confirmada' check (status in ('confirmada', 'cancelada')),
  payment_status text not null default 'no_disponible'
    check (payment_status in ('no_disponible', 'pendiente', 'aprobado', 'rechazado', 'reembolsado')),
  vehicle text not null check (vehicle in ('moto', 'auto_chico', 'auto_mediano', 'camioneta')),
  plate text not null default '' check (char_length(plate) <= 12),
  hours integer not null check (hours > 0),
  hourly_price bigint not null,
  daily_price bigint,
  total_price bigint not null check (total_price >= 0),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  -- Dos reservas confirmadas del mismo garage no pueden superponerse.
  constraint bookings_no_overlap exclude using gist (garage_id with =, period with &&)
    where (status = 'confirmada')
);

create index bookings_driver_idx on public.bookings (driver_id, start_at desc);
create index bookings_garage_idx on public.bookings (garage_id, start_at);

alter table public.bookings enable row level security;

-- Ve una reserva: el conductor que la hizo y el dueño del garage.
create policy "bookings: conductor o dueño"
  on public.bookings for select
  to authenticated
  using (
    driver_id = (select auth.uid())
    or exists (select 1 from public.garages g where g.id = garage_id and g.owner_id = (select auth.uid()))
  );

revoke all on public.bookings from anon, authenticated;
grant select on public.bookings to authenticated;

-- ---------------------------------------------------------------------------
-- Hora actual en Argentina (sin zona), para comparar con start_at/end_at.
create function public.ar_now()
returns timestamp
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/Argentina/Buenos_Aires')::timestamp $$;

-- ¿El instante cae dentro de alguna franja semanal del garage?
-- Misma regla que inRules() en src/lib/availability.ts.
create function public.garage_open_at(p_availability jsonb, p_at timestamp)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1
      from jsonb_array_elements(p_availability) r
     where r->'days' @> to_jsonb(extract(dow from p_at)::int)
       and (extract(hour from p_at) * 60 + extract(minute from p_at))
             >= (split_part(r->>'from', ':', 1)::int * 60 + split_part(r->>'from', ':', 2)::int)
       and (extract(hour from p_at) * 60 + extract(minute from p_at))
             <  (split_part(r->>'to', ':', 1)::int * 60 + split_part(r->>'to', ':', 2)::int)
  )
$$;

-- ---------------------------------------------------------------------------
-- Reservar. Devuelve el id de la reserva. Errores reconocibles por el cliente
-- (src/lib/data/bookings.ts): not_signed_in, not_found, own_garage, past,
-- min_hours, too_long, closed, busy.
create function public.create_booking(
  p_garage_id uuid,
  p_start timestamp,
  p_end timestamp,
  p_vehicle text,
  p_plate text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  g public.garages%rowtype;
  v_hours integer;
  v_days integer;
  v_rest integer;
  v_daily bigint;
  v_total bigint;
  v_t timestamp;
  v_id uuid;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  select * into g from public.garages where id = p_garage_id and status = 'publicado';
  if not found then
    raise exception 'not_found';
  end if;
  if g.owner_id = v_uid then
    raise exception 'own_garage';
  end if;
  if p_end <= p_start or p_start < public.ar_now() - interval '5 minutes' then
    raise exception 'past';
  end if;

  -- Duración redondeada hacia arriba a horas enteras (durationHours en datetime.ts).
  v_hours := ceil(extract(epoch from (p_end - p_start)) / 3600)::int;
  if v_hours < g.min_hours then
    raise exception 'min_hours';
  end if;
  if v_hours > 24 * 30 then
    raise exception 'too_long';
  end if;

  -- Horario semanal: cada media hora y el último minuto (checkAvailability).
  v_t := p_start;
  while v_t < p_end loop
    if not public.garage_open_at(g.availability, v_t) then
      raise exception 'closed';
    end if;
    v_t := v_t + interval '30 minutes';
  end loop;
  if not public.garage_open_at(g.availability, p_end - interval '1 minute') then
    raise exception 'closed';
  end if;

  -- Precio (quote() en src/lib/pricing.ts).
  v_days := v_hours / 24;
  v_rest := v_hours % 24;
  v_daily := coalesce(g.daily_price, g.hourly_price * 24);
  v_total := v_days * v_daily
           + case when g.daily_price is null then v_rest * g.hourly_price
                  else least(v_rest * g.hourly_price, g.daily_price) end;

  v_name := coalesce(nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'display_name'), ''), '');

  begin
    insert into public.bookings (garage_id, driver_id, driver_name, garage_title, garage_neighborhood,
                                 start_at, end_at, vehicle, plate,
                                 hours, hourly_price, daily_price, total_price)
    values (g.id, v_uid, v_name, g.title, g.neighborhood,
            p_start, p_end, p_vehicle, upper(btrim(coalesce(p_plate, ''))),
            v_hours, g.hourly_price, g.daily_price, v_total)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'busy';
  end;

  return v_id;
end;
$$;

revoke all on function public.create_booking(uuid, timestamp, timestamp, text, text) from public, anon;
grant execute on function public.create_booking(uuid, timestamp, timestamp, text, text) to authenticated;

-- Cancelar (prueba: el conductor puede cancelar sin costo hasta la hora de entrada).
-- La política real (minutos con reembolso) se define al sumar Mercado Pago.
create function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = p_booking_id and driver_id = auth.uid();
  if not found then
    raise exception 'not_found';
  end if;
  if b.status <> 'confirmada' then
    raise exception 'not_active';
  end if;
  if b.start_at <= public.ar_now() then
    raise exception 'started';
  end if;
  update public.bookings set status = 'cancelada', cancelled_at = now() where id = b.id;
end;
$$;

revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.cancel_booking(uuid) to authenticated;

-- Horarios ocupados de los garages publicados (sin datos de quién reservó),
-- para que la búsqueda muestre bien la disponibilidad.
create function public.busy_periods()
returns table (garage_id uuid, start_at timestamp, end_at timestamp)
language sql
stable
security definer
set search_path = ''
as $$
  select b.garage_id, b.start_at, b.end_at
    from public.bookings b
    join public.garages g on g.id = b.garage_id and g.status = 'publicado'
   where b.status = 'confirmada'
     and b.end_at > public.ar_now()
$$;

revoke all on function public.busy_periods() from public;
grant execute on function public.busy_periods() to anon, authenticated;

-- Dirección e indicaciones para el CONDUCTOR de una reserva confirmada.
-- (Con pagos, se exigirá además payment_status = 'aprobado'.)
create function public.booking_access(p_booking_id uuid)
returns table (address text, arrival_instructions text, exact_lat double precision, exact_lng double precision)
language sql
stable
security definer
set search_path = ''
as $$
  select p.address, p.arrival_instructions, p.exact_lat, p.exact_lng
    from public.bookings b
    join public.garage_private p on p.garage_id = b.garage_id
   where b.id = p_booking_id
     and b.driver_id = auth.uid()
     and b.status = 'confirmada'
$$;

revoke all on function public.booking_access(uuid) from public, anon;
grant execute on function public.booking_access(uuid) to authenticated;
