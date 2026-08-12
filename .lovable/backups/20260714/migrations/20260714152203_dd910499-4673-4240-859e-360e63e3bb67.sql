
DROP TRIGGER IF EXISTS trg_pagamento_comissao ON public.payment_transactions;
DROP TRIGGER IF EXISTS tg_pagamento_comissao ON public.payment_transactions;

CREATE OR REPLACE FUNCTION public.tg_pagamento_email_compra()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status <> 'aprovado' THEN RETURN NEW; END IF;
  IF OLD.status IS NOT NULL AND OLD.status = 'aprovado' THEN RETURN NEW; END IF;
  IF NEW.cliente_email IS NOT NULL AND NEW.cliente_email <> '' THEN
    PERFORM public.enfileirar_email(
      'compra_aprovada', NEW.cliente_email,
      jsonb_build_object(
        'nome', COALESCE(NEW.cliente_nome, split_part(NEW.cliente_email,'@',1)),
        'valor', to_char(COALESCE(NEW.valor,0),'FM999G999D00'),
        'metodo', COALESCE(NEW.metodo,'—')),
      NULL, NEW.cliente_id, NEW.revendedor_id, NEW.cliente_nome);
  END IF;
  RETURN NEW;
END; $$;

DROP FUNCTION IF EXISTS public.tg_pagamento_comissao() CASCADE;

CREATE TRIGGER trg_pagamento_email_compra
AFTER UPDATE OF status ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.tg_pagamento_email_compra();

DROP TABLE IF EXISTS public.comissoes CASCADE;
ALTER TABLE public.payment_transactions DROP COLUMN IF EXISTS comissao_valor;
ALTER TABLE public.revendedores        DROP COLUMN IF EXISTS comissao_percentual;
ALTER TABLE public.admin_settings      DROP COLUMN IF EXISTS comissao_padrao_percentual;

CREATE OR REPLACE FUNCTION public.revendedor_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _rid uuid; _r jsonb;
BEGIN
  _rid := public.current_revendedor_id();
  IF _rid IS NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    RETURN jsonb_build_object('ok',false);
  END IF;
  SELECT jsonb_build_object(
    'ok', true,
    'clientes',        (SELECT count(*) FROM public.clientes  WHERE revendedor_id=_rid),
    'licencas_total',  (SELECT count(*) FROM public.licencas  WHERE revendedor_id=_rid),
    'licencas_ativas', (SELECT count(*) FROM public.licencas  WHERE revendedor_id=_rid AND status='ativa'),
    'licencas_teste',  (SELECT count(*) FROM public.licencas  WHERE revendedor_id=_rid AND tipo='teste'),
    'licencas_bloqueadas',(SELECT count(*) FROM public.licencas WHERE revendedor_id=_rid AND status IN ('bloqueada','cancelada','revogada')),
    'licencas_vencendo',(SELECT count(*) FROM public.licencas WHERE revendedor_id=_rid AND status='ativa'
                          AND expira_em IS NOT NULL AND expira_em <= now() + interval '7 days'),
    'vendas_mes',      (SELECT count(*) FROM public.payment_transactions
                          WHERE revendedor_id=_rid AND status='aprovado'
                            AND aprovado_em >= date_trunc('month', now())),
    'receita_mes',     (SELECT COALESCE(sum(valor),0) FROM public.payment_transactions
                          WHERE revendedor_id=_rid AND status='aprovado'
                            AND aprovado_em >= date_trunc('month', now())),
    'receita_total',   (SELECT COALESCE(sum(valor),0) FROM public.payment_transactions
                          WHERE revendedor_id=_rid AND status='aprovado'),
    'saldo_creditos',  (SELECT saldo_creditos FROM public.revendedores WHERE id=_rid),
    'pendencias',      (SELECT count(*) FROM public.payment_transactions
                          WHERE revendedor_id=_rid AND status='pendente')
  ) INTO _r;
  RETURN _r;
END; $$;

CREATE TABLE IF NOT EXISTS public.extensao_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid UNIQUE REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  imagem text,
  versao text DEFAULT '1.0.0',
  descricao text,
  dias_padrao integer DEFAULT 30,
  minutos_teste integer DEFAULT 30,
  dias_premium integer,
  dias_adicionais integer DEFAULT 0,
  dias_promocionais integer DEFAULT 0,
  msg_ativacao text,
  msg_expiracao text,
  msg_bloqueio text,
  msg_atualizacao text,
  link_manual text,
  link_download text,
  link_drive text,
  link_zip text,
  link_rar text,
  url_atualizacao text,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','oculta','manutencao')),
  ordem integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.extensao_configs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extensao_configs TO authenticated;
GRANT ALL ON public.extensao_configs TO service_role;

