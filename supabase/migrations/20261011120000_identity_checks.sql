-- Verificación de identidad con Didit (DNI + prueba de vida + comparación de
-- la cara con el DNI). La función del servidor supabase/functions/didit crea
-- la sesión en Didit y guarda acá el resultado; profiles.identity_status lo
-- actualiza solo esa función (con la clave de servicio).
--
-- Desde ahora, para reservar y para publicar hace falta identity_status =
-- 'verificada' (reemplaza a las fotos de DNI y selfie subidas a mano).

create table public.identity_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'didit',
  session_id text not null unique,
  status text not null default 'Not Started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index identity_checks_user_idx on public.identity_checks (user_id, created_at desc);

alter table public.identity_checks enable row level security;

create policy "identity_checks: la propia persona ve las suyas"
  on public.identity_checks for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.identity_checks from anon, authenticated;
grant select on public.identity_checks to authenticated;

-- Requisitos: la identidad la confirma Didit.
-- Códigos: datos_personales, identidad, licencia, licencia_vencida, vehiculo.
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

-- Si cambian nombre, DNI o fecha de nacimiento después de verificar, hay que
-- volver a verificar (para que no se pueda verificar con un DNI y cambiarlo).
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
  return new;
end;
$$;
