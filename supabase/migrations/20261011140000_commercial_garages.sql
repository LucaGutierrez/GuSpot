-- Garages comerciales (lanzamiento) y cocheras particulares (etapa 2).
-- Decisiones del usuario (2026-10-11):
--   * Se lanza con garages COMERCIALES; las cocheras particulares quedan
--     guardadas pero no aparecen en la búsqueda ("Próximamente").
--   * Disponibilidad en vivo que actualiza el operador (lugares, estado).
--   * "Voy a este": aviso de llegada al garage (NO es una reserva).
--   * Además se puede reservar: hasta `reservable_spots` reservas a la vez.
--   * Publicar exige: datos personales, identidad verificada y celular verificado.
--   * La disponibilidad se considera vieja a los 30 minutos (lo muestra el cliente).

-- ---------------------------------------------------------------------------
-- Datos de prueba del usuario: se borra el garage de prueba (sin reservas).
delete from public.garages;

-- ---------------------------------------------------------------------------
-- Columnas nuevas de garages
alter table public.garages
  add column kind text not null default 'comercial' check (kind in ('comercial', 'particular')),
  add column capacity integer check (capacity is null or capacity between 1 and 5000),
  add column available_spots integer check (available_spots is null or available_spots >= 0),
  add column availability_state text not null default 'disponible'
    check (availability_state in ('disponible', 'pocos', 'sin_lugar', 'cerrado')),
  add column availability_updated_at timestamptz,
  add column accepting_drivers boolean not null default true,
  add column reservable_spots integer not null default 0 check (reservable_spots >= 0),
  add column contact_phone text not null default '' check (contact_phone = '' or contact_phone ~ '^\+?[0-9]{8,15}$'),
  add column payment_methods text[] not null default '{}' check (
    payment_methods <@ array['efectivo', 'debito', 'credito', 'mercado_pago', 'transferencia']),
  add column pay_at_garage boolean not null default true,
  add column max_height_cm integer check (max_height_cm is null or max_height_cm between 120 and 600),
  add column access_type text not null default '' check (access_type in ('', 'nivel', 'rampa', 'montacargas', 'mixto'));

-- Servicios: se suma "valet".
alter table public.garages drop constraint if exists garages_features_check;
alter table public.garages add constraint garages_features_check check (
  features <@ array['acceso_24h', 'porton_electrico', 'camaras', 'vigilancia', 'iluminacion',
                    'techada', 'apta_camioneta', 'carga_electrica', 'sin_escalones', 'valet']);

-- El dueño puede escribir los campos nuevos.
grant insert (kind, capacity, available_spots, availability_state, accepting_drivers, reservable_spots,
              contact_phone, payment_methods, pay_at_garage, max_height_cm, access_type)
  on public.garages to authenticated;
grant update (capacity, available_spots, availability_state, accepting_drivers, reservable_spots,
              contact_phone, payment_methods, pay_at_garage, max_height_cm, access_type)
  on public.garages to authenticated;

-- Al cambiar la disponibilidad se registra cuándo (lo ve el conductor).
-- También se valida la coherencia de lugares.
create or replace function public.garages_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  if tg_op = 'INSERT'
     or new.available_spots is distinct from old.available_spots
     or new.availability_state is distinct from old.availability_state
     or new.accepting_drivers is distinct from old.accepting_drivers then
    new.availability_updated_at := now();
  end if;

  if new.capacity is not null and new.available_spots is not null and new.available_spots > new.capacity then
    new.available_spots := new.capacity;
  end if;
  if new.capacity is not null and new.reservable_spots > new.capacity then
    raise exception 'reservable_over_capacity' using errcode = 'check_violation';
  end if;
  -- Sin lugares => estado "sin lugar" (salvo cerrado).
  if new.available_spots = 0 and new.availability_state in ('disponible', 'pocos') then
    new.availability_state := 'sin_lugar';
  end if;

  if new.status = 'publicado' and (
       new.public_lat is null
    or new.hourly_price <= 0
    or jsonb_array_length(new.availability) = 0
    or (new.kind = 'comercial' and new.capacity is null)
  ) then
    raise exception 'publish_requirements'
      using errcode = 'check_violation',
            hint = 'Para publicar hacen falta ubicación, horario, precio por hora y (garages) capacidad.';
  end if;
  if new.status = 'publicado'
     and (tg_op = 'INSERT' or old.status is distinct from 'publicado')
     and cardinality(public.missing_requirements(new.owner_id, 'propietario')) > 0 then
    raise exception 'owner_identity_required' using errcode = 'check_violation';
  end if;
  if new.status = 'publicado' and new.kind = 'particular' then
    raise exception 'particular_not_available' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Requisitos: quien publica = datos personales + identidad + celular verificado.
