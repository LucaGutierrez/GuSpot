-- Decisión del 2026-10-10: el punto del mapa público es el EXACTO (sin
-- desplazamiento). La dirección escrita y las indicaciones de llegada siguen
-- siendo privadas (garage_private) hasta la reserva confirmada.
-- Las columnas offset_* quedan sin uso (por si se vuelve al punto aproximado).

create or replace function public.garage_private_sync_public_point()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.garages
     set public_lat = new.exact_lat,
         public_lng = new.exact_lng
   where id = new.garage_id;
  return new;
end;
$$;

revoke all on function public.garage_private_sync_public_point() from public, anon, authenticated;

-- Garages ya cargados: pasar al punto exacto.
update public.garages g
   set public_lat = p.exact_lat,
       public_lng = p.exact_lng
  from public.garage_private p
 where p.garage_id = g.id;
