-- 2026-10-14, pedido del usuario: que lo que se carga sea confiable.
-- 1) Un DNI, una cuenta: el mismo DNI no puede estar verificado en dos cuentas
--    (índice único sobre los perfiles verificados + aviso al cargarlo).
-- 2) Controles de datos: fechas posibles, categoría de licencia válida y
--    vencimientos razonables (se controlan al cargarlos o cambiarlos).
-- 3) Foto del seguro: cada vehículo necesita la foto del certificado de
--    cobertura (bucket PRIVADO insurance-docs, "<user_id>/<vehicle_id>"). No
--    la revisa nadie antes: la ve el garaje en la reserva o el aviso, y la
--    controla al llegar el auto (decisión del usuario).

-- ---------------------------------------------------------------- 1) DNI único

create unique index if not exists profiles_verified_dni_key
  on public.profiles (dni_number) where identity_status = 'verificada';

-- ---------------------------------------------------------------- 2) controles

alter table public.profiles drop constraint if exists profiles_license_category_check;
alter table public.profiles add constraint profiles_license_category_check
  check (license_category in ('', 'A1', 'A2', 'A3', 'B1', 'B2', 'C', 'D1', 'D2', 'D3', 'E1', 'E2', 'G'));

create or replace function public.profiles_validate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.dni_number <> ''
     and (tg_op = 'INSERT' or new.dni_number is distinct from old.dni_number)
     and exists (select 1 from public.profiles p
                  where p.dni_number = new.dni_number and p.id <> new.id and p.identity_status = 'verificada') then
    raise exception 'dni_in_use';
  end if;
  if new.birth_date is not null
     and (tg_op = 'INSERT' or new.birth_date is distinct from old.birth_date)
     and (new.birth_date < date '1900-01-01' or new.birth_date > current_date) then
    raise exception 'birth_date_invalid';
  end if;
  if new.license_expiry is not null
     and (tg_op = 'INSERT' or new.license_expiry is distinct from old.license_expiry)
     and new.license_expiry > current_date + interval '10 years' then
    raise exception 'license_expiry_invalid';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_validate on public.profiles;
create trigger profiles_validate before insert or update on public.profiles
  for each row execute function public.profiles_validate();

create or replace function public.vehicles_validate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Las pólizas de auto se renuevan como mucho cada año: más de 2 años es un error de carga.
  if new.insurance_expiry is not null
     and (tg_op = 'INSERT' or new.insurance_expiry is distinct from old.insurance_expiry)
     and new.insurance_expiry > current_date + interval '2 years' then
    raise exception 'insurance_expiry_invalid';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_validate on public.vehicles;
create trigger vehicles_validate before insert or update on public.vehicles
  for each row execute function public.vehicles_validate();

-- ---------------------------------------------------------------- 3) foto del seguro

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('insurance-docs', 'insurance-docs', false, 8388608,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Ruta de la foto del seguro que el garaje puede ver (copia en la reserva / aviso).
alter table public.bookings add column if not exists car_insurance_photo text not null default '';
alter table public.arrival_notices add column if not exists car_insurance_photo text not null default '';

create or replace function public.fill_insurance_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.car_insurance_photo := coalesce(
    (select v.user_id::text || '/' || v.id::text from public.vehicles v
      where v.user_id = new.driver_id and v.plate = new.plate),
    '');
  return new;
end;
$$;

drop trigger if exists bookings_insurance_photo on public.bookings;
create trigger bookings_insurance_photo before insert on public.bookings
  for each row execute function public.fill_insurance_photo();
drop trigger if exists arrival_notices_insurance_photo on public.arrival_notices;
create trigger arrival_notices_insurance_photo before insert on public.arrival_notices
  for each row execute function public.fill_insurance_photo();

-- El garaje ve la foto mientras la reserva o el aviso están activos (y un día después).
create or replace function public.can_see_insurance_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_name <> '' and (
    exists (select 1 from public.bookings b join public.garages g on g.id = b.garage_id
             where g.owner_id = auth.uid() and b.car_insurance_photo = p_name
               and b.status in ('pendiente_pago', 'confirmada')
               and b.end_at > public.ar_now() - interval '1 day')
    or exists (select 1 from public.arrival_notices n join public.garages g on g.id = n.garage_id
                where g.owner_id = auth.uid() and n.car_insurance_photo = p_name
                  and n.status in ('en_camino', 'recibido', 'llego')
                  and n.created_at > now() - interval '1 day'))
$$;

revoke all on function public.can_see_insurance_photo(text) from public, anon;
grant execute on function public.can_see_insurance_photo(text) to authenticated;

create policy "insurance-docs: la persona sube la de sus vehículos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'insurance-docs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] is null
    and exists (select 1 from public.vehicles v
                 where v.user_id = (select auth.uid()) and v.id::text = split_part(name, '/', 2))
  );

create policy "insurance-docs: la persona y el garaje la ven"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'insurance-docs'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.can_see_insurance_photo(name))
  );

create policy "insurance-docs: la persona la reemplaza"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'insurance-docs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'insurance-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "insurance-docs: la persona la borra"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'insurance-docs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Seguro vigente = datos completos, no vencido y CON la foto del certificado.
create or replace function public.vehicle_insured(v public.vehicles)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select btrim(v.insurer) <> '' and btrim(v.insurance_policy) <> ''
     and v.insurance_expiry is not null and v.insurance_expiry >= current_date
     and exists (select 1 from storage.objects o
                  where o.bucket_id = 'insurance-docs' and o.name = v.user_id::text || '/' || v.id::text)
$$;

revoke all on function public.vehicle_insured(public.vehicles) from public, anon, authenticated;