-- Conductor = datos personales + identidad + licencia + vehículo (sin cambios).
create or replace function public.missing_requirements(p_user uuid, p_role text)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.profiles%rowtype;
  missing text[] := '{}';
  has_doc boolean;
begin
  select * into p from public.profiles where id = p_user;
  if not found
     or btrim(p.first_name) = '' or btrim(p.last_name) = '' or p.dni_number = ''
     or p.birth_date is null or p.phone = ''
     or p.birth_date > (current_date - interval '18 years') then
    missing := array_append(missing, 'datos_personales');
  end if;

  if p.id is null or p.identity_status <> 'verificada' then
    missing := array_append(missing, 'identidad');
  end if;

  if p_role = 'propietario' and (p.id is null or not p.phone_verified) then
    missing := array_append(missing, 'telefono');
  end if;

  if p_role = 'conductor' then
    select count(*) = 2 into has_doc from storage.objects
     where bucket_id = 'identity-docs' and name in (p_user || '/licencia-frente', p_user || '/licencia-dorso');
    if p.id is null or p.license_number = '' or p.license_category = '' or p.license_expiry is null or not has_doc then
      missing := array_append(missing, 'licencia');
    elsif p.license_expiry < current_date then
      missing := array_append(missing, 'licencia_vencida');
    end if;
    if not exists (select 1 from public.vehicles v where v.user_id = p_user) then
      missing := array_append(missing, 'vehiculo');
    end if;
  end if;

  return missing;
end;
$$;

-- Cambiar el celular anula su verificación.
create or replace function public.profiles_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if old.identity_status = 'verificada'
     and (new.first_name is distinct from old.first_name
       or new.last_name is distinct from old.last_name
       or new.dni_number is distinct from old.dni_number
       or new.birth_date is distinct from old.birth_date)
     and new.identity_status = old.identity_status then
    new.identity_status := 'sin_verificar';
  end if;
  if old.phone_verified and new.phone is distinct from old.phone and new.phone_verified = old.phone_verified then
    new.phone_verified := false;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservas: los garages comerciales admiten hasta `reservable_spots` reservas
