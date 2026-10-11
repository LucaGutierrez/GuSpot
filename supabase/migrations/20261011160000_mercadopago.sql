-- Pagos con Mercado Pago (decisiones del usuario, 2026-10-11):
-- - La plata va DIRECTO al garage: cada garage conecta su cuenta de Mercado Pago
--   (OAuth) y Mercado Pago divide el pago; GuSpot cobra su parte como
--   `marketplace_fee`. GuSpot nunca tiene plata de terceros.
-- - La comisión es un CARGO DE SERVICIO que paga el conductor encima de la
--   tarifa (se muestra antes de pagar). Porcentaje configurable (10 % por ahora).
-- - Cancelación con devolución total: hasta 10 minutos después de pagar.
--
-- Flujo: create_booking deja la reserva "pendiente_pago" y guarda el lugar
-- unos minutos (hold_until). La Edge Function `mercadopago` crea el pago con la
-- cuenta del garage; cuando Mercado Pago lo aprueba, la reserva pasa a
-- "confirmada". Si no se paga a tiempo, el lugar se libera solo.

-- ---------------------------------------------------------------------------
-- Configuración
insert into public.app_settings (key, value) values
  ('service_fee_percent', '10'),
  ('refund_window_minutes', '10'),
  ('payment_hold_minutes', '15')
on conflict (key) do nothing;

create or replace function public.setting_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value #>> '{}')::integer from public.app_settings s where s.key = p_key), p_default)
$$;
revoke all on function public.setting_int(text, integer) from public, anon, authenticated;

-- Lo que la página necesita saber para mostrar precios y reglas.
create or replace function public.payment_settings()
returns table (service_fee_percent integer, refund_window_minutes integer, payment_hold_minutes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select public.setting_int('service_fee_percent', 10),
         public.setting_int('refund_window_minutes', 10),
         public.setting_int('payment_hold_minutes', 15)
$$;
revoke all on function public.payment_settings() from public;
grant execute on function public.payment_settings() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cuentas de Mercado Pago conectadas (tokens SECRETOS: solo el servidor).
create table public.mp_accounts (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  mp_user_id bigint not null,
  access_token text not null,
  refresh_token text not null default '',
  public_key text not null default '',
  live_mode boolean not null default false,
  expires_at timestamptz,
  connected_at timestamptz not null default now()
);
alter table public.mp_accounts enable row level security;
revoke all on public.mp_accounts from anon, authenticated;
create index mp_accounts_user_idx on public.mp_accounts (mp_user_id);

-- Estado de MI cuenta conectada (sin tokens).
create or replace function public.my_payment_account()
returns table (connected boolean, mp_user_id bigint, live_mode boolean, connected_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select true, a.mp_user_id, a.live_mode, a.connected_at
    from public.mp_accounts a
   where a.owner_id = auth.uid()
$$;
revoke all on function public.my_payment_account() from public, anon;
grant execute on function public.my_payment_account() to authenticated;

-- Garages: ¿el dueño puede cobrar reservas online? (lo mantiene el sistema)
alter table public.garages add column if not exists online_payments boolean not null default false;

create or replace function public.garages_online_payments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.online_payments := exists (select 1 from public.mp_accounts a where a.owner_id = new.owner_id);
  return new;
end;
$$;
drop trigger if exists garages_online_payments on public.garages;
create trigger garages_online_payments
  before insert or update on public.garages
  for each row execute function public.garages_online_payments();

create or replace function public.mp_accounts_sync_garages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.garages set online_payments = (tg_op <> 'DELETE')
   where owner_id = coalesce(new.owner_id, old.owner_id);
  return null;
end;
$$;
create trigger mp_accounts_sync_garages
  after insert or delete on public.mp_accounts
  for each row execute function public.mp_accounts_sync_garages();

-- ---------------------------------------------------------------------------
-- Reservas con pago
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pendiente_pago', 'confirmada', 'cancelada'));

alter table public.bookings
  add column if not exists service_fee bigint not null default 0 check (service_fee >= 0),
  add column if not exists hold_until timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists mp_preference_id text,
  add column if not exists mp_payment_id text;

-- Ocupa lugar: confirmada, o esperando el pago dentro del tiempo de espera.
create or replace function public.booking_holds(b public.bookings)
returns boolean
language sql
stable
set search_path = ''
as $$
  select b.status = 'confirmada' or (b.status = 'pendiente_pago' and b.hold_until > now())
$$;

drop index if exists public.bookings_period_idx;
create index bookings_period_idx on public.bookings using gist (garage_id, period)
  where (status in ('confirmada', 'pendiente_pago'));

drop function if exists public.create_booking(uuid, timestamp, timestamp, uuid);
create function public.create_booking(
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
                               hours, hourly_price, daily_price, total_price, service_fee,
                               status, payment_status, hold_until)
  values (g.id, v_uid, btrim(prof.first_name || ' ' || prof.last_name), g.title, g.neighborhood,
          p_start, p_end, car.size, car.plate, car.brand, car.model, car.color,
          v_hours, g.hourly_price, g.daily_price, v_total, v_fee,
          'pendiente_pago', 'pendiente',
          now() + make_interval(mins => public.setting_int('payment_hold_minutes', 15)))
  returning id into v_id;

  return v_id;
end;
$$;
revoke all on function public.create_booking(uuid, timestamp, timestamp, uuid) from public, anon;
grant execute on function public.create_booking(uuid, timestamp, timestamp, uuid) to authenticated;

-- Cancelar SIN plata de por medio (esperando el pago, o reservas de prueba sin
-- pago). Las reservas pagadas se cancelan por la Edge Function (devolución).
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = p_booking_id and driver_id = auth.uid() for update;
  if not found then
    raise exception 'not_found';
  end if;
  if b.status = 'cancelada' then
    raise exception 'not_active';
  end if;
  if b.payment_status = 'aprobado' then
    raise exception 'paid_booking';
  end if;
  if b.status = 'confirmada' and b.start_at <= public.ar_now() then
    raise exception 'started';
  end if;
  update public.bookings set status = 'cancelada', cancelled_at = now() where id = b.id;
end;
$$;

create or replace function public.busy_periods()
returns table (garage_id uuid, start_at timestamp, end_at timestamp)
language sql
stable
security definer
set search_path = ''
as $$
  select b.garage_id, b.start_at, b.end_at
    from public.bookings b
    join public.garages g on g.id = b.garage_id and g.status = 'publicado' and g.kind = 'particular'
   where public.booking_holds(b)
     and b.end_at > public.ar_now()
$$;

-- Dirección e indicaciones: solo para el conductor de una reserva confirmada
-- (con pago aprobado; 'no_disponible' = reservas de prueba anteriores a los pagos).
create or replace function public.booking_access(p_booking_id uuid)
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
     and b.payment_status in ('aprobado', 'no_disponible')
$$;
