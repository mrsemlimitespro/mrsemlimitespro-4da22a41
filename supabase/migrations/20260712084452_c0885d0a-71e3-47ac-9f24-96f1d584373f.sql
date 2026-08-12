
-- ============================================================
-- MR LOV 2.2 — Migração 1: schema delta para servidor de licenças
-- ============================================================

-- 1) api_keys: chaves de integração para a extensão / serviços
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  hash TEXT NOT NULL,
  prefixo TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['licenca:read']::text[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_prefixo_idx ON public.api_keys (prefixo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage api_keys"
  ON public.api_keys FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER api_keys_set_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2) Coluna reset_hwid_solicitado_em em licencas (fluxo em duas etapas)
ALTER TABLE public.licencas
  ADD COLUMN IF NOT EXISTS reset_hwid_solicitado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reset_hwid_motivo TEXT;

-- 3) config_extensao em admin_settings (JSON central para /licenca/config)
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS config_extensao JSONB NOT NULL DEFAULT '{
    "versao_minima": "1.0.0",
    "heartbeat_intervalo_seg": 300,
    "endpoints": {},
    "feature_flags": {},
    "aviso": null
  }'::jsonb;

-- 4) View v_licenca_estado: mapeia status/tipo/expira_em/device_id -> rótulos da extensão
CREATE OR REPLACE VIEW public.v_licenca_estado
WITH (security_invoker = true)
AS
SELECT
  l.id,
  l.chave,
  l.email,
  l.cliente_id,
  l.revendedor_id,
  l.tipo,
  l.status,
  l.expira_em,
  l.device_id,
  l.max_dispositivos,
  l.ultimo_acesso,
  l.trial_iniciado_em,
  l.trial_duracao_minutos,
  CASE
    WHEN l.status = 'revogada' THEN 'REVOKED'
    WHEN l.status = 'cancelada' THEN 'REVOKED'
    WHEN l.status = 'bloqueada' THEN 'BLOCKED'
    WHEN l.status = 'expirada' THEN 'EXPIRED'
    WHEN l.expira_em IS NOT NULL AND l.expira_em < now() THEN 'EXPIRED'
    WHEN l.status = 'ativa' AND l.tipo = 'teste' AND l.trial_iniciado_em IS NULL THEN 'PENDING'
    WHEN l.status = 'ativa' AND l.tipo = 'teste' THEN 'TRIAL'
    WHEN l.status = 'ativa' THEN 'VALID'
    ELSE 'PENDING'
  END AS estado_extensao,
  (
    SELECT count(*)::int
      FROM public.licenca_dispositivos ld
     WHERE ld.licenca_id = l.id
  ) AS dispositivos_conectados
FROM public.licencas l;

GRANT SELECT ON public.v_licenca_estado TO authenticated;
GRANT SELECT ON public.v_licenca_estado TO service_role;

-- 5) Função pública read-only de consulta de licença (usada por /consulta)
CREATE OR REPLACE FUNCTION public.consulta_licenca_publica(_chave TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _r record;
BEGIN
  SELECT estado_extensao, expira_em, tipo, dispositivos_conectados
    INTO _r
    FROM public.v_licenca_estado
   WHERE chave = _chave
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'estado', _r.estado_extensao,
    'tipo', _r.tipo,
    'expira_em', _r.expira_em,
    'dispositivos_conectados', _r.dispositivos_conectados
  );
END;
$$;

-- 6) Função de heartbeat: valida chave+device e atualiza último acesso
CREATE OR REPLACE FUNCTION public.heartbeat_licenca(
  _chave TEXT,
  _device_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lic public.licencas;
  _estado TEXT;
BEGIN
  SELECT * INTO _lic FROM public.licencas WHERE chave = _chave FOR UPDATE;
  IF _lic.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'estado', 'REVOKED', 'error', 'not_found');
  END IF;

  -- expira lazy
  IF _lic.expira_em IS NOT NULL AND _lic.expira_em < now() AND _lic.status = 'ativa' THEN
    UPDATE public.licencas SET status = 'expirada' WHERE id = _lic.id;
    _lic.status := 'expirada';
  END IF;

  IF _device_id IS NOT NULL AND _device_id <> ''
     AND _lic.device_id IS NOT NULL
     AND _lic.device_id <> _device_id THEN
    RETURN jsonb_build_object('ok', false, 'estado', 'DEVICE_MISMATCH');
  END IF;

  UPDATE public.licencas SET ultimo_acesso = now() WHERE id = _lic.id;

  SELECT estado_extensao INTO _estado FROM public.v_licenca_estado WHERE id = _lic.id;

  RETURN jsonb_build_object(
    'ok', _estado IN ('VALID','TRIAL'),
    'estado', _estado,
    'expira_em', _lic.expira_em
  );
END;
$$;

-- 7) Trigger MP recorrente: pagamento aprovado com plano_id -> gera licença
CREATE OR REPLACE FUNCTION public.tg_pagamento_gerar_licenca()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plano public.planos%ROWTYPE;
  _lic public.licencas%ROWTYPE;
  _dias INTEGER;
BEGIN
  IF NEW.status <> 'aprovado' OR (OLD.status IS NOT NULL AND OLD.status = 'aprovado') THEN
    RETURN NEW;
  END IF;
  IF NEW.plano_id IS NULL OR NEW.revendedor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- evita duplicar: se já existe licença associada a este pagamento nos metadados, pula
  IF EXISTS (
    SELECT 1 FROM public.licencas
     WHERE metadata ? 'payment_id'
       AND metadata->>'payment_id' = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _plano FROM public.planos WHERE id = NEW.plano_id;
  _dias := COALESCE(_plano.duracao_dias, 30);

  INSERT INTO public.licencas(
    chave, revendedor_id, status, duracao_dias, tipo,
    expira_em, ativada_em, metadata
  ) VALUES (
    public.gerar_chave_licenca(),
    NEW.revendedor_id,
    'ativa',
    _dias,
    'premium',
    CASE WHEN _dias > 0 THEN now() + make_interval(days => _dias) ELSE NULL END,
    now(),
    jsonb_build_object('payment_id', NEW.id::text, 'plano_id', NEW.plano_id::text)
  ) RETURNING * INTO _lic;

  -- notifica revendedor
  PERFORM public.criar_notificacao(
    'Nova licença gerada',
    format('Licença %s criada automaticamente após pagamento aprovado.', _lic.chave),
    'licenca', 'sucesso',
    NEW.revendedor_id, NULL, '/licencas'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pagamento_gerar_licenca ON public.payment_transactions;
CREATE TRIGGER trg_pagamento_gerar_licenca
  AFTER INSERT OR UPDATE OF status ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_pagamento_gerar_licenca();

-- Garantir que licencas tem coluna metadata (idempotente)
ALTER TABLE public.licencas
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
