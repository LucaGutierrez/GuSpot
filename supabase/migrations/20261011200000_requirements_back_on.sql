-- 2026-10-11: el usuario pidió volver a prender todas las verificaciones
-- (identidad con DNI + cara, y celular verificado para publicar).
update public.app_settings set value = 'true'
 where key in ('require_identity_verification', 'require_phone_verification');
