-- El registro (/crear-cuenta/) pide nombre, apellido, DNI, fecha de
-- nacimiento y celular. Viajan en los metadatos de la cuenta y, al crearse la
-- cuenta, se copian al perfil (profiles). Datos con formato inválido se
-- ignoran: la persona los completa después en /verificacion/. Nunca bloquea
-- el registro.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_dni text := regexp_replace(coalesce(m ->> 'dni', ''), '\D', '', 'g');
  v_phone text := regexp_replace(coalesce(m ->> 'phone', ''), '[^0-9+]', '', 'g');
  v_birth date;
begin
  begin
    v_birth := nullif(m ->> 'birth_date', '')::date;
  exception when others then
    v_birth := null;
  end;
  begin
    insert into public.profiles (id, first_name, last_name, dni_number, birth_date, phone)
    values (
      new.id,
      left(btrim(coalesce(m ->> 'first_name', '')), 60),
      left(btrim(coalesce(m ->> 'last_name', '')), 60),
      case when v_dni ~ '^[0-9]{7,8}$' then v_dni else '' end,
      v_birth,
      case when v_phone ~ '^\+?[0-9]{8,15}$' then v_phone else '' end
    )
    on conflict (id) do nothing;
  exception when others then
    -- Nunca impedir el registro por el perfil.
    null;
  end;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cuentas existentes sin perfil: crear uno con lo que haya en los metadatos.
insert into public.profiles (id, first_name, last_name)
select u.id,
       left(btrim(coalesce(u.raw_user_meta_data ->> 'first_name', split_part(u.raw_user_meta_data ->> 'display_name', ' ', 1), '')), 60),
       left(btrim(coalesce(u.raw_user_meta_data ->> 'last_name',
                           nullif(btrim(substr(u.raw_user_meta_data ->> 'display_name',
                                               length(split_part(u.raw_user_meta_data ->> 'display_name', ' ', 1)) + 1)), ''),
                           '')), 60)
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);
