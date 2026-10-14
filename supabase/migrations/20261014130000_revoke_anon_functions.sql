-- 2026-10-14, revisión de seguridad antes del lanzamiento: los visitantes sin
-- sesión (anon) no necesitan ejecutar funciones de disparadores ni acciones de
-- dueños. No había riesgo (los disparadores no se pueden llamar sueltos y
-- mark_booking_arrived exige ser el dueño), pero se cierra igual: Supabase da
-- EXECUTE a anon por defecto en cada función nueva del esquema public.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and (p.prorettype = 'trigger'::regtype or p.proname in ('mark_booking_arrived', 'can_see_insurance_photo'))
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end;
$$;

-- Las funciones nuevas no quedan abiertas a anon salvo que se lo dé explícitamente.
alter default privileges in schema public revoke execute on functions from anon;
