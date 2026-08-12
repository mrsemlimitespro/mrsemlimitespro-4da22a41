
-- =============================================================
-- FASE 1 — Fundação de dados
-- =============================================================

-- 1. licencas_eventos ------------------------------------------
CREATE TABLE IF NOT EXISTS public.licencas_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licenca_id uuid NOT NULL REFERENCES public.licencas(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- criada|vinculada|ativada|acesso|reset|renovada|cancelada|expirada|reativada
  mensagem text,
  ip text,
  device_id text,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ator_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS licencas_eventos_lic_idx ON public.licencas_eventos(licenca_id, created_at DESC);
CREATE INDEX IF NOT EXISTS licencas_eventos_tipo_idx ON public.licencas_eventos(tipo);

GRANT SELECT, INSERT ON public.licencas_eventos TO authenticated;
GRANT ALL ON public.licencas_eventos TO service_role;

ALTER TABLE public.licencas_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all licencas_eventos" ON public.licencas_eventos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "revendedor read own licenca_eventos" ON public.licencas_eventos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.licencas l
    WHERE l.id = licencas_eventos.licenca_id
      AND l.revendedor_id = public.current_revendedor_id()
  ));

-- 2. dispositivos ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispositivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  licenca_id uuid REFERENCES public.licencas(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  device_id text NOT NULL,
  nome text,
  so text,
  versao text,
  navegador text,
  ip text,
  cidade text,
  pais text,
  primeira_vez timestamptz NOT NULL DEFAULT now(),
  ultimo_acesso timestamptz NOT NULL DEFAULT now(),
  bloqueado boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (licenca_id, device_id)
);

CREATE INDEX IF NOT EXISTS dispositivos_licenca_idx ON public.dispositivos(licenca_id);
CREATE INDEX IF NOT EXISTS dispositivos_cliente_idx ON public.dispositivos(cliente_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispositivos TO authenticated;
GRANT ALL ON public.dispositivos TO service_role;

ALTER TABLE public.dispositivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all dispositivos" ON public.dispositivos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "revendedor read own dispositivos" ON public.dispositivos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.licencas l
    WHERE l.id = dispositivos.licenca_id
      AND l.revendedor_id = public.current_revendedor_id()
  ));

