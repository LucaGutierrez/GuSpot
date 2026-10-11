-- Revisión de seguridad (2026-10-11): límites contra el abuso.
--
-- 1) rate_limit_hit: contador por clave y ventana de tiempo, para que las Edge
--    Functions limiten acciones con costo (SMS, verificación de identidad, pagos)
--    y el aviso de pago de Mercado Pago. Solo lo usa el servidor.
-- 2) create_booking: una sola reserva esperando el pago por conductor.

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Suma un uso a `p_key` y devuelve true si sigue dentro del límite
-- (p_max usos por ventana de p_window_seconds).
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.rate_limits%rowtype;
begin
  insert into public.rate_limits as t (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when t.window_start < now() - make_interval(secs => p_window_seconds) then 1 else t.hits + 1 end,
        window_start = case when t.window_start < now() - make_interval(secs => p_window_seconds) then now() else t.window_start end
  returning * into r;
  return r.hits <= p_max;
end;
$$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

create or replace function public.create_booking(
  p_garage_id uuid,
  p_start timestamp,
  p_end timestamp,
  p_vehicle_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  g public.garages%rowtype;
  car public.vehicles%rowtype;
  prof public.profiles%rowtype;
  v_hours integer;
  v_days integer;
  v_rest integer;
  v_daily bigint;
  v_total bigint;
  v_fee bigint;
  v_t timestamp;
  v_id uuid;
  v_limit integer;
  v_overlap integer;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if cardinality(public.missing_requirements(v_uid, 'conductor')) > 0 then
    raise exception 'driver_profile_incomplete';
  end if;

  select * into car from public.vehicles where id = p_vehicle_id and user_id = v_uid;
  if not found then
    raise exception 'vehicle_not_found';
  end if;
  if not public.vehicle_insured(car) then
    raise exception 'insurance_missing';
  end if;

  -- Un conductor tiene a lo sumo una reserva esperando el pago: las anteriores
  -- sin pagar se liberan (evita acaparar lugares encadenando reservas).
  update public.bookings set status = 'cancelada', cancelled_at = now()
   where driver_id = v_uid and status = 'pendiente_pago' and payment_status <> 'aprobado';

  -- Bloquea el garage: dos reservas simultáneas no pueden pasar el cupo.
  select * into g from public.garages where id = p_garage_id and status = 'publicado' for update;
  if not found then
    raise exception 'not_found';
  end if;
  if g.owner_id = v_uid then
    raise exception 'own_garage';
  end if;
  v_limit := case when g.kind = 'comercial' then g.reservable_spots else 1 end;
  if v_limit <= 0 or not g.accepting_drivers or g.availability_state = 'cerrado' then
    raise exception 'not_reservable';
  end if;
  if not exists (select 1 from public.mp_accounts a where a.owner_id = g.owner_id) then
    raise exception 'no_online_payments';
  end if;
  if array_position(array['moto', 'auto_chico', 'auto_mediano', 'camioneta'], car.size)
     > array_position(array['moto', 'auto_chico', 'auto_mediano', 'camioneta'], g.max_vehicle) then
    raise exception 'vehicle_too_big';
  end if;
  if p_end <= p_start or p_start < public.ar_now() - interval '5 minutes' then
    raise exception 'past';
  end if;

  v_hours := ceil(extract(epoch from (p_end - p_start)) / 3600)::int;
  if v_hours < g.min_hours then
    raise exception 'min_hours';
  end if;
  if v_hours > 24 * 30 then
    raise exception 'too_long';
  end if;

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

  -- Cupo: máximo de reservas que ocupan lugar en cualquier momento del período.
  select coalesce(max(c), 0) into v_overlap from (
    select (select count(*) from public.bookings b2
             where b2.garage_id = g.id and public.booking_holds(b2)
               and b2.period @> greatest(b.start_at, p_start)) as c
      from public.bookings b
     where b.garage_id = g.id and public.booking_holds(b)
       and b.period && tsrange(p_start, p_end, '[)')
  ) s;
  if v_overlap >= v_limit then
    raise exception 'busy';
  end if;

  v_days := v_hours / 24;
  v_rest := v_hours % 24;
  v_daily := coalesce(g.daily_price, g.hourly_price * 24);
  v_total := v_days * v_daily
           + case when g.daily_price is null then v_rest * g.hourly_price
                  else least(v_rest * g.hourly_price, g.daily_price) end;
  -- Cargo de servicio (lo paga el conductor), redondeado a pesos enteros.
  v_fee := round(v_total * public.setting_int('service_fee_percent', 10) / 10000.0) * 100;

  select * into prof from public.profiles where id = v_uid;

  insert into public.bookings (garage_id, driver_id, driver_name, garage_title, garage_neighborhood,
                               start_at, end_at, vehicle, plate, car_brand, car_model, car_color,
                               hours, hourly_price, daily_price, total_price, service_fee, car_insurance,
                               status, payment_status, hold_until)
  values (g.id, v_uid, btrim(prof.first_name || ' ' || prof.last_name), g.title, g.neighborhood,
          p_start, p_end, car.size, car.plate, car.brand, car.model, car.color,
          v_hours, g.hourly_price, g.daily_price, v_total, v_fee, public.insurance_text(car),
          'pendiente_pago', 'pendiente',
          now() + make_interval(mins => public.setting_int('payment_hold_minutes', 15)))
  returning id into v_id;

  return v_id;
end;
$$;