-- superpuestas; las cocheras particulares, una. (Reemplaza la restricción de
-- exclusión: la regla ahora la aplica create_booking con el garage bloqueado.)
alter table public.bookings drop constraint if exists bookings_no_overlap;
create index if not exists bookings_period_idx on public.bookings using gist (garage_id, period) where (status = 'confirmada');

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

  -- Cupo: máximo de reservas superpuestas en cualquier momento del período.
  select coalesce(max(c), 0) into v_overlap from (
    select (select count(*) from public.bookings b2
             where b2.garage_id = g.id and b2.status = 'confirmada'
               and b2.period @> greatest(b.start_at, p_start)) as c
      from public.bookings b
     where b.garage_id = g.id and b.status = 'confirmada'
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

  select * into prof from public.profiles where id = v_uid;

  insert into public.bookings (garage_id, driver_id, driver_name, garage_title, garage_neighborhood,
                               start_at, end_at, vehicle, plate, car_brand, car_model, car_color,
                               hours, hourly_price, daily_price, total_price)
  values (g.id, v_uid, btrim(prof.first_name || ' ' || prof.last_name), g.title, g.neighborhood,
          p_start, p_end, car.size, car.plate, car.brand, car.model, car.color,
          v_hours, g.hourly_price, g.daily_price, v_total)
  returning id into v_id;

  return v_id;
end;
$$;

-- Ocupación pública: para cocheras particulares (1 lugar) alcanza con los
-- intervalos; los garages comerciales los valida create_booking por cupo.
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
   where b.status = 'confirmada'
     and b.end_at > public.ar_now()
$$;

-- ---------------------------------------------------------------------------
-- "Voy a este": aviso de llegada. No reserva lugar.
create table public.arrival_notices (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  driver_id uuid not null references auth.users (id) on delete cascade,
  driver_name text not null default '',
  car text not null default '',
  plate text not null default '',
  eta_minutes integer not null check (eta_minutes between 1 and 180),
  status text not null default 'en_camino'
    check (status in ('en_camino', 'recibido', 'llego', 'cancelado', 'no_hay_lugar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index arrival_notices_garage_idx on public.arrival_notices (garage_id, created_at desc);
create index arrival_notices_driver_idx on public.arrival_notices (driver_id, created_at desc);

alter table public.arrival_notices enable row level security;

create policy "arrival_notices: conductor o dueño"
  on public.arrival_notices for select
  to authenticated
  using (
    driver_id = (select auth.uid())
    or exists (select 1 from public.garages g where g.id = garage_id and g.owner_id = (select auth.uid()))
  );

revoke all on public.arrival_notices from anon, authenticated;
grant select on public.arrival_notices to authenticated;

-- Avisar. Exige el perfil completo del conductor y que el garage reciba conductores.
create function public.notify_arrival(p_garage_id uuid, p_eta_minutes integer, p_vehicle_id uuid)
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
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if cardinality(public.missing_requirements(v_uid, 'conductor')) > 0 then
    raise exception 'driver_profile_incomplete';
  end if;
  select * into g from public.garages where id = p_garage_id and status = 'publicado';
  if not found then
    raise exception 'not_found';
  end if;
  if g.owner_id = v_uid then
    raise exception 'own_garage';
  end if;
  if not g.accepting_drivers or g.availability_state in ('cerrado', 'sin_lugar') then
    raise exception 'not_accepting';
  end if;
  select * into car from public.vehicles where id = p_vehicle_id and user_id = v_uid;
  if not found then
    raise exception 'vehicle_not_found';
  end if;
  select * into prof from public.profiles where id = v_uid;

  -- Un aviso activo por conductor: el anterior se cancela.
  update public.arrival_notices set status = 'cancelado', updated_at = now()
   where driver_id = v_uid and status in ('en_camino', 'recibido');

  insert into public.arrival_notices (garage_id, driver_id, driver_name, car, plate, eta_minutes)
  values (g.id, v_uid, btrim(prof.first_name || ' ' || prof.last_name),
          btrim(car.brand || ' ' || car.model || ' ' || car.color), car.plate,
          greatest(1, least(180, p_eta_minutes)))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.notify_arrival(uuid, integer, uuid) from public, anon;
grant execute on function public.notify_arrival(uuid, integer, uuid) to authenticated;

-- Cambiar el estado de un aviso: el conductor cancela; el garage marca
-- "recibido" (te esperamos), "llego" o "no_hay_lugar".
create function public.update_arrival(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.arrival_notices%rowtype;
  is_owner boolean;
begin
  select * into a from public.arrival_notices where id = p_id;
  if not found then
    raise exception 'not_found';
  end if;
  is_owner := exists (select 1 from public.garages g where g.id = a.garage_id and g.owner_id = auth.uid());
  if a.driver_id = auth.uid() and p_status = 'cancelado' then
    null;
  elsif is_owner and p_status in ('recibido', 'llego', 'no_hay_lugar') then
    null;
  else
    raise exception 'forbidden';
  end if;
  if a.status in ('llego', 'cancelado', 'no_hay_lugar') then
    raise exception 'closed_notice';
  end if;
  update public.arrival_notices set status = p_status, updated_at = now() where id = p_id;
end;
$$;

revoke all on function public.update_arrival(uuid, text) from public, anon;
grant execute on function public.update_arrival(uuid, text) to authenticated;

-- Indicaciones de llegada para quien avisó que va (aviso activo, últimas 3 h).
create function public.arrival_access(p_id uuid)
returns table (address text, arrival_instructions text, exact_lat double precision, exact_lng double precision)
language sql
stable
security definer
set search_path = ''
as $$
  select p.address, p.arrival_instructions, p.exact_lat, p.exact_lng
    from public.arrival_notices a
    join public.garage_private p on p.garage_id = a.garage_id
   where a.id = p_id
     and a.driver_id = auth.uid()
     and a.status in ('en_camino', 'recibido', 'llego')
     and a.created_at > now() - interval '3 hours'
$$;

revoke all on function public.arrival_access(uuid) from public, anon;
grant execute on function public.arrival_access(uuid) to authenticated;

-- Tiempo real: el panel del garage recibe los avisos al instante.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.arrival_notices;
  end if;
end $$;
