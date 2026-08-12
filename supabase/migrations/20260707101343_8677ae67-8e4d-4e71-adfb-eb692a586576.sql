
-- ============================================================
-- 1. Tabela pack_authorizations (cadeia Admin → Revendedor → Cliente)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pack_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.premium_packs(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('admin_to_reseller','reseller_to_client')),
  revendedor_id UUID REFERENCES public.revendedores(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  cliente_email TEXT,
  authorized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pack_auth_level_shape CHECK (
    (level = 'admin_to_reseller' AND revendedor_id IS NOT NULL AND cliente_id IS NULL)
    OR
    (level = 'reseller_to_client' AND revendedor_id IS NOT NULL AND (cliente_id IS NOT NULL OR cliente_email IS NOT NULL))
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS pack_auth_unique_admin_reseller
  ON public.pack_authorizations(pack_id, revendedor_id)
  WHERE level = 'admin_to_reseller';

CREATE INDEX IF NOT EXISTS pack_auth_reseller_client_idx
  ON public.pack_authorizations(pack_id, revendedor_id, cliente_id)
  WHERE level = 'reseller_to_client';

CREATE INDEX IF NOT EXISTS pack_auth_email_idx
  ON public.pack_authorizations(lower(cliente_email))
  WHERE cliente_email IS NOT NULL;

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pack_authorizations TO authenticated;
GRANT ALL ON public.pack_authorizations TO service_role;

-- RLS
ALTER TABLE public.pack_authorizations ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "pack_auth_admin_all"
ON public.pack_authorizations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Revendedor: enxerga próprias autorizações
CREATE POLICY "pack_auth_reseller_select"
ON public.pack_authorizations
FOR SELECT
TO authenticated
USING (revendedor_id = public.current_revendedor_id());

-- Revendedor: cria autorização reseller→client apenas se admin já liberou o pack para ele
CREATE POLICY "pack_auth_reseller_insert"
ON public.pack_authorizations
FOR INSERT
TO authenticated
WITH CHECK (
  level = 'reseller_to_client'
  AND revendedor_id = public.current_revendedor_id()
  AND EXISTS (
    SELECT 1 FROM public.pack_authorizations pa
    WHERE pa.pack_id = pack_authorizations.pack_id
      AND pa.level = 'admin_to_reseller'
      AND pa.revendedor_id = public.current_revendedor_id()
      AND pa.status = 'active'
      AND (pa.expires_at IS NULL OR pa.expires_at > now())
  )
);

-- Revendedor: pode atualizar/revogar apenas as próprias autorizações reseller→client
CREATE POLICY "pack_auth_reseller_update"
ON public.pack_authorizations
FOR UPDATE
TO authenticated
USING (
  level = 'reseller_to_client'
  AND revendedor_id = public.current_revendedor_id()
)
WITH CHECK (
  level = 'reseller_to_client'
  AND revendedor_id = public.current_revendedor_id()
);

CREATE POLICY "pack_auth_reseller_delete"
ON public.pack_authorizations
FOR DELETE
TO authenticated
USING (
  level = 'reseller_to_client'
  AND revendedor_id = public.current_revendedor_id()
);

-- Trigger updated_at
CREATE TRIGGER trg_pack_auth_updated_at
BEFORE UPDATE ON public.pack_authorizations
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- 2. Função has-access: verifica cadeia completa por email
-- ============================================================
CREATE OR REPLACE FUNCTION public.pack_client_has_access(_pack_id UUID, _email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pack_authorizations rc
    JOIN public.pack_authorizations ar
      ON ar.pack_id = rc.pack_id
     AND ar.revendedor_id = rc.revendedor_id
     AND ar.level = 'admin_to_reseller'
     AND ar.status = 'active'
     AND (ar.expires_at IS NULL OR ar.expires_at > now())
    WHERE rc.pack_id = _pack_id
      AND rc.level = 'reseller_to_client'
      AND rc.status = 'active'
      AND (rc.expires_at IS NULL OR rc.expires_at > now())
      AND (
        lower(coalesce(rc.cliente_email,'')) = lower(coalesce(_email,''))
        OR EXISTS (
          SELECT 1 FROM public.clientes c
          WHERE c.id = rc.cliente_id
            AND lower(coalesce(c.email,'')) = lower(coalesce(_email,''))
        )
      )
  )
  OR EXISTS (
    -- também respeita pack_access direto (compra individual / manual admin)
    SELECT 1 FROM public.pack_access pa
    WHERE pa.pack_id = _pack_id
      AND pa.status = 'active'
      AND lower(pa.email) = lower(coalesce(_email,''))
  );
$$;

-- ============================================================
-- 3. Função de autorização de download (registra log + incrementa contador)
-- ============================================================
CREATE OR REPLACE FUNCTION public.authorize_pack_download(
  _pack_id UUID,
  _email TEXT,
  _ip TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _allowed BOOLEAN;
  _pack RECORD;
BEGIN
  IF _email IS NULL OR _email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_required');
  END IF;

  SELECT id, nome, slug, allow_download INTO _pack
    FROM public.premium_packs WHERE id = _pack_id;

  IF _pack.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pack_not_found');
  END IF;

  IF NOT COALESCE(_pack.allow_download, true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'download_disabled');
  END IF;

  _allowed := public.pack_client_has_access(_pack_id, _email);

  IF NOT _allowed THEN
    -- log da tentativa negada
    INSERT INTO public.pack_download_logs(pack_id, email, status, ip, user_agent)
    VALUES (_pack_id, lower(_email), 'denied', _ip, _user_agent);
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  INSERT INTO public.pack_download_logs(pack_id, email, status, ip, user_agent)
  VALUES (_pack_id, lower(_email), 'authorized', _ip, _user_agent);

  UPDATE public.premium_packs
     SET downloads = COALESCE(downloads,0) + 1
   WHERE id = _pack_id;

  RETURN jsonb_build_object('ok', true, 'pack_id', _pack.id, 'slug', _pack.slug);
END;
$$;
