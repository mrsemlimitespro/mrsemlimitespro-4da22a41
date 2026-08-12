
-- =====================================================================
-- FASE 4 — Comunicação + Comissões
-- =====================================================================

-- ---------- admin_settings: config de email ----------
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS email_remetente_nome text DEFAULT 'MR sem Limites',
  ADD COLUMN IF NOT EXISTS email_remetente_endereco text DEFAULT 'contato@mrsemlimites.com',
  ADD COLUMN IF NOT EXISTS email_link_suporte text DEFAULT 'https://mrsemlimites.lovable.app/suporte',
  ADD COLUMN IF NOT EXISTS email_link_download text DEFAULT 'https://mrsemlimites.lovable.app/baixar-extensao',
  ADD COLUMN IF NOT EXISTS email_link_manual text DEFAULT 'https://mrsemlimites.lovable.app/aulas',
  ADD COLUMN IF NOT EXISTS email_link_portal text DEFAULT 'https://mrsemlimites.lovable.app/minha-conta',
  ADD COLUMN IF NOT EXISTS email_provider text DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS comissao_padrao_percentual numeric(6,2) DEFAULT 30.00;

-- ---------- email_templates ----------
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  assunto text NOT NULL,
  html text NOT NULL,
  texto text,
  variaveis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_templates_read_authed" ON public.email_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "email_templates_admin_all" ON public.email_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- email_queue ----------
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_chave text,
  destinatario text NOT NULL,
  destinatario_nome text,
  assunto text NOT NULL,
  html text NOT NULL,
  texto text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending|sending|sent|failed
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  last_error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  provider_message_id text,
  cliente_id uuid,
  licenca_id uuid,
  revendedor_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_queue_admin_all" ON public.email_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "email_queue_revendedor_ver_seus" ON public.email_queue
  FOR SELECT TO authenticated
  USING (revendedor_id = public.current_revendedor_id());
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled
  ON public.email_queue(status, scheduled_for) WHERE status IN ('pending','sending');
CREATE TRIGGER trg_email_queue_updated_at
  BEFORE UPDATE ON public.email_queue
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- email_logs ----------
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES public.email_queue(id) ON DELETE CASCADE,
  evento text NOT NULL, -- queued|sending|sent|failed|bounced|opened|clicked|resent
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_logs TO authenticated;
GRANT ALL ON public.email_logs TO service_role;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_logs_admin_all" ON public.email_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_email_logs_queue ON public.email_logs(queue_id);

-- ---------- comissoes ----------
CREATE TABLE IF NOT EXISTS public.comissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revendedor_id uuid NOT NULL,
  payment_id uuid,
  licenca_id uuid,
  cliente_id uuid,
  valor_base numeric(12,2) NOT NULL DEFAULT 0,
  percentual numeric(6,2) NOT NULL DEFAULT 0,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente', -- pendente|pago|cancelado
  pago_em timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id)
);
GRANT SELECT ON public.comissoes TO authenticated;
GRANT ALL ON public.comissoes TO service_role;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comissoes_admin_all" ON public.comissoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "comissoes_revendedor_ver_suas" ON public.comissoes
  FOR SELECT TO authenticated
  USING (revendedor_id = public.current_revendedor_id());
CREATE INDEX IF NOT EXISTS idx_comissoes_revendedor ON public.comissoes(revendedor_id, status);
CREATE TRIGGER trg_comissoes_updated_at
  BEFORE UPDATE ON public.comissoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- Função utilitária: enfileirar email a partir de template