ALTER TABLE public.extensao_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "extensao_configs_public_read" ON public.extensao_configs;
CREATE POLICY "extensao_configs_public_read" ON public.extensao_configs FOR SELECT
  USING (status <> 'oculta' OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "extensao_configs_admin_write" ON public.extensao_configs;
CREATE POLICY "extensao_configs_admin_write" ON public.extensao_configs FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_extensao_configs_updated ON public.extensao_configs;
CREATE TRIGGER trg_extensao_configs_updated
BEFORE UPDATE ON public.extensao_configs
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS link_comunidade text;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS painel_revendedor_produto_id uuid REFERENCES public.produtos(id);
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS painel_revendedor_valor numeric(10,2) DEFAULT 29.90;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='revendedores_email_key') THEN
    UPDATE public.revendedores SET email = lower(email) WHERE email IS NOT NULL;
    CREATE UNIQUE INDEX revendedores_email_key ON public.revendedores (lower(email)) WHERE email IS NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.provisionar_revendedor_por_pagamento(_payment_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _p public.payment_transactions%ROWTYPE;
  _cfg public.admin_settings%ROWTYPE;
  _rev_id uuid; _uid uuid; _email text; _nome text;
BEGIN
  SELECT * INTO _p FROM public.payment_transactions WHERE id = _payment_id;
  IF _p.id IS NULL OR _p.status <> 'aprovado' THEN RETURN NULL; END IF;
  SELECT * INTO _cfg FROM public.admin_settings LIMIT 1;
  IF _cfg.painel_revendedor_produto_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.planos WHERE id = _p.plano_id AND produto_id = _cfg.painel_revendedor_produto_id) THEN
    RETURN NULL;
  END IF;
  _email := lower(NULLIF(_p.cliente_email,''));
  IF _email IS NULL THEN RETURN NULL; END IF;
  _nome  := COALESCE(NULLIF(_p.cliente_nome,''), split_part(_email,'@',1));
  SELECT id INTO _uid FROM auth.users WHERE lower(email)=_email LIMIT 1;

  SELECT id INTO _rev_id FROM public.revendedores WHERE lower(email)=_email LIMIT 1;
  IF _rev_id IS NULL THEN
    INSERT INTO public.revendedores(auth_user_id, nome, email, saldo_creditos, status)
    VALUES (_uid, _nome, _email, 0, 'ativo')
    RETURNING id INTO _rev_id;
  ELSE
    UPDATE public.revendedores
       SET auth_user_id = COALESCE(auth_user_id, _uid),
           nome = COALESCE(NULLIF(_nome,''), nome),
           status = 'ativo', bloqueado = false
     WHERE id = _rev_id;
  END IF;

  IF _uid IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_uid, 'revendedor'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  PERFORM public.enfileirar_email(
    'painel_revendedor_acesso', _email,
    jsonb_build_object(
      'nome', _nome,
      'valor', to_char(COALESCE(_p.valor,0),'FM999G999D00'),
      'link_painel', COALESCE(_cfg.email_link_portal,''),
      'link_comunidade', COALESCE(_cfg.link_comunidade,''),
      'magic_link', ''),
    NULL, _p.cliente_id, _rev_id, _nome);

  PERFORM public.log_audit('provisionar_revendedor','revendedor',_rev_id, NULL, NULL,
    jsonb_build_object('payment_id',_payment_id,'email',_email));
  RETURN _rev_id;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_pagamento_provisionar_painel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS DISTINCT FROM 'aprovado') THEN
    PERFORM public.provisionar_revendedor_por_pagamento(NEW.id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_pagamento_provisionar_painel ON public.payment_transactions;
CREATE TRIGGER trg_pagamento_provisionar_painel
AFTER UPDATE OF status ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.tg_pagamento_provisionar_painel();

INSERT INTO public.email_templates (chave, nome, assunto, html, texto, variaveis, ativo)
VALUES
('painel_revendedor_acesso',
 'Painel Revendedor — Acesso',
 'Bem-vindo(a) ao Painel Revendedor MR Lova',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0b12;color:#eaeaf0;padding:24px;border-radius:16px">'
 '<h2 style="margin:0 0 12px">Olá, {{nome}}!</h2>'
 '<p>Sua compra do <strong>Painel Revendedor</strong> foi confirmada (R$ {{valor}}).</p>'
 '<p>Acesse seu painel: <a href="{{link_painel}}" style="color:#a78bfa">{{link_painel}}</a></p>'
 '<p>Entre na comunidade: <a href="{{link_comunidade}}" style="color:#a78bfa">{{link_comunidade}}</a></p>'
 '<p style="opacity:.7;font-size:12px">Se ainda não tem conta, use o email desta compra para acessar. Suporte: {{link_suporte}}</p>'
 '</div>',
 'Olá {{nome}}, sua compra do Painel Revendedor foi confirmada (R$ {{valor}}). Painel: {{link_painel}}  Comunidade: {{link_comunidade}}  Suporte: {{link_suporte}}',
 '["nome","valor","link_painel","link_comunidade","magic_link","link_suporte"]'::jsonb,
 true),
('comunidade_acesso',
 'Comunidade — Acesso',
 'Seu acesso à comunidade MR Lova',
 '<div style="font-family:Inter,Arial,sans-serif;background:#0b0b12;color:#eaeaf0;padding:24px;border-radius:16px">'
 '<h2>Bem-vindo(a) à comunidade!</h2>'
 '<p>Entre pelo link: <a href="{{link_comunidade}}" style="color:#a78bfa">{{link_comunidade}}</a></p>'
 '</div>',
 'Entre na comunidade: {{link_comunidade}}',
 '["link_comunidade"]'::jsonb,
 true)
ON CONFLICT (chave) DO NOTHING;
