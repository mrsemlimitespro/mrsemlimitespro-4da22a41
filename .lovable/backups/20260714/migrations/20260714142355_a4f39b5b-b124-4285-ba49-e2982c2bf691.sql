
-- ============================================================
-- FASE 3 — Automação: schema + funções (idempotente)
-- ============================================================

-- 1) Colunas novas (nullable — não quebram nada existente) ---------------

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_email text,
  ADD COLUMN IF NOT EXISTS comissao_valor numeric(12,2);

CREATE INDEX IF NOT EXISTS payment_transactions_cliente_idx
  ON public.payment_transactions(cliente_id);

ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.licenca_produtos(id) ON DELETE SET NULL;

ALTER TABLE public.revendedores
  ADD COLUMN IF NOT EXISTS comissao_percentual numeric(5,2);

-- 2) Helper de auditoria (único ponto de gravação) -----------------------

CREATE OR REPLACE FUNCTION public.log_audit(
  _acao text,
  _entidade text,
  _entidade_id uuid,
  _antes jsonb DEFAULT NULL,
  _depois jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _papel text;
BEGIN
  SELECT u.email INTO _email FROM auth.users u WHERE u.id = auth.uid();
  IF public.has_role(auth.uid(),'admin') THEN _papel := 'admin';
  ELSIF public.is_revendedor(auth.uid()) THEN _papel := 'revendedor';
  ELSE _papel := 'cliente';
  END IF;

  INSERT INTO public.audit_logs(
    ator_user_id, ator_email, ator_papel,
    acao, entidade, entidade_id,
    dados_antes, dados_depois, metadata
  ) VALUES (
    auth.uid(), _email, _papel,
    _acao, _entidade, _entidade_id,
    _antes, _depois, COALESCE(_metadata,'{}'::jsonb)
  );
EXCEPTION WHEN OTHERS THEN
  -- auditoria nunca deve derrubar a operação principal
  NULL;
END;
$$;

-- 3) Fluxo automático de compra aprovada ---------------------------------
--    Substitui a versão anterior de tg_pagamento_gerar_licenca.

CREATE OR REPLACE FUNCTION public.tg_pagamento_gerar_licenca()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plano   public.planos%ROWTYPE;
  _lic     public.licencas%ROWTYPE;
  _cliente public.clientes%ROWTYPE;
  _dias    integer;
  _email   text;
  _nome    text;
BEGIN
  IF NEW.status <> 'aprovado' OR (OLD.status IS NOT NULL AND OLD.status = 'aprovado') THEN
    RETURN NEW;
  END IF;
  IF NEW.plano_id IS NULL OR NEW.revendedor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- evita duplicar
  IF EXISTS (
    SELECT 1 FROM public.licencas
     WHERE metadata ? 'payment_id'
       AND metadata->>'payment_id' = NEW.id::text
  ) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _plano FROM public.planos WHERE id = NEW.plano_id;
  _dias := COALESCE(_plano.duracao_dias, 30);

  _email := lower(NULLIF(NEW.cliente_email,''));
  _nome  := COALESCE(NULLIF(NEW.cliente_nome,''), split_part(COALESCE(_email,''),'@',1));

  -- localizar/criar cliente (por email; se não tiver email, pula vínculo)
  IF _email IS NOT NULL THEN
    SELECT * INTO _cliente
      FROM public.clientes
     WHERE lower(email) = _email
     LIMIT 1;

    IF _cliente.id IS NULL THEN
      INSERT INTO public.clientes(nome, email, status, revendedor_id)
      VALUES (_nome, _email, 'ativo', NEW.revendedor_id)
      ON CONFLICT DO NOTHING
      RETURNING * INTO _cliente;

      -- pode ter havido conflito silencioso — busca de novo
      IF _cliente.id IS NULL THEN
        SELECT * INTO _cliente FROM public.clientes WHERE lower(email)=_email LIMIT 1;
      END IF;
    END IF;

    -- preenche cliente_id no pagamento (facilita CRM sem depender de nome)
    IF _cliente.id IS NOT NULL AND NEW.cliente_id IS NULL THEN
      UPDATE public.payment_transactions
         SET cliente_id = _cliente.id
       WHERE id = NEW.id;
      NEW.cliente_id := _cliente.id;
    END IF;
  END IF;

  -- gerar licença já vinculada ao cliente e ao produto (quando houver)
  INSERT INTO public.licencas(
    chave, revendedor_id, cliente_id, email, produto_id,
    status, duracao_dias, tipo, plano,
    expira_em, ativada_em, metadata
  ) VALUES (
    public.gerar_chave_licenca(),
    NEW.revendedor_id,
    _cliente.id,
    _email,
    _plano.produto_id,
    'ativa',
    _dias,
    'premium',
    _plano.nome,
    CASE WHEN _dias > 0 THEN now() + make_interval(days => _dias) ELSE NULL END,
    now(),
    jsonb_build_object(
      'payment_id', NEW.id::text,
      'plano_id',   NEW.plano_id::text,
      'auto',       true
    )
  ) RETURNING * INTO _lic;

  -- notifica revendedor
  PERFORM public.criar_notificacao(
    'Nova venda',
    format('Pagamento aprovado — licença %s criada%s.',
           _lic.chave,
           CASE WHEN _cliente.id IS NOT NULL THEN ' para '||COALESCE(_cliente.nome,_email) ELSE '' END),
    'venda', 'sucesso',
    NEW.revendedor_id, NULL, '/licencas'
  );

  -- notifica cliente (via user_id se existir)
  IF _cliente.id IS NOT NULL THEN
    DECLARE _uid uuid;
    BEGIN
      SELECT id INTO _uid FROM auth.users WHERE lower(email) = _email LIMIT 1;
      IF _uid IS NOT NULL THEN
        PERFORM public.criar_notificacao(
          'Licença ativada',
          format('Sua licença %s foi ativada com sucesso.', _lic.chave),
          'licenca', 'sucesso',
          NULL, _uid, '/minha-conta'
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) RPCs de escrita passam a gravar auditoria ---------------------------

