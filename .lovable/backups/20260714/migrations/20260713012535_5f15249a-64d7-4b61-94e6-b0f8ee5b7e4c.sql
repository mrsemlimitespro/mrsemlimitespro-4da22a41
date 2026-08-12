
-- Policies para o bucket lovable-message-attachments (privado). Acesso é feito
-- exclusivamente via service role no endpoint /api/public/ext/storage/v1/*.
-- Permitir apenas o próprio service role (nenhum anon/authenticated) — RLS já
-- bloqueia. Explicitamente criamos policy para admin_role via has_role para
-- inspeção no painel.
CREATE POLICY "Admins podem ler anexos da extensão"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lovable-message-attachments'
  AND public.has_role(auth.uid(), 'admin')
);

-- Semear config_extensao com whatsapp_url/templates vazios (se ainda não tiver)
UPDATE public.admin_settings
   SET config_extensao = COALESCE(config_extensao, '{}'::jsonb)
                       || jsonb_build_object(
                            'versao_minima', COALESCE(config_extensao->>'versao_minima','1.0.0'),
                            'heartbeat_intervalo_seg', COALESCE((config_extensao->>'heartbeat_intervalo_seg')::int, 300),
                            'whatsapp_url', COALESCE(config_extensao->>'whatsapp_url', NULL),
                            'templates', COALESCE(config_extensao->'templates', '[]'::jsonb)
                          )
 WHERE singleton = true;