CREATE TRIGGER trg_dispositivos_updated
  BEFORE UPDATE ON public.dispositivos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. audit_logs ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ator_user_id uuid,
  ator_email text,
  ator_papel text, -- admin|revendedor|sistema
  acao text NOT NULL, -- insert|update|delete|login|logout|pagamento|reset|upload|config
  entidade text NOT NULL,
  entidade_id uuid,
  dados_antes jsonb,
  dados_depois jsonb,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entidade_idx ON public.audit_logs(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS audit_logs_ator_idx ON public.audit_logs(ator_user_id, created_at DESC);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "authenticated insert audit_log" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (ator_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 4. access_logs — colunas adicionais --------------------------
ALTER TABLE public.access_logs
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS pais text,
  ADD COLUMN IF NOT EXISTS dispositivo text,
  ADD COLUMN IF NOT EXISTS so text,
  ADD COLUMN IF NOT EXISTS navegador text;

-- 5. notificacoes — ownership ----------------------------------
ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS revendedor_id uuid REFERENCES public.revendedores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS lida_em timestamptz,
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'geral';

CREATE INDEX IF NOT EXISTS notificacoes_rev_idx ON public.notificacoes(revendedor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notificacoes_user_idx ON public.notificacoes(user_id, created_at DESC);

DROP POLICY IF EXISTS "public read notificacoes" ON public.notificacoes;

CREATE POLICY "revendedor read own notif" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (
    revendedor_id = public.current_revendedor_id()
    OR user_id = auth.uid()
    OR (revendedor_id IS NULL AND user_id IS NULL) -- broadcast
    OR public.has_role(auth.uid(),'admin')
  );

CREATE POLICY "revendedor update own notif" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (revendedor_id = public.current_revendedor_id() OR user_id = auth.uid())
  WITH CHECK (revendedor_id = public.current_revendedor_id() OR user_id = auth.uid());

-- 6. Função criar_notificacao ----------------------------------
CREATE OR REPLACE FUNCTION public.criar_notificacao(
  _titulo text,
  _mensagem text,
  _categoria text DEFAULT 'geral',
  _tipo text DEFAULT 'info',
  _revendedor_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL,
  _link text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.notificacoes(titulo, mensagem, tipo, destino, categoria, revendedor_id, user_id, link)
  VALUES (
    _titulo, _mensagem, _tipo,
    CASE WHEN _revendedor_id IS NOT NULL THEN 'revendedor'
         WHEN _user_id IS NOT NULL THEN 'user'
         ELSE 'todos' END,
    _categoria, _revendedor_id, _user_id, _link
  ) RETURNING id INTO _id;
  RETURN _id;
END;$$;

GRANT EXECUTE ON FUNCTION public.criar_notificacao(text,text,text,text,uuid,uuid,text) TO authenticated;

-- 7. Trigger de histórico em licencas --------------------------
CREATE OR REPLACE FUNCTION public.tg_licencas_evento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, cliente_id, ator_user_id)
    VALUES (NEW.id, 'criada', 'Licença gerada', NEW.cliente_id, auth.uid());
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.cliente_id IS DISTINCT FROM OLD.cliente_id AND NEW.cliente_id IS NOT NULL THEN
      INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, cliente_id, ator_user_id)
      VALUES (NEW.id, 'vinculada', 'Vinculada ao cliente', NEW.cliente_id, auth.uid());
    END IF;

    IF NEW.ativada_em IS DISTINCT FROM OLD.ativada_em AND NEW.ativada_em IS NOT NULL AND OLD.ativada_em IS NULL THEN
      INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, cliente_id, ator_user_id)
      VALUES (NEW.id, 'ativada', 'Primeira ativação', NEW.cliente_id, auth.uid());
    END IF;

    IF NEW.device_id IS DISTINCT FROM OLD.device_id THEN
      IF NEW.device_id IS NULL THEN
        INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, cliente_id, ator_user_id)
        VALUES (NEW.id, 'reset', 'Dispositivo liberado', NEW.cliente_id, auth.uid());
      ELSE
        INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, device_id, cliente_id, ator_user_id)
        VALUES (NEW.id, 'acesso', 'Dispositivo registrado', NEW.device_id, NEW.cliente_id, auth.uid());
      END IF;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, cliente_id, ator_user_id, metadata)
      VALUES (NEW.id,
        CASE NEW.status
          WHEN 'cancelada' THEN 'cancelada'
          WHEN 'revogada' THEN 'cancelada'
          WHEN 'expirada' THEN 'expirada'
          WHEN 'ativa' THEN 'reativada'
          ELSE 'acesso' END,
        format('Status: %s → %s', OLD.status, NEW.status),
        NEW.cliente_id, auth.uid(),
        jsonb_build_object('de', OLD.status, 'para', NEW.status));
    END IF;

    IF NEW.expira_em IS DISTINCT FROM OLD.expira_em AND OLD.expira_em IS NOT NULL AND NEW.expira_em > COALESCE(OLD.expira_em, now()) THEN
      INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, cliente_id, ator_user_id, metadata)
      VALUES (NEW.id, 'renovada', 'Validade estendida', NEW.cliente_id, auth.uid(),
        jsonb_build_object('de', OLD.expira_em, 'para', NEW.expira_em));
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_licencas_evento ON public.licencas;
CREATE TRIGGER trg_licencas_evento
  AFTER INSERT OR UPDATE ON public.licencas
  FOR EACH ROW EXECUTE FUNCTION public.tg_licencas_evento();

