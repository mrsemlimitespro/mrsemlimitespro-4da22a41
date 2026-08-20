
ALTER TABLE public.license_features ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.license_features FROM PUBLIC, anon;
GRANT SELECT ON public.license_features TO authenticated;
GRANT ALL ON public.license_features TO service_role;

DROP POLICY IF EXISTS license_features_admin_all ON public.license_features;
CREATE POLICY license_features_admin_all ON public.license_features
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS license_features_owner_read ON public.license_features;
CREATE POLICY license_features_owner_read ON public.license_features
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.licencas l
    JOIN public.revendedores r ON r.id = l.revendedor_id
    WHERE l.id = license_features.license_id
      AND r.auth_user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "authenticated read admin branding" ON public.admin_settings;
GRANT SELECT ON public.admin_settings TO authenticated;

DROP VIEW IF EXISTS public.admin_branding;
CREATE VIEW public.admin_branding
WITH (security_invoker = off) AS
SELECT id, site_name, logo_url, favicon_url, primary_color, accent_color,
       welcome_text, footer_text, notification_message, notification_active,
       link_comunidade, painel_revendedor_valor, kiwify_checkout_url_revendedor
FROM public.admin_settings;
GRANT SELECT ON public.admin_branding TO anon, authenticated;

DROP POLICY IF EXISTS email_templates_read_authed ON public.email_templates;

DROP POLICY IF EXISTS authenticated_read_modules ON public.system_modules;
DROP POLICY IF EXISTS system_modules_read_by_role ON public.system_modules;
CREATE POLICY system_modules_read_by_role ON public.system_modules
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      ativo
      AND (
        roles IS NULL
        OR jsonb_typeof(roles) <> 'array'
        OR jsonb_array_length(roles) = 0
        OR roles ? 'cliente'
        OR (roles ? 'revendedor' AND public.is_revendedor(auth.uid()))
      )
    )
  );

DROP POLICY IF EXISTS "reseller read extension-releases" ON storage.objects;
CREATE POLICY "reseller read extension-releases" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'extension-releases'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1
        FROM public.revendedores r
        JOIN public.extensoes e
          ON e.bucket = 'extension-releases'
         AND e.path = storage.objects.name
        WHERE r.auth_user_id = auth.uid()
          AND r.bloqueado = false
          AND r.deleted_at IS NULL
          AND (
            e.download_publico = true
            OR EXISTS (
              SELECT 1 FROM public.licencas l
              WHERE l.revendedor_id = r.id AND l.produto_id = e.produto_id
            )
          )
      )
    )
  );

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                  p.proname, pg_get_function_identity_arguments(p.oid)) AS stmt
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
  LOOP EXECUTE r.stmt; END LOOP;

  FOR r IN
    SELECT format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
                  p.proname, pg_get_function_identity_arguments(p.oid)) AS stmt
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
  LOOP EXECUTE r.stmt; END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_revendedor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_revendedor_id() TO authenticated;
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
GRANT EXECUTE ON FUNCTION public.revendedor_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reenviar_licenca(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit(text, text, uuid, jsonb, jsonb, jsonb) TO authenticated;