CREATE OR REPLACE FUNCTION public.cancelar_licenca(_licenca_id uuid, _motivo text DEFAULT NULL)
RETURNS public.licencas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _l public.licencas; _antes public.licencas;
BEGIN
  SELECT * INTO _antes FROM public.licencas WHERE id = _licenca_id;
  UPDATE public.licencas
     SET status = 'cancelada'
   WHERE id = _licenca_id
     AND (public.has_role(auth.uid(),'admin') OR revendedor_id = public.current_revendedor_id())
   RETURNING * INTO _l;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada.'; END IF;

  INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, ator_user_id, metadata)
  VALUES (_l.id, 'cancelada', COALESCE(_motivo,'Cancelada'), auth.uid(), jsonb_build_object('motivo',_motivo));

  PERFORM public.log_audit('cancelar','licenca',_l.id,
    to_jsonb(_antes), to_jsonb(_l), jsonb_build_object('motivo',_motivo));

  RETURN _l;
END; $$;

CREATE OR REPLACE FUNCTION public.reativar_licenca(_licenca_id uuid)
RETURNS public.licencas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _l public.licencas; _antes public.licencas;
BEGIN
  SELECT * INTO _antes FROM public.licencas WHERE id = _licenca_id;
  UPDATE public.licencas
     SET status = 'ativa'
   WHERE id = _licenca_id
     AND (public.has_role(auth.uid(),'admin') OR revendedor_id = public.current_revendedor_id())
   RETURNING * INTO _l;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada.'; END IF;
  PERFORM public.log_audit('reativar','licenca',_l.id, to_jsonb(_antes), to_jsonb(_l));
  RETURN _l;
END; $$;

CREATE OR REPLACE FUNCTION public.renovar_licenca(_licenca_id uuid, _dias integer)
RETURNS public.licencas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _l public.licencas; _antes public.licencas;
BEGIN
  IF _dias IS NULL OR _dias < 1 THEN RAISE EXCEPTION 'Dias inválido'; END IF;
  SELECT * INTO _antes FROM public.licencas WHERE id = _licenca_id;
  UPDATE public.licencas
     SET expira_em = GREATEST(COALESCE(expira_em, now()), now()) + make_interval(days => _dias),
         status = 'ativa'
   WHERE id = _licenca_id
     AND (public.has_role(auth.uid(),'admin') OR revendedor_id = public.current_revendedor_id())
   RETURNING * INTO _l;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada ou sem permissão.'; END IF;
  PERFORM public.log_audit('renovar','licenca',_l.id,
    to_jsonb(_antes), to_jsonb(_l), jsonb_build_object('dias',_dias));
  RETURN _l;
END; $$;

CREATE OR REPLACE FUNCTION public.resetar_device_licenca(_licenca_id uuid)
RETURNS public.licencas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _lic public.licencas; _antes public.licencas;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  SELECT * INTO _antes FROM public.licencas WHERE id = _licenca_id;
  UPDATE public.licencas
     SET device_id = NULL, ultimo_acesso = NULL
   WHERE id = _licenca_id
   RETURNING * INTO _lic;
  IF _lic.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada.'; END IF;
  PERFORM public.log_audit('reset_device','licenca',_lic.id, to_jsonb(_antes), to_jsonb(_lic));
  RETURN _lic;
END; $$;

CREATE OR REPLACE FUNCTION public.converter_licenca_em_premium(_licenca_id uuid)
RETURNS public.licencas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _l public.licencas; _antes public.licencas;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  SELECT * INTO _antes FROM public.licencas WHERE id = _licenca_id;
  UPDATE public.licencas
     SET tipo = 'premium', status = 'ativa',
         trial_iniciado_em = NULL, trial_duracao_minutos = NULL, expira_em = NULL
   WHERE id = _licenca_id
   RETURNING * INTO _l;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada.'; END IF;
  INSERT INTO public.licencas_eventos(licenca_id, tipo, mensagem, cliente_id, ator_user_id)
  VALUES (_l.id, 'reativada', 'Convertida em Premium', _l.cliente_id, auth.uid());
  PERFORM public.log_audit('converter_premium','licenca',_l.id, to_jsonb(_antes), to_jsonb(_l));
  RETURN _l;
END; $$;

-- 5) Job de limpeza (função — o schedule é feito depois via cron) --------

CREATE OR REPLACE FUNCTION public.limpar_logs_antigos()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n_webhooks int := 0; _n_acessos int := 0;
BEGIN
  WITH d AS (
    DELETE FROM public.payment_webhook_logs
     WHERE created_at < now() - interval '90 days'
    RETURNING 1
  ) SELECT count(*) INTO _n_webhooks FROM d;

  WITH d AS (
    DELETE FROM public.licencas_eventos
     WHERE tipo = 'acesso'
       AND created_at < now() - interval '60 days'
    RETURNING 1
  ) SELECT count(*) INTO _n_acessos FROM d;

  RETURN jsonb_build_object('webhooks',_n_webhooks,'acessos',_n_acessos);
END; $$;
