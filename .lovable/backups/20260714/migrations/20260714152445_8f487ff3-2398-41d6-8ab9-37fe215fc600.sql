
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS painel_revendedor_plano_id uuid REFERENCES public.planos(id);

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
  IF _cfg.painel_revendedor_plano_id IS NULL OR _p.plano_id IS DISTINCT FROM _cfg.painel_revendedor_plano_id THEN
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