-- =====================================================================
CREATE OR REPLACE FUNCTION public.enfileirar_email(
  _template_chave text,
  _destinatario text,
  _variables jsonb DEFAULT '{}'::jsonb,
  _licenca_id uuid DEFAULT NULL,
  _cliente_id uuid DEFAULT NULL,
  _revendedor_id uuid DEFAULT NULL,
  _destinatario_nome text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tpl public.email_templates%ROWTYPE;
  _cfg public.admin_settings%ROWTYPE;
  _assunto text;
  _html text;
  _texto text;
  _vars jsonb;
  _id uuid;
  _k text;
  _v text;
BEGIN
  IF _destinatario IS NULL OR _destinatario = '' THEN RETURN NULL; END IF;

  SELECT * INTO _tpl FROM public.email_templates WHERE chave = _template_chave AND ativo LIMIT 1;
  IF _tpl.id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO _cfg FROM public.admin_settings LIMIT 1;

  -- variáveis globais + as passadas
  _vars := COALESCE(_variables,'{}'::jsonb)
        || jsonb_build_object(
             'link_suporte',  COALESCE(_cfg.email_link_suporte,''),
             'link_download', COALESCE(_cfg.email_link_download,''),
             'link_manual',   COALESCE(_cfg.email_link_manual,''),
             'link_portal',   COALESCE(_cfg.email_link_portal,''),
             'remetente',     COALESCE(_cfg.email_remetente_nome,'MR sem Limites')
           );

  _assunto := _tpl.assunto;
  _html    := _tpl.html;
  _texto   := COALESCE(_tpl.texto,'');

  -- substituição {{chave}}
  FOR _k, _v IN SELECT key, value::text FROM jsonb_each_text(_vars) LOOP
    _assunto := replace(_assunto, '{{'||_k||'}}', COALESCE(_v,''));
    _html    := replace(_html,    '{{'||_k||'}}', COALESCE(_v,''));
    _texto   := replace(_texto,   '{{'||_k||'}}', COALESCE(_v,''));
  END LOOP;

  INSERT INTO public.email_queue(
    template_chave, destinatario, destinatario_nome, assunto, html, texto,
    variables, licenca_id, cliente_id, revendedor_id
  ) VALUES (
    _template_chave, lower(_destinatario), _destinatario_nome, _assunto, _html, _texto,
    _vars, _licenca_id, _cliente_id, _revendedor_id
  ) RETURNING id INTO _id;

  INSERT INTO public.email_logs(queue_id, evento, detalhes)
  VALUES (_id, 'queued', jsonb_build_object('template', _template_chave));

  RETURN _id;
END; $$;

-- =====================================================================
-- Trigger em licencas: enfileira email conforme transição
-- =====================================================================
CREATE OR REPLACE FUNCTION public.tg_licenca_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cli public.clientes%ROWTYPE;
  _prod text;
  _tpl text;
  _dias int;
  _vars jsonb;
BEGIN
  IF NEW.cliente_id IS NULL AND NEW.email IS NULL THEN RETURN NEW; END IF;

  IF NEW.cliente_id IS NOT NULL THEN
    SELECT * INTO _cli FROM public.clientes WHERE id = NEW.cliente_id;
  END IF;

  SELECT nome INTO _prod FROM public.produtos WHERE id = NEW.produto_id;

  _dias := CASE WHEN NEW.expira_em IS NULL THEN NULL
                ELSE GREATEST(0, (NEW.expira_em::date - now()::date)) END;

  _vars := jsonb_build_object(
    'nome',      COALESCE(_cli.nome, split_part(COALESCE(NEW.email,''),'@',1)),
    'email',     COALESCE(NEW.email, _cli.email, ''),
    'produto',   COALESCE(_prod, COALESCE(NEW.plano,'Licença')),
    'licenca',   NEW.chave,
    'status',    NEW.status,
    'validade',  CASE WHEN NEW.expira_em IS NULL THEN 'Vitalícia'
                      ELSE to_char(NEW.expira_em,'DD/MM/YYYY') END,
    'dias_restantes', COALESCE(_dias::text,'—')
  );

  IF TG_OP = 'INSERT' THEN
    _tpl := 'licenca_criada';
  ELSIF TG_OP = 'UPDATE' THEN
    -- renovação
    IF NEW.expira_em IS DISTINCT FROM OLD.expira_em
       AND OLD.expira_em IS NOT NULL
       AND NEW.expira_em IS NOT NULL
       AND NEW.expira_em > OLD.expira_em THEN
      _tpl := 'licenca_renovada';
    -- conversão em premium
    ELSIF NEW.tipo = 'premium' AND OLD.tipo IS DISTINCT FROM 'premium' THEN
      _tpl := 'licenca_premium';
    -- reativação
    ELSIF NEW.status = 'ativa' AND OLD.status IN ('cancelada','revogada','expirada') THEN
      _tpl := 'licenca_reativada';
    -- movida (troca de cliente)
    ELSIF NEW.cliente_id IS DISTINCT FROM OLD.cliente_id AND NEW.cliente_id IS NOT NULL THEN
      _tpl := 'licenca_movida';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.enfileirar_email(
    _tpl,
    COALESCE(NEW.email, _cli.email),
    _vars,
    NEW.id,
    NEW.cliente_id,
    NEW.revendedor_id,
    _cli.nome
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_licenca_email ON public.licencas;
CREATE TRIGGER trg_licenca_email
  AFTER INSERT OR UPDATE ON public.licencas
  FOR EACH ROW EXECUTE FUNCTION public.tg_licenca_email();

-- =====================================================================
-- Trigger em payment_transactions: gera comissão + email de compra aprovada
-- =====================================================================
CREATE OR REPLACE FUNCTION public.tg_pagamento_comissao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pct numeric;
  _val numeric;
  _cfg public.admin_settings%ROWTYPE;
  _cli_nome text;
BEGIN
  IF NEW.status <> 'aprovado' THEN RETURN NEW; END IF;
  IF OLD.status IS NOT NULL AND OLD.status = 'aprovado' THEN RETURN NEW; END IF;

  IF NEW.revendedor_id IS NOT NULL AND NEW.valor IS NOT NULL AND NEW.valor > 0 THEN
    SELECT * INTO _cfg FROM public.admin_settings LIMIT 1;
    SELECT COALESCE(comissao_percentual, _cfg.comissao_padrao_percentual, 30)
      INTO _pct FROM public.revendedores WHERE id = NEW.revendedor_id;
    _val := round((NEW.valor * COALESCE(_pct,30) / 100.0)::numeric, 2);

    INSERT INTO public.comissoes(
      revendedor_id, payment_id, cliente_id, valor_base, percentual, valor, status
    ) VALUES (
      NEW.revendedor_id, NEW.id, NEW.cliente_id,
      NEW.valor, COALESCE(_pct,30), _val, 'pendente'
    ) ON CONFLICT (payment_id) DO NOTHING;

    UPDATE public.payment_transactions
       SET comissao_valor = _val
     WHERE id = NEW.id AND (comissao_valor IS NULL OR comissao_valor = 0);
  END IF;

  -- email "compra aprovada" — só se cliente_email presente
  IF NEW.cliente_email IS NOT NULL AND NEW.cliente_email <> '' THEN
    PERFORM public.enfileirar_email(
      'compra_aprovada',
      NEW.cliente_email,
      jsonb_build_object(
        'nome', COALESCE(NEW.cliente_nome, split_part(NEW.cliente_email,'@',1)),
        'valor', to_char(COALESCE(NEW.valor,0),'FM999G999D00'),
        'metodo', COALESCE(NEW.metodo,'—')
      ),
      NULL, NEW.cliente_id, NEW.revendedor_id, NEW.cliente_nome
    );
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_pagamento_comissao ON public.payment_transactions;
CREATE TRIGGER trg_pagamento_comissao
  AFTER INSERT OR UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_pagamento_comissao();

-- =====================================================================
-- RPC: reenviar licença
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reenviar_licenca(_licenca_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _l public.licencas%ROWTYPE;
  _cli public.clientes%ROWTYPE;
  _prod text;
  _dest text;
  _id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin')
          OR EXISTS (SELECT 1 FROM public.licencas WHERE id=_licenca_id AND revendedor_id=public.current_revendedor_id())) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  SELECT * INTO _l FROM public.licencas WHERE id = _licenca_id;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Licença não encontrada.'; END IF;

  IF _l.cliente_id IS NOT NULL THEN
    SELECT * INTO _cli FROM public.clientes WHERE id = _l.cliente_id;
  END IF;
  _dest := COALESCE(_l.email, _cli.email);
  IF _dest IS NULL OR _dest = '' THEN
    RAISE EXCEPTION 'Licença sem email de destino.';
  END IF;
  SELECT nome INTO _prod FROM public.produtos WHERE id = _l.produto_id;

  _id := public.enfileirar_email(
    'licenca_reenviada',
    _dest,
    jsonb_build_object(
      'nome',     COALESCE(_cli.nome, split_part(_dest,'@',1)),
      'email',    _dest,
      'produto',  COALESCE(_prod, COALESCE(_l.plano,'Licença')),
      'licenca',  _l.chave,
      'status',   _l.status,
      'validade', CASE WHEN _l.expira_em IS NULL THEN 'Vitalícia'
                       ELSE to_char(_l.expira_em,'DD/MM/YYYY') END,
      'dias_restantes',
        CASE WHEN _l.expira_em IS NULL THEN '—'
             ELSE GREATEST(0, (_l.expira_em::date - now()::date))::text END
    ),
    _l.id, _l.cliente_id, _l.revendedor_id, _cli.nome
  );

  PERFORM public.log_audit('reenviar_licenca','licenca',_l.id,NULL,NULL,
    jsonb_build_object('email',_dest,'queue_id',_id));

  RETURN _id;
END; $$;

-- =====================================================================
-- RPC: dashboard do revendedor
-- =====================================================================
CREATE OR REPLACE FUNCTION public.revendedor_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _rid uuid; _r jsonb;
BEGIN
  _rid := public.current_revendedor_id();
  IF _rid IS NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    RETURN jsonb_build_object('ok',false);
  END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'clientes',       (SELECT count(*) FROM public.clientes WHERE revendedor_id=_rid),
    'licencas_total', (SELECT count(*) FROM public.licencas WHERE revendedor_id=_rid),
    'licencas_ativas',(SELECT count(*) FROM public.licencas WHERE revendedor_id=_rid AND status='ativa'),
    'vendas_mes',     (SELECT count(*) FROM public.payment_transactions
                         WHERE revendedor_id=_rid AND status='aprovado'
                           AND aprovado_em >= date_trunc('month', now())),
    'receita_mes',    (SELECT COALESCE(sum(valor),0) FROM public.payment_transactions
                         WHERE revendedor_id=_rid AND status='aprovado'
                           AND aprovado_em >= date_trunc('month', now())),
    'receita_total',  (SELECT COALESCE(sum(valor),0) FROM public.payment_transactions
                         WHERE revendedor_id=_rid AND status='aprovado'),
    'comissao_pendente', (SELECT COALESCE(sum(valor),0) FROM public.comissoes
                            WHERE revendedor_id=_rid AND status='pendente'),
    'comissao_paga',     (SELECT COALESCE(sum(valor),0) FROM public.comissoes
                            WHERE revendedor_id=_rid AND status='pago'),
    'saldo_creditos', (SELECT saldo_creditos FROM public.revendedores WHERE id=_rid),
    'pendencias',     (SELECT count(*) FROM public.payment_transactions
                         WHERE revendedor_id=_rid AND status='pendente')
  ) INTO _r;
  RETURN _r;
END; $$;

-- =====================================================================
-- Seed dos 11 templates
-- =====================================================================
INSERT INTO public.email_templates(chave,nome,assunto,html,texto,variaveis) VALUES
('licenca_criada','Licença criada',
 'Sua licença {{produto}} está pronta 🎉',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,#151824,#0f1220);border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1 style="margin:0 0 8px;font-size:22px">Olá, {{nome}} 👋</h1><p>Sua licença foi ativada com sucesso.</p><div style="margin:18px 0;padding:16px;background:#0b0e19;border:1px solid #2a2f45;border-radius:12px"><p style="margin:0 0 6px;color:#9aa3b2;font-size:12px">CHAVE DA LICENÇA</p><p style="margin:0;font-family:ui-monospace,Menlo,monospace;font-size:20px;letter-spacing:2px">{{licenca}}</p></div><ul style="line-height:1.7"><li>Produto: <b>{{produto}}</b></li><li>Validade: <b>{{validade}}</b></li><li>Status: <b>{{status}}</b></li></ul><p><a href="{{link_download}}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:linear-gradient(90deg,#7c3aed,#3b82f6);color:#fff;text-decoration:none;font-weight:600">Baixar extensão</a></p><p style="color:#9aa3b2;font-size:13px">Manual: <a href="{{link_manual}}" style="color:#93c5fd">{{link_manual}}</a><br/>Suporte: <a href="{{link_suporte}}" style="color:#93c5fd">{{link_suporte}}</a><br/>Sua conta: <a href="{{link_portal}}" style="color:#93c5fd">{{link_portal}}</a></p></div></div>',
 'Olá {{nome}}! Sua licença {{produto}} foi ativada. Chave: {{licenca}}. Validade: {{validade}}. Download: {{link_download}} — Suporte: {{link_suporte}}',
 '["nome","produto","licenca","validade","status"]'),
('licenca_renovada','Licença renovada',
 'Licença {{produto}} renovada até {{validade}}',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1 style="margin:0 0 8px">Renovação confirmada ✅</h1><p>Olá {{nome}}, sua licença <b>{{licenca}}</b> foi renovada.</p><ul><li>Produto: {{produto}}</li><li>Nova validade: <b>{{validade}}</b></li><li>Dias restantes: {{dias_restantes}}</li></ul><p><a href="{{link_portal}}" style="color:#93c5fd">Ver na Minha Conta</a></p></div></div>',
 'Sua licença {{licenca}} foi renovada até {{validade}}.',
 '["nome","produto","licenca","validade","dias_restantes"]'),
('licenca_reenviada','Reenvio da sua licença',
 'Reenvio: licença {{produto}}',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Reenvio da sua licença</h1><p>Olá {{nome}}, aqui estão os dados atualizados.</p><div style="padding:16px;background:#0b0e19;border:1px solid #2a2f45;border-radius:12px;margin:16px 0"><p style="margin:0 0 6px;color:#9aa3b2;font-size:12px">CHAVE</p><p style="margin:0;font-family:ui-monospace,Menlo,monospace;font-size:20px;letter-spacing:2px">{{licenca}}</p></div><ul><li>Produto: {{produto}}</li><li>Validade: {{validade}}</li><li>Status: {{status}}</li></ul><p><a href="{{link_download}}" style="color:#93c5fd">Baixar extensão</a> · <a href="{{link_manual}}" style="color:#93c5fd">Manual</a> · <a href="{{link_suporte}}" style="color:#93c5fd">Suporte</a></p></div></div>',
 'Reenvio: {{licenca}} — {{produto}} — validade {{validade}}. Download: {{link_download}}',
 '["nome","produto","licenca","validade","status"]'),
('licenca_premium','Licença convertida em Premium',
 'Bem-vindo ao Premium 🌟',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Você agora é Premium 🌟</h1><p>Olá {{nome}}, sua licença <b>{{licenca}}</b> foi convertida em Premium — sem limites de tempo.</p><p><a href="{{link_portal}}" style="color:#93c5fd">Acessar sua conta</a></p></div></div>',
 'Sua licença {{licenca}} foi convertida em Premium.',
 '["nome","licenca"]'),
('licenca_reativada','Licença reativada',
 'Sua licença voltou a funcionar',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Licença reativada ✅</h1><p>Olá {{nome}}, sua licença <b>{{licenca}}</b> foi reativada. Validade: {{validade}}.</p></div></div>',
 'Licença {{licenca}} reativada.',
 '["nome","licenca","validade"]'),
('licenca_movida','Licença transferida',
 'Sua licença foi transferida',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Licença atribuída</h1><p>Olá {{nome}}, a licença <b>{{licenca}}</b> ({{produto}}) foi vinculada à sua conta.</p><p>Validade: {{validade}}. Acesse <a href="{{link_portal}}" style="color:#93c5fd">Minha Conta</a>.</p></div></div>',
 'Licença {{licenca}} atribuída a você.',
 '["nome","licenca","produto","validade"]'),
('compra_aprovada','Compra aprovada',
 'Recebemos seu pagamento ✅',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Pagamento aprovado 🎉</h1><p>Olá {{nome}}, recebemos seu pagamento de <b>R$ {{valor}}</b> ({{metodo}}). Em instantes sua licença será enviada.</p></div></div>',
 'Pagamento de R$ {{valor}} aprovado.',
 '["nome","valor","metodo"]'),
('pagamento_recusado','Pagamento recusado',
 'Não conseguimos aprovar seu pagamento',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Pagamento não aprovado</h1><p>Olá {{nome}}, seu pagamento de R$ {{valor}} não foi aprovado. Tente novamente ou fale com o suporte: <a href="{{link_suporte}}" style="color:#93c5fd">{{link_suporte}}</a>.</p></div></div>',
 'Pagamento de R$ {{valor}} recusado.',
 '["nome","valor"]'),
('expiracao_7d','Licença expira em 7 dias',
 'Sua licença expira em 7 dias ⏰',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Falta pouco ⏰</h1><p>Olá {{nome}}, sua licença <b>{{licenca}}</b> expira em <b>{{validade}}</b> (7 dias). Renove para não perder acesso.</p><p><a href="{{link_portal}}" style="color:#93c5fd">Renovar agora</a></p></div></div>',
 'Sua licença {{licenca}} expira em 7 dias ({{validade}}).',
 '["nome","licenca","validade"]'),
('expiracao_1d','Licença expira amanhã',
 'Última chance: sua licença expira amanhã',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:#151824;border:1px solid #2a2f45;border-radius:16px;padding:28px"><h1>Sua licença expira amanhã ⚠️</h1><p>Olá {{nome}}, a licença <b>{{licenca}}</b> vence em <b>{{validade}}</b>. Renove agora para manter o acesso.</p><p><a href="{{link_portal}}" style="color:#93c5fd">Renovar</a></p></div></div>',
 'Sua licença {{licenca}} expira amanhã.',
 '["nome","licenca","validade"]'),
('promocao','Promoção',
 '{{titulo}}',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0d12;color:#e6e8ee;padding:32px"><div style="max-width:560px;margin:0 auto;background:linear-gradient(180deg,#1c1230,#0f1220);border:1px solid #3a2a55;border-radius:16px;padding:28px"><h1>{{titulo}}</h1><p>{{mensagem}}</p><p><a href="{{cta_url}}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:linear-gradient(90deg,#ec4899,#f59e0b);color:#fff;text-decoration:none;font-weight:600">{{cta_texto}}</a></p></div></div>',
 '{{titulo}} — {{mensagem}} — {{cta_url}}',
 '["titulo","mensagem","cta_texto","cta_url"]')
ON CONFLICT (chave) DO NOTHING;
