-- Interruptor para exigir (o no) la verificación de identidad (DNI + cara con Didit).
-- 2026-10-11: APAGADO temporalmente a pedido del usuario, para probar pagos solo
-- (una persona no puede verificar dos cuentas con su cara). Lo demás se sigue exigiendo
-- (datos personales; conductor: licencia y vehículo).
-- Para volver a exigirla ANTES DEL LANZAMIENTO:
--   update public.app_settings set value = 'true' where key = 'require_identity_verification';

insert into public.app_settings (key, value)
values ('require_identity_verification', 'false')
on conflict (key) do update set value = excluded.value;

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
    if not exists (select 1 from public.vehicles v where v.user_id = p_user) then
      missing := array_append(missing, 'vehiculo');
    end if;
  end if;

  return missing;
end;
$$;