-- 8. Notificação ao aprovar pagamento --------------------------
CREATE OR REPLACE FUNCTION public.tg_pagamento_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS DISTINCT FROM 'aprovado') THEN
    PERFORM public.criar_notificacao(
      'Pagamento aprovado',
      format('Pagamento de R$ %s aprovado.', to_char(NEW.valor,'FM999G999D00')),
      'pagamento', 'sucesso',
      NEW.revendedor_id, NULL,
      '/pagamentos'
    );
  ELSIF NEW.status IN ('recusado','falhou') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.criar_notificacao(
      'Pagamento recusado',
      format('Pagamento de R$ %s foi recusado.', to_char(NEW.valor,'FM999G999D00')),
      'pagamento', 'erro',
      NEW.revendedor_id, NULL, '/pagamentos'
    );
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_pagamento_notify ON public.payment_transactions;
CREATE TRIGGER trg_pagamento_notify
  AFTER UPDATE OF status ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_pagamento_notify();

-- 9. RPCs de manutenção de licença -----------------------------
CREATE OR REPLACE FUNCTION public.renovar_licenca(_licenca_id uuid, _dias integer)
RETURNS public.licencas LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _l public.licencas;
BEGIN
  IF _dias IS NULL OR _dias < 1 THEN RAISE EXCEPTION 'Dias inválido'; END IF;
  UPDATE public.licencas
     SET expira_em = GREATEST(COALESCE(expira_em, now()), now()) + make_interval(days => _dias),
         status = 'ativa'
   WHERE id = _licenca_id
     AND (public.has_role(auth.uid(),'admin') OR revendedor_id = public.current_revendedor_id())
   RETURNING * INTO _l;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada ou sem permissão.'; END IF;
  RETURN _l;
END;$$;
GRANT EXECUTE ON FUNCTION public.renovar_licenca(uuid,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancelar_licenca(_licenca_id uuid, _motivo text DEFAULT NULL)
RETURNS public.licencas LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _l public.licencas;
BEGIN
  UPDATE public.licencas
     SET status = 'cancelada'
   WHERE id = _licenca_id
     AND (public.has_role(auth.uid(),'admin') OR revendedor_id = public.current_revendedor_id())
   RETURNING * INTO _l;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada.'; END IF;
  INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, ator_user_id, metadata)
  VALUES (_l.id, 'cancelada', COALESCE(_motivo,'Cancelada'), auth.uid(), jsonb_build_object('motivo',_motivo));
  RETURN _l;
