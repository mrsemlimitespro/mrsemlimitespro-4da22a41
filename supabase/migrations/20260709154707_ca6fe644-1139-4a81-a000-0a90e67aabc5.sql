
-- 1) Extend licencas
ALTER TABLE public.licencas
  ADD COLUMN IF NOT EXISTS chave_fornecedor_encrypted jsonb,
  ADD COLUMN IF NOT EXISTS fornecedor_slug text,
  ADD COLUMN IF NOT EXISTS fornecedor_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS produto_id uuid,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'premium',
  ADD COLUMN IF NOT EXISTS trial_duracao_minutos integer,
  ADD COLUMN IF NOT EXISTS trial_iniciado_em timestamptz,
  ADD COLUMN IF NOT EXISTS max_dispositivos integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS versao_min text,
  ADD COLUMN IF NOT EXISTS observacoes_admin text;

DO $$ BEGIN
  ALTER TABLE public.licencas
    ADD CONSTRAINT licencas_tipo_chk CHECK (tipo IN ('teste','premium'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) licenca_produtos
CREATE TABLE IF NOT EXISTS public.licenca_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  fornecedor_padrao text,
  versao_atual text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenca_produtos TO authenticated;
GRANT ALL ON public.licenca_produtos TO service_role;
ALTER TABLE public.licenca_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin all licenca_produtos" ON public.licenca_produtos;
CREATE POLICY "admin all licenca_produtos" ON public.licenca_produtos
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "authenticated read licenca_produtos" ON public.licenca_produtos;
CREATE POLICY "authenticated read licenca_produtos" ON public.licenca_produtos
  FOR SELECT TO authenticated USING (ativo = true);

DROP TRIGGER IF EXISTS trg_licenca_produtos_updated ON public.licenca_produtos;
CREATE TRIGGER trg_licenca_produtos_updated
  BEFORE UPDATE ON public.licenca_produtos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- FK produto
DO $$ BEGIN
  ALTER TABLE public.licencas
    ADD CONSTRAINT licencas_produto_id_fkey
    FOREIGN KEY (produto_id) REFERENCES public.licenca_produtos(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) licenca_dispositivos
CREATE TABLE IF NOT EXISTS public.licenca_dispositivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licenca_id uuid NOT NULL REFERENCES public.licencas(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_nome text,
  ip text,
  user_agent text,
  cidade text,
  primeiro_acesso timestamptz NOT NULL DEFAULT now(),
  ultimo_acesso timestamptz NOT NULL DEFAULT now(),
  UNIQUE (licenca_id, device_id)
);
CREATE INDEX IF NOT EXISTS licenca_dispositivos_licenca_idx
  ON public.licenca_dispositivos(licenca_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licenca_dispositivos TO authenticated;
GRANT ALL ON public.licenca_dispositivos TO service_role;
ALTER TABLE public.licenca_dispositivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin all licenca_dispositivos" ON public.licenca_dispositivos;
CREATE POLICY "admin all licenca_dispositivos" ON public.licenca_dispositivos
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "revendedor read own licenca_dispositivos" ON public.licenca_dispositivos;
CREATE POLICY "revendedor read own licenca_dispositivos" ON public.licenca_dispositivos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.licencas l
    WHERE l.id = licenca_dispositivos.licenca_id
      AND l.revendedor_id = public.current_revendedor_id()
  ));

-- 4) licenca_acessos
CREATE TABLE IF NOT EXISTS public.licenca_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licenca_id uuid REFERENCES public.licencas(id) ON DELETE CASCADE,
  chave text,
  device_id text,
  ip text,
  user_agent text,
  versao text,
  resultado text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS licenca_acessos_licenca_idx
  ON public.licenca_acessos(licenca_id, created_at DESC);
GRANT SELECT, INSERT ON public.licenca_acessos TO authenticated;
GRANT ALL ON public.licenca_acessos TO service_role;
ALTER TABLE public.licenca_acessos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin all licenca_acessos" ON public.licenca_acessos;
CREATE POLICY "admin all licenca_acessos" ON public.licenca_acessos
  TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "revendedor read own licenca_acessos" ON public.licenca_acessos;
CREATE POLICY "revendedor read own licenca_acessos" ON public.licenca_acessos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.licencas l
    WHERE l.id = licenca_acessos.licenca_id
      AND l.revendedor_id = public.current_revendedor_id()
  ));

-- 5) expirar trials vencidos
CREATE OR REPLACE FUNCTION public.expirar_trials_vencidos()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  WITH upd AS (
    UPDATE public.licencas
       SET status = 'expirada'
     WHERE status = 'ativa'
       AND tipo = 'teste'
       AND trial_iniciado_em IS NOT NULL
       AND trial_duracao_minutos IS NOT NULL
       AND trial_iniciado_em + make_interval(mins => trial_duracao_minutos) < now()
    RETURNING id
  )
  SELECT count(*) INTO _n FROM upd;
  RETURN _n;
END; $$;

-- 6) converter em premium
CREATE OR REPLACE FUNCTION public.converter_licenca_em_premium(_licenca_id uuid)
RETURNS public.licencas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _l public.licencas;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  UPDATE public.licencas
     SET tipo = 'premium',
         status = 'ativa',
         trial_iniciado_em = NULL,
         trial_duracao_minutos = NULL,
         expira_em = NULL
   WHERE id = _licenca_id
   RETURNING * INTO _l;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada.'; END IF;
  INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, cliente_id, ator_user_id)
  VALUES (_l.id, 'reativada', 'Convertida em Premium', _l.cliente_id, auth.uid());
  RETURN _l;
END; $$;
