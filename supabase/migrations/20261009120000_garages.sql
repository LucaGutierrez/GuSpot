-- GuSpot · Etapa 1: garages reales.
--
-- El navegador (y la futura app móvil) habla directo con Supabase usando la
-- clave publishable: TODA la seguridad está acá (RLS + permisos por columna).
--
-- Tablas:
--   garages         datos públicos del garage (cualquiera ve los publicados)
--   garage_private  dirección y punto exactos: SOLO el propietario
--   garage_photos   fotos (archivos en el bucket "garage-photos")
--
-- El punto público (public_lat/lng) lo calcula la base: el punto exacto
-- desplazado 100–200 m con un ángulo y distancia aleatorios que se eligen una
-- vez por garage y se guardan en garage_private (estable y no deducible).

-- ---------------------------------------------------------------------------
-- garages
-- ---------------------------------------------------------------------------

create table public.garages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'borrador'
    check (status in ('borrador', 'publicado', 'pausado')),

  title text not null check (char_length(btrim(title)) between 3 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  city text not null check (char_length(btrim(city)) between 2 and 80),
  neighborhood text not null default '' check (char_length(neighborhood) <= 80),
  approx_location text not null default '' check (char_length(approx_location) <= 160),

  type text not null check (type in ('cubierta', 'semicubierta', 'descubierta')),
  max_vehicle text not null check (max_vehicle in ('moto', 'auto_chico', 'auto_mediano', 'camioneta')),
  features text[] not null default '{}' check (
    features <@ array['acceso_24h', 'porton_electrico', 'camaras', 'vigilancia', 'iluminacion',
                      'techada', 'apta_camioneta', 'carga_electrica', 'sin_escalones']
  ),
  -- Centavos de ARS.
  hourly_price bigint not null default 0 check (hourly_price >= 0 and hourly_price <= 100000000),
  daily_price bigint check (daily_price is null or (daily_price > 0 and daily_price <= 1000000000)),
  min_hours integer not null default 1 check (min_hours between 1 and 24),
  -- [{ "days": [1,2,3], "from": "08:00", "to": "20:00" }]
  availability jsonb not null default '[]' check (jsonb_typeof(availability) = 'array'),
  access_conditions text[] not null default '{}' check (cardinality(access_conditions) <= 20),

  -- Calculado por la base (ver garage_private). Nadie lo escribe desde afuera.
  public_lat double precision,
  public_lng double precision,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index garages_owner_idx on public.garages (owner_id);
create index garages_published_idx on public.garages (status) where status = 'publicado';

-- updated_at + requisitos para publicar.
create function public.garages_before_write()
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
    -- El cliente reconoce este mensaje (src/lib/data/garages.ts).
    raise exception 'publish_requirements'
      using errcode = 'check_violation',
            hint = 'Para publicar hacen falta ubicación, al menos una franja de disponibilidad y precio por hora.';
  end if;
  return new;
end;
$$;

create trigger garages_before_write
  before insert or update on public.garages
  for each row execute function public.garages_before_write();

alter table public.garages enable row level security;

create policy "garages: ver publicados o propios"
  on public.garages for select
  to anon, authenticated
  using (status = 'publicado' or owner_id = (select auth.uid()));

create policy "garages: crear propios"
  on public.garages for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "garages: editar propios"
  on public.garages for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "garages: borrar propios"
  on public.garages for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- Permisos por columna: owner_id, public_*, fechas e id no se escriben desde afuera.
revoke all on public.garages from anon, authenticated;
grant select on public.garages to anon, authenticated;
grant insert (status, title, description, city, neighborhood, approx_location, type, max_vehicle,
              features, hourly_price, daily_price, min_hours, availability, access_conditions)
  on public.garages to authenticated;
grant update (status, title, description, city, neighborhood, approx_location, type, max_vehicle,
              features, hourly_price, daily_price, min_hours, availability, access_conditions)
  on public.garages to authenticated;
grant delete on public.garages to authenticated;

-- ---------------------------------------------------------------------------
-- garage_private: SOLO el propietario
-- ---------------------------------------------------------------------------

create table public.garage_private (
  garage_id uuid primary key references public.garages (id) on delete cascade,
  address text not null check (char_length(btrim(address)) between 3 and 200),
  exact_lat double precision not null check (exact_lat between -56 and -21),
  exact_lng double precision not null check (exact_lng between -74 and -53),
  -- Desplazamiento del punto público: se elige una vez y no se puede escribir.
  offset_angle double precision not null default (random() * 2 * pi()),
  offset_meters double precision not null default (100 + random() * 100)
);

-- Recalcula el punto público cuando cambia el exacto.
create function public.garage_private_sync_public_point()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.garages
     set public_lat = new.exact_lat + (new.offset_meters * cos(new.offset_angle)) / 111320,
         public_lng = new.exact_lng + (new.offset_meters * sin(new.offset_angle))
                      / (111320 * cos(radians(new.exact_lat)))
   where id = new.garage_id;
  return new;
end;
$$;

revoke all on function public.garage_private_sync_public_point() from public, anon, authenticated;

create trigger garage_private_sync_public_point
  after insert or update of exact_lat, exact_lng on public.garage_private
  for each row execute function public.garage_private_sync_public_point();

alter table public.garage_private enable row level security;

create policy "garage_private: solo el propietario"
  on public.garage_private for all
  to authenticated
  using (exists (select 1 from public.garages g
                 where g.id = garage_id and g.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.garages g
                      where g.id = garage_id and g.owner_id = (select auth.uid())));

revoke all on public.garage_private from anon, authenticated;
grant select, delete on public.garage_private to authenticated;
grant insert (garage_id, address, exact_lat, exact_lng) on public.garage_private to authenticated;
grant update (address, exact_lat, exact_lng) on public.garage_private to authenticated;

-- ---------------------------------------------------------------------------
-- garage_photos
-- ---------------------------------------------------------------------------

create table public.garage_photos (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages (id) on delete cascade,
  -- Ruta en el bucket: "<garage_id>/<archivo>".
  path text not null unique,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (path like garage_id::text || '/%')
);

create index garage_photos_garage_idx on public.garage_photos (garage_id, position);

-- Máximo 6 fotos por garage (también lo valida el cliente: PHOTO_LIMITS).
create function public.garage_photos_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.garage_photos where garage_id = new.garage_id) >= 6 then
    raise exception 'photo_limit' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger garage_photos_limit
  before insert on public.garage_photos
  for each row execute function public.garage_photos_limit();