END;$$;
GRANT EXECUTE ON FUNCTION public.cancelar_licenca(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reativar_licenca(_licenca_id uuid)
RETURNS public.licencas LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _l public.licencas;
BEGIN
  UPDATE public.licencas
     SET status = 'ativa'
   WHERE id = _licenca_id
     AND (public.has_role(auth.uid(),'admin') OR revendedor_id = public.current_revendedor_id())
   RETURNING * INTO _l;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada.'; END IF;
  RETURN _l;
END;$$;
GRANT EXECUTE ON FUNCTION public.reativar_licenca(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.expirar_licencas_vencidas()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  WITH upd AS (
    UPDATE public.licencas
       SET status = 'expirada'
     WHERE status = 'ativa'
       AND expira_em IS NOT NULL
       AND expira_em < now()
    RETURNING id
  )
  SELECT count(*) INTO _n FROM upd;
  RETURN _n;
END;$$;
GRANT EXECUTE ON FUNCTION public.expirar_licencas_vencidas() TO authenticated, service_role;

-- 10. VIEWS ----------------------------------------------------
CREATE OR REPLACE VIEW public.v_estoque_licencas AS
SELECT
  count(*) FILTER (WHERE status='ativa' AND cliente_id IS NULL) AS disponiveis,
  count(*) FILTER (WHERE status='ativa' AND cliente_id IS NOT NULL AND (expira_em IS NULL OR expira_em >= now())) AS ativas,
  count(*) FILTER (WHERE status='expirada' OR (status='ativa' AND expira_em IS NOT NULL AND expira_em < now())) AS expiradas,
  count(*) FILTER (WHERE status='cancelada') AS canceladas,
  count(*) FILTER (WHERE status='revogada') AS bloqueadas,
  count(*) AS total
FROM public.licencas
WHERE public.has_role(auth.uid(),'admin')
   OR revendedor_id = public.current_revendedor_id();

GRANT SELECT ON public.v_estoque_licencas TO authenticated;

CREATE OR REPLACE VIEW public.v_dashboard_metricas AS
WITH
r AS (
  SELECT
    COALESCE(SUM(valor) FILTER (WHERE status='aprovado'),0) AS receita_total,
    COALESCE(SUM(valor) FILTER (WHERE status='aprovado' AND created_at >= date_trunc('month', now())),0) AS receita_mes,
    COALESCE(SUM(valor) FILTER (WHERE status='aprovado' AND created_at >= date_trunc('year', now())),0) AS receita_ano,
    count(*) FILTER (WHERE status='aprovado') AS vendas,
    count(*) AS transacoes_total
  FROM public.payment_transactions
  WHERE public.has_role(auth.uid(),'admin') OR revendedor_id = public.current_revendedor_id()
),
c AS (SELECT count(*) AS clientes FROM public.clientes
      WHERE public.has_role(auth.uid(),'admin') OR revendedor_id = public.current_revendedor_id()),
re AS (SELECT count(*) AS revendedores FROM public.revendedores),
l AS (SELECT count(*) AS licencas FROM public.licencas
      WHERE public.has_role(auth.uid(),'admin') OR revendedor_id = public.current_revendedor_id()),
cr AS (SELECT COALESCE(SUM(saldo_creditos),0) AS creditos FROM public.revendedores
       WHERE public.has_role(auth.uid(),'admin') OR id = public.current_revendedor_id()),
p AS (SELECT count(*) AS produtos FROM public.produtos),
pl AS (SELECT count(*) AS planos FROM public.planos)
SELECT
  r.receita_total, r.receita_mes, r.receita_ano, r.vendas, r.transacoes_total,
  c.clientes, re.revendedores, l.licencas, cr.creditos, p.produtos, pl.planos,
  CASE WHEN r.transacoes_total > 0 THEN round((r.vendas::numeric / r.transacoes_total) * 100, 1) ELSE 0 END AS conversao
FROM r, c, re, l, cr, p, pl;

GRANT SELECT ON public.v_dashboard_metricas TO authenticated;

CREATE OR REPLACE VIEW public.v_revendedor_visao AS
SELECT
  rv.id,
  rv.nome,
  rv.email,
  rv.saldo_creditos,
  rv.plano_id,
  rv.plano_expira_em,
  rv.status,
  rv.bloqueado,
  (SELECT count(*) FROM public.clientes c WHERE c.revendedor_id = rv.id) AS clientes,
  (SELECT count(*) FROM public.licencas l WHERE l.revendedor_id = rv.id) AS licencas_total,
  (SELECT count(*) FROM public.licencas l WHERE l.revendedor_id = rv.id AND l.status='ativa') AS licencas_ativas,
  (SELECT COALESCE(SUM(valor),0) FROM public.payment_transactions pt
    WHERE pt.revendedor_id = rv.id AND pt.status='aprovado') AS receita_total,
  (SELECT COALESCE(SUM(valor),0) FROM public.payment_transactions pt
    WHERE pt.revendedor_id = rv.id AND pt.status='aprovado' AND pt.created_at >= date_trunc('month', now())) AS receita_mes,
  (SELECT count(*) FROM public.payment_transactions pt WHERE pt.revendedor_id = rv.id) AS pagamentos
FROM public.revendedores rv
WHERE public.has_role(auth.uid(),'admin') OR rv.id = public.current_revendedor_id();

GRANT SELECT ON public.v_revendedor_visao TO authenticated;

-- 11. Realtime -------------------------------------------------
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.licencas; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.creditos_movimentos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.licencas_eventos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.dispositivos; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
