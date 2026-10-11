-- Perfil, identidad y vehículos (decisión del usuario 2026-10-10: los mismos
-- métodos de seguridad que DiDi/Uber).
--
--   profiles        datos personales y de licencia: SOLO la propia persona
--   vehicles        autos del conductor: la propia persona (el dueño de un
--                   garage ve una COPIA en cada reserva)
--   identity-docs   bucket PRIVADO: fotos de DNI, selfie y licencia. Solo la
--                   propia persona puede subirlas/verlas; nadie más desde la app.
--
-- Requisitos (los controla la base):
--   reservar  -> datos personales, DNI (frente y dorso), selfie, licencia
--                vigente (datos + fotos) y al menos un vehículo.
--   publicar  -> datos personales, DNI (frente y dorso) y selfie.
-- La comparación automática cara-DNI y prueba de vida (Didit) y el SMS se
-- suman después: identity_status la cambia solo el sistema, nunca la persona.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 60),
  last_name text not null default '' check (char_length(last_name) <= 60),
  dni_number text not null default '' check (dni_number = '' or dni_number ~ '^[0-9]{7,8}$'),
  birth_date date,
  phone text not null default '' check (phone = '' or phone ~ '^\+?[0-9]{8,15}$'),
  license_number text not null default '' check (char_length(license_number) <= 20),
  license_category text not null default '' check (char_length(license_category) <= 10),
  license_expiry date,
  -- Lo cambia solo el sistema de verificación (sin permiso de escritura para la persona).
  identity_status text not null default 'sin_verificar'
    check (identity_status in ('sin_verificar', 'en_revision', 'verificada', 'rechazada')),
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.profiles_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.profiles_touch();

alter table public.profiles enable row level security;

create policy "profiles: solo la propia persona"
  on public.profiles for all
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, first_name, last_name, dni_number, birth_date, phone,
              license_number, license_category, license_expiry) on public.profiles to authenticated;
grant update (first_name, last_name, dni_number, birth_date, phone,
              license_number, license_category, license_expiry) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brand text not null check (char_length(btrim(brand)) between 1 and 40),
  model text not null check (char_length(btrim(model)) between 1 and 40),
  color text not null default '' check (char_length(color) <= 30),
  plate text not null check (plate ~ '^[A-Z0-9]{6,8}$'),
  size text not null check (size in ('moto', 'auto_chico', 'auto_mediano', 'camioneta')),
  created_at timestamptz not null default now(),
  unique (user_id, plate)
);

alter table public.vehicles enable row level security;

create policy "vehicles: solo la propia persona"
  on public.vehicles for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.vehicles from anon, authenticated;
grant select, delete on public.vehicles to authenticated;
grant insert (brand, model, color, plate, size) on public.vehicles to authenticated;
grant update (brand, model, color, plate, size) on public.vehicles to authenticated;

-- ---------------------------------------------------------------------------
-- Storage PRIVADO: "<user_id>/<documento>", documento en:
--   dni-frente, dni-dorso, selfie, licencia-frente, licencia-dorso
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identity-docs', 'identity-docs', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "identity-docs: la persona sube los suyos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'identity-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] is null
    and split_part(name, '/', 2) in ('dni-frente', 'dni-dorso', 'selfie', 'licencia-frente', 'licencia-dorso')
  );

create policy "identity-docs: la persona ve los suyos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'identity-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "identity-docs: la persona reemplaza los suyos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'identity-docs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'identity-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "identity-docs: la persona borra los suyos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'identity-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Qué le falta a una persona para reservar ('conductor') o publicar ('propietario').
-- Devuelve códigos: datos_personales, dni_fotos, selfie, licencia, licencia_vencida, vehiculo.
create function public.missing_requirements(p_user uuid, p_role text)
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

  select count(*) = 2 into has_doc from storage.objects
   where bucket_id = 'identity-docs' and name in (p_user || '/dni-frente', p_user || '/dni-dorso');
  if not has_doc then
    missing := array_append(missing, 'dni_fotos');
  end if;

  if not exists (select 1 from storage.objects where bucket_id = 'identity-docs' and name = p_user || '/selfie') then
    missing := array_append(missing, 'selfie');
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

revoke all on function public.missing_requirements(uuid, text) from public, anon, authenticated;

-- Para la app: qué me falta a mí.
create function public.my_missing_requirements(p_role text)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$ select public.missing_requirements(auth.uid(), p_role) $$;

revoke all on function public.my_missing_requirements(text) from public, anon;
grant execute on function public.my_missing_requirements(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Publicar exige identidad del dueño (solo al pasar a "publicado").
create or replace function public.garages_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'publicado' and (
       new.public_lat is null
    or new.hourly_price <= 0
    or jsonb_array_length(new.availability) = 0
  ) then
    raise exception 'publish_requirements'
      using errcode = 'check_violation',
            hint = 'Para publicar hacen falta ubicación, al menos una franja de disponibilidad y precio por hora.';
  end if;
  if new.status = 'publicado'
     and (tg_op = 'INSERT' or old.status is distinct from 'publicado')
     and cardinality(public.missing_requirements(new.owner_id, 'propietario')) > 0 then
    raise exception 'owner_identity_required' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservas: se reserva con un vehículo propio (el dueño ve marca, modelo,
-- color y patente) y con el perfil completo.
alter table public.bookings
  add column car_brand text not null default '',
  add column car_model text not null default '',
  add column car_color text not null default '';

drop function public.create_booking(uuid, timestamp, timestamp, text, text);

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
  v_t timestamp;
  v_id uuid;
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

  select * into g from public.garages where id = p_garage_id and status = 'publicado';
  if not found then
    raise exception 'not_found';
  end if;
  if g.owner_id = v_uid then
    raise exception 'own_garage';
  end if;
  -- El vehículo tiene que entrar en el garage.
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

  v_days := v_hours / 24;
  v_rest := v_hours % 24;
  v_daily := coalesce(g.daily_price, g.hourly_price * 24);
  v_total := v_days * v_daily
           + case when g.daily_price is null then v_rest * g.hourly_price
                  else least(v_rest * g.hourly_price, g.daily_price) end;

  select * into prof from public.profiles where id = v_uid;

  begin
    insert into public.bookings (garage_id, driver_id, driver_name, garage_title, garage_neighborhood,
                                 start_at, end_at, vehicle, plate, car_brand, car_model, car_color,
                                 hours, hourly_price, daily_price, total_price)
    values (g.id, v_uid, btrim(prof.first_name || ' ' || prof.last_name), g.title, g.neighborhood,
            p_start, p_end, car.size, car.plate, car.brand, car.model, car.color,
            v_hours, g.hourly_price, g.daily_price, v_total)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'busy';
  end;

  return v_id;
end;
$$;

revoke all on function public.create_booking(uuid, timestamp, timestamp, uuid) from public, anon;
grant execute on function public.create_booking(uuid, timestamp, timestamp, uuid) to authenticated;
