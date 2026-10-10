-- Indicaciones de llegada: cómo entrar y dónde estacionar dentro del garage
-- ("portón negro, 2º subsuelo, cochera 14"). PRIVADO como la dirección: hoy
-- solo lo ve el propietario; en la etapa de reservas lo verá además el
-- conductor con una reserva CONFIRMADA (y pagada).

alter table public.garage_private
  add column arrival_instructions text not null default ''
  check (char_length(arrival_instructions) <= 1000);

grant insert (arrival_instructions) on public.garage_private to authenticated;
grant update (arrival_instructions) on public.garage_private to authenticated;
