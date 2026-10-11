-- Arreglo: garages_before_write llama a missing_requirements (sin permiso para
-- los usuarios) y Postgres controla ese permiso aunque la condición no llegue a
-- evaluarse, así que crear o editar un garage daba "permission denied" (42501).
-- El trigger corre ahora con los permisos del dueño de la función.
alter function public.garages_before_write() security definer;
