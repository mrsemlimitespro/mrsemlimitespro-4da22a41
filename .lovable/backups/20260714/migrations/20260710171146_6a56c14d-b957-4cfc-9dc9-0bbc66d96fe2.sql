
-- =========================================================================
-- 1) admin_settings: remover exposição do password_hash ao público
-- =========================================================================
DROP POLICY IF EXISTS "public read admin settings" ON public.admin_settings;

-- Zera todos os grants amplos e recria apenas o necessário
REVOKE ALL ON public.admin_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, singleton, site_name, logo_url, favicon_url,
  primary_color, accent_color, welcome_text, footer_text,
  notification_message, notification_active,
  extension_url, extension_filename,
  created_at, updated_at
) ON public.admin_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;

-- Política somente para admin em SELECT completo (password_hash inclusive
-- só é acessível via has_role admin — a coluna sensível fica fora do GRANT
-- para authenticated, então mesmo com policy true não é lida).
CREATE POLICY "authenticated read admin branding"
  ON public.admin_settings
  FOR SELECT TO authenticated
  USING (true);

-- =========================================================================
-- 2) gerar_chave_licenca: search_path fixo
-- =========================================================================
CREATE OR REPLACE FUNCTION public.gerar_chave_licenca()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _out text := '';
  _i int;
  _j int;
BEGIN
  FOR _j IN 1..4 LOOP
    FOR _i IN 1..5 LOOP
      _out := _out || substr(_chars, 1 + floor(random() * length(_chars))::int, 1);
    END LOOP;
    IF _j < 4 THEN _out := _out || '-'; END IF;
  END LOOP;
  RETURN _out;
END;
$function$;

-- =========================================================================
-- 3 & 4) SECURITY DEFINER — revogar de anon/PUBLIC, conceder explicitamente
--        apenas para o que o cliente autenticado realmente chama.
-- =========================================================================

-- Revoga em massa de PUBLIC/anon todas as funções SECURITY DEFINER
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format(
             'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
             p.proname,
             pg_get_function_identity_arguments(p.oid)
           ) AS stmt
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef = true
  LOOP
    EXECUTE r.stmt;
  END LOOP;
END $$;

-- Concede execute a service_role em todas (edge/back-end)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT format(
             'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
             p.proname,
             pg_get_function_identity_arguments(p.oid)
           ) AS stmt
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef = true
  LOOP
    EXECUTE r.stmt;
  END LOOP;
END $$;

-- Concede execute a authenticated somente para RPCs efetivamente chamadas do cliente
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_revendedor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_revendedor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_revendedor_profile(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_password_configured() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pagamento(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_licencas(integer, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atribuir_licenca_cliente(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.renovar_licenca(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_licenca(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reativar_licenca(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resetar_device_licenca(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.converter_licenca_em_premium(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_pack_download(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pack_client_has_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_notificacao(text, text, text, text, uuid, uuid, text) TO authenticated;
