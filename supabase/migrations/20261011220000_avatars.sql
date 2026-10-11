-- Foto de perfil (pedido del usuario 2026-10-11).
-- Bucket PÚBLICO "avatars": "<user_id>/<aleatorio>.jpg" (el nombre aleatorio no
-- se puede adivinar). La ve quien recibe la ruta: la propia persona y el garage
-- en sus reservas y avisos de llegada (copia en bookings / arrival_notices).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars: la persona sube la suya"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Necesario para borrar (la API de Storage lee el objeto antes).
create policy "avatars: la persona ve las suyas"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars: la persona borra las suyas"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter table public.profiles
  add column if not exists avatar_path text not null default ''
    check (avatar_path = '' or avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$');
grant insert (avatar_path) on public.profiles to authenticated;
grant update (avatar_path) on public.profiles to authenticated;

-- La ruta tiene que estar en la carpeta de la propia persona.
create or replace function public.profiles_avatar_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.avatar_path <> '' and split_part(new.avatar_path, '/', 1) <> new.id::text then
    raise exception 'avatar_path_invalid' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_avatar_check on public.profiles;
create trigger profiles_avatar_check
  before insert or update of avatar_path on public.profiles
  for each row execute function public.profiles_avatar_check();

-- Copia de la foto del conductor en reservas y avisos (la ve el garage).
alter table public.bookings add column if not exists driver_avatar text not null default '';
alter table public.arrival_notices add column if not exists driver_avatar text not null default '';

create or replace function public.copy_driver_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.driver_avatar := coalesce((select p.avatar_path from public.profiles p where p.id = new.driver_id), '');
  return new;
end;
$$;
drop trigger if exists bookings_driver_avatar on public.bookings;
create trigger bookings_driver_avatar
  before insert on public.bookings
  for each row execute function public.copy_driver_avatar();
drop trigger if exists arrival_notices_driver_avatar on public.arrival_notices;
create trigger arrival_notices_driver_avatar
  before insert on public.arrival_notices
  for each row execute function public.copy_driver_avatar();