alter table public.garage_photos enable row level security;

create policy "garage_photos: ver las de garages visibles"
  on public.garage_photos for select
  to anon, authenticated
  using (exists (select 1 from public.garages g
                 where g.id = garage_id
                   and (g.status = 'publicado' or g.owner_id = (select auth.uid()))));

create policy "garage_photos: agregar en garages propios"
  on public.garage_photos for insert
  to authenticated
  with check (exists (select 1 from public.garages g
                      where g.id = garage_id and g.owner_id = (select auth.uid())));

create policy "garage_photos: borrar de garages propios"
  on public.garage_photos for delete
  to authenticated
  using (exists (select 1 from public.garages g
                 where g.id = garage_id and g.owner_id = (select auth.uid())));

revoke all on public.garage_photos from anon, authenticated;
grant select on public.garage_photos to anon, authenticated;
grant insert (garage_id, path, position) on public.garage_photos to authenticated;
grant delete on public.garage_photos to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket de fotos (lectura pública por URL; escritura solo del dueño)
-- ---------------------------------------------------------------------------
-- Nota: las URLs son públicas aunque el garage no esté publicado; los nombres
-- de archivo son aleatorios y no se listan.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('garage-photos', 'garage-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "garage-photos: el dueño sube"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'garage-photos'
    and exists (select 1 from public.garages g
                where g.id::text = (storage.foldername(name))[1]
                  and g.owner_id = (select auth.uid()))
  );

-- Necesario para borrar (la API de Storage lee el objeto antes).
create policy "garage-photos: el dueño ve sus archivos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'garage-photos'
    and exists (select 1 from public.garages g
                where g.id::text = (storage.foldername(name))[1]
                  and g.owner_id = (select auth.uid()))
  );

create policy "garage-photos: el dueño borra"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'garage-photos'
    and exists (select 1 from public.garages g
                where g.id::text = (storage.foldername(name))[1]
                  and g.owner_id = (select auth.uid()))
  );
