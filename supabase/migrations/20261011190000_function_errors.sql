-- Registro de errores de las Edge Functions (para diagnosticar integraciones).
-- Sin acceso desde la página; se consulta desde el panel/CLI.
create table if not exists public.function_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  fn text not null,
  step text not null,
  detail text not null default ''
);
alter table public.function_errors enable row level security;
revoke all on public.function_errors from anon, authenticated;
