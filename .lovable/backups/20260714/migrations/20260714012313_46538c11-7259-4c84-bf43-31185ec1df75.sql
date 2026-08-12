
-- ================================================================
-- FASE 1 — Base da hierarquia MR Sem Limites
-- Aditivo. Não altera nada existente, apenas adiciona colunas/policies.
-- ================================================================

-- 1) CLIENTES: campos exigidos pelo cadastro completo
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS empresa text;

-- 2) PROMOCOES: pertencer a um revendedor + cupons
ALTER TABLE public.promocoes
  ADD COLUMN IF NOT EXISTS revendedor_id uuid REFERENCES public.revendedores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS codigo_cupom text,
  ADD COLUMN IF NOT EXISTS desconto_valor numeric(12,2),
  ADD COLUMN IF NOT EXISTS uso_maximo integer,
  ADD COLUMN IF NOT EXISTS usos_atuais integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS promocoes_revendedor_id_idx ON public.promocoes(revendedor_id);

-- Cupom único por revendedor (case-insensitive). NULL fica livre.
CREATE UNIQUE INDEX IF NOT EXISTS promocoes_cupom_unico_por_revendedor
  ON public.promocoes (revendedor_id, lower(codigo_cupom))
  WHERE codigo_cupom IS NOT NULL;

-- Novas policies para revendedor gerenciar suas próprias promoções.
DROP POLICY IF EXISTS "revendedor manage own promocoes" ON public.promocoes;
CREATE POLICY "revendedor manage own promocoes"
  ON public.promocoes
  FOR ALL
  TO authenticated
  USING (revendedor_id = public.current_revendedor_id())
  WITH CHECK (revendedor_id = public.current_revendedor_id());

-- A policy "promocoes ativas visiveis" já cobre leitura pública; mantida como está.

-- 3) TRIGGER: honrar revendedor_id vindo do signup (raw_user_meta_data)
CREATE OR REPLACE FUNCTION public.tg_auth_user_to_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nome text;
  _rev  uuid;
  _wp   text;
  _tel  text;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  _nome := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name',''),
    NULLIF(NEW.raw_user_meta_data->>'name',''),
    split_part(NEW.email,'@',1)
  );

  -- Se veio no metadata, tenta casar com um revendedor real
  BEGIN
    _rev := NULLIF(NEW.raw_user_meta_data->>'revendedor_id','')::uuid;
  EXCEPTION WHEN others THEN
    _rev := NULL;
  END;
  IF _rev IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.revendedores WHERE id = _rev) THEN
    _rev := NULL;
  END IF;

  _wp  := NULLIF(NEW.raw_user_meta_data->>'whatsapp','');
  _tel := NULLIF(NEW.raw_user_meta_data->>'telefone','');

  INSERT INTO public.clientes (nome, email, ultimo_acesso, status, revendedor_id, whatsapp, telefone)
  VALUES (_nome, lower(NEW.email), now(), 'ativo', _rev, _wp, _tel)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4) VIEW: hierarquia consolidada de clientes (respeita RLS da tabela base)
CREATE OR REPLACE VIEW public.v_hierarquia_clientes
WITH (security_invoker = on) AS
  SELECT
    c.id                  AS cliente_id,
    c.nome                AS cliente_nome,
    c.email               AS cliente_email,
    c.whatsapp,
    c.telefone,
    c.cpf,
    c.empresa,
    c.status              AS cliente_status,
    c.ultimo_acesso,
    c.created_at          AS cliente_criado_em,
    r.id                  AS revendedor_id,
    r.nome                AS revendedor_nome,
    r.email               AS revendedor_email
  FROM public.clientes c
  LEFT JOIN public.revendedores r ON r.id = c.revendedor_id;

GRANT SELECT ON public.v_hierarquia_clientes TO authenticated;
GRANT SELECT ON public.v_hierarquia_clientes TO service_role;
