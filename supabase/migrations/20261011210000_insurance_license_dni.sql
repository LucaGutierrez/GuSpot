-- 2026-10-11, pedido del usuario:
-- 1) Datos del SEGURO de cada vehículo (compañía, póliza y vencimiento). Para
--    reservar o avisar "Voy a este" el vehículo elegido tiene que tener el seguro
--    vigente; el garage ve compañía y póliza junto al auto (copia en la reserva/aviso).
-- 2) La LICENCIA tiene que coincidir con el DNI cargado (en Argentina el número
--    de licencia es el número de DNI): requisito 'licencia_dni'.

alter table public.vehicles
  add column if not exists insurer text not null default '' check (char_length(insurer) <= 60),
  add column if not exists insurance_policy text not null default '' check (char_length(insurance_policy) <= 40),
  add column if not exists insurance_expiry date;

grant insert (insurer, insurance_policy, insurance_expiry) on public.vehicles to authenticated;
grant update (insurer, insurance_policy, insurance_expiry) on public.vehicles to authenticated;

alter table public.bookings add column if not exists car_insurance text not null default '';
alter table public.arrival_notices add column if not exists car_insurance text not null default '';

create or replace function public.vehicle_insured(v public.vehicles)
returns boolean
language sql
stable
set search_path = ''
as $$
  select btrim(v.insurer) <> '' and btrim(v.insurance_policy) <> ''
     and v.insurance_expiry is not null and v.insurance_expiry >= current_date
$$;

create or replace function public.insurance_text(v public.vehicles)
returns text
language sql
stable
set search_path = ''
as $$
  select btrim(v.insurer) || ' · póliza ' || btrim(v.insurance_policy)
         || ' · vence ' || to_char(v.insurance_expiry, 'DD/MM/YYYY')
$$;

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
  require_phone boolean;
  require_identity boolean;
begin
  select * into p from public.profiles where id = p_user;
  if not found
     or btrim(p.first_name) = '' or btrim(p.last_name) = '' or p.dni_number = ''
     or p.birth_date is null or p.phone = ''
     or p.birth_date > (current_date - interval '18 years') then
    missing := array_append(missing, 'datos_personales');
  end if;

  select coalesce((select (s.value)::boolean from public.app_settings s where s.key = 'require_identity_verification'), true)
    into require_identity;
  if require_identity and (p.id is null or p.identity_status <> 'verificada') then
    missing := array_append(missing, 'identidad');
  end if;

  select coalesce((select (s.value)::boolean from public.app_settings s where s.key = 'require_phone_verification'), true)
    into require_phone;
  if p_role = 'propietario' and require_phone and (p.id is null or not p.phone_verified) then
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
    -- En Argentina el número de licencia es el del DNI.
    if p.id is not null and p.license_number <> '' and p.dni_number <> ''
       and regexp_replace(p.license_number, '\D', '', 'g') <> regexp_replace(p.dni_number, '\D', '', 'g') then
      missing := array_append(missing, 'licencia_dni');
    end if;
    if not exists (select 1 from public.vehicles v where v.user_id = p_user) then
      missing := array_append(missing, 'vehiculo');
    elsif not exists (select 1 from public.vehicles v where v.user_id = p_user and public.vehicle_insured(v)) then
      missing := array_append(missing, 'seguro');
    end if;
  end if;

  return missing;
end;
$$;

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

create or replace function public.notify_arrival(p_garage_id uuid, p_eta_minutes integer, p_vehicle_id uuid)
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
  if not public.vehicle_insured(car) then
    raise exception 'insurance_missing';
  end if;
  select * into prof from public.profiles where id = v_uid;

  -- Un aviso activo por conductor: el anterior se cancela.
  update public.arrival_notices set status = 'cancelado', updated_at = now()
   where driver_id = v_uid and status in ('en_camino', 'recibido');

  insert into public.arrival_notices (garage_id, driver_id, driver_name, car, plate, car_insurance, eta_minutes)
  values (g.id, v_uid, btrim(prof.first_name || ' ' || prof.last_name),
          btrim(car.brand || ' ' || car.model || ' ' || car.color), car.plate, public.insurance_text(car),
          greatest(1, least(180, p_eta_minutes)))
  returning id into v_id;
  return v_id;
end;
$$;
