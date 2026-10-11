-- Ingreso con Google y Apple (pedido del usuario 2026-10-12).
-- Al crear la cuenta, el perfil toma el nombre que mande el proveedor
-- (given_name / family_name, o full_name / name partido en nombre y apellido).
-- El resto (DNI, nacimiento, celular) lo completa la persona en /verificacion/.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full text := btrim(coalesce(m ->> 'full_name', m ->> 'name', ''));
  v_first text := btrim(coalesce(nullif(m ->> 'first_name', ''), nullif(m ->> 'given_name', ''), split_part(v_full, ' ', 1)));
  v_last text := btrim(coalesce(nullif(m ->> 'last_name', ''), nullif(m ->> 'family_name', ''),
                                case when position(' ' in v_full) > 0 then substr(v_full, position(' ' in v_full) + 1) else '' end));
  v_dni text := regexp_replace(coalesce(m ->> 'dni', ''), '\D', '', 'g');
  v_phone text := regexp_replace(coalesce(m ->> 'phone', ''), '[^0-9+]', '', 'g');
  v_birth date;
begin
  -- Un email como nombre (algunos proveedores lo mandan así) no sirve.
  if v_first like '%@%' then
    v_first := '';
    v_last := '';
  end if;
  begin
    v_birth := nullif(m ->> 'birth_date', '')::date;
  exception when others then
    v_birth := null;
  end;
  begin
    insert into public.profiles (id, first_name, last_name, dni_number, birth_date, phone)
    values (
      new.id,
      left(v_first, 60),
      left(v_last, 60),
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
