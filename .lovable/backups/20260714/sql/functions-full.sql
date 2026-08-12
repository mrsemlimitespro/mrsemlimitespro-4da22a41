CREATE OR REPLACE FUNCTION public.notificar_licencas_expirando()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _count integer := 0;
  _r record;
  _dias integer;
  _tag text;
BEGIN
  FOR _r IN
    SELECT l.id, l.revendedor_id, l.chave, l.expira_em, l.cliente_id
      FROM public.licencas l
     WHERE l.status = 'ativa'
       AND l.expira_em IS NOT NULL
       AND l.revendedor_id IS NOT NULL
       AND (
            (l.expira_em::date - now()::date) = 7
         OR (l.expira_em::date - now()::date) = 1
       )
  LOOP
    _dias := (_r.expira_em::date - now()::date);
    _tag := 'expira_' || _dias || 'd_' || _r.id::text;

    -- evita duplicar: só cria se não existir notificação com essa tag nas últimas 24h
    IF NOT EXISTS (
      SELECT 1 FROM public.notificacoes n
       WHERE n.revendedor_id = _r.revendedor_id
         AND n.categoria = 'licenca'
         AND n.link = '/licencas'
         AND (n.metadata->>'tag') = _tag
         AND n.created_at > now() - interval '48 hours'
    ) THEN
      INSERT INTO public.notificacoes(
        titulo, mensagem, tipo, destino, categoria,
        revendedor_id, link, metadata
      ) VALUES (
        CASE WHEN _dias = 1 THEN 'Licença expira amanhã' ELSE 'Licença expira em 7 dias' END,
        format('A licença %s expira em %s dia(s).', _r.chave, _dias),
        'aviso',
        'revendedor',
        'licenca',
        _r.revendedor_id,
        '/licencas',
        jsonb_build_object('tag', _tag, 'licenca_id', _r.id, 'dias', _dias)
      );
      _count := _count + 1;
    END IF;
  END LOOP;

  RETURN _count;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.approve_pagamento(_pagamento_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _p public.payment_transactions%ROWTYPE;
  _qtd integer := 0;
  _plano public.planos%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.payment_transactions WHERE id = _pagamento_id FOR UPDATE;
  IF _p.id IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado.';
  END IF;
  IF _p.status = 'aprovado' AND _p.creditos_liberados > 0 THEN
    RETURN;
  END IF;

  IF _p.pack_id IS NOT NULL THEN
    SELECT quantidade INTO _qtd FROM public.creditos_packs WHERE id = _p.pack_id;
  ELSIF _p.plano_id IS NOT NULL THEN
    SELECT * INTO _plano FROM public.planos WHERE id = _p.plano_id;
    _qtd := COALESCE(_plano.creditos_incluidos, 0);
    IF _p.revendedor_id IS NOT NULL THEN
      UPDATE public.revendedores
         SET plano_id = _plano.id,
             plano_expira_em = GREATEST(COALESCE(plano_expira_em, now()), now())
                             + make_interval(days => _plano.duracao_dias)
       WHERE id = _p.revendedor_id;
    END IF;
  END IF;

  IF _qtd > 0 AND _p.revendedor_id IS NOT NULL THEN
    PERFORM public.add_credits(_p.revendedor_id, _qtd, 'pagamento:aprovado', 'pagamento', _p.id);
  END IF;

  UPDATE public.payment_transactions
     SET status = 'aprovado',
         aprovado_em = COALESCE(aprovado_em, now()),
         creditos_liberados = COALESCE(_qtd, 0)
   WHERE id = _p.id;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_cliente_consume_credit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _r public.revendedores%ROWTYPE;
BEGIN
  IF NEW.revendedor_id IS NULL THEN
    NEW.revendedor_id := public.current_revendedor_id();
  END IF;

  IF NEW.revendedor_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _r FROM public.revendedores WHERE id = NEW.revendedor_id FOR UPDATE;

  IF _r.id IS NULL THEN
    RAISE EXCEPTION 'Revendedor inválido.';
  END IF;
  IF _r.bloqueado THEN
    RAISE EXCEPTION 'Revendedor bloqueado.';
  END IF;
  IF _r.plano_expira_em IS NOT NULL AND _r.plano_expira_em < now() THEN
    RAISE EXCEPTION 'Plano vencido. Renove para cadastrar novos clientes.';
  END IF;
  IF _r.saldo_creditos < 1 THEN
    RAISE EXCEPTION 'Créditos insuficientes. Compre mais créditos para cadastrar novos clientes.';
  END IF;

  PERFORM public.add_credits(NEW.revendedor_id, -1, 'consumo:cliente', 'cliente', NEW.id);
  RETURN NEW;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_pagamento_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END;$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.resetar_device_licenca(_licenca_id uuid)
 RETURNS licencas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.pack_client_has_access(_pack_id uuid, _email text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.set_admin_password(_new_password text, _current_password text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _hash text;
BEGIN
  IF length(coalesce(_new_password,'')) < 4 THEN
    RAISE EXCEPTION 'Senha muito curta';
  END IF;

  INSERT INTO public.admin_settings (singleton)
  VALUES (true)
  ON CONFLICT (singleton) DO NOTHING;

  SELECT password_hash INTO _hash
  FROM public.admin_settings
  WHERE singleton = true
  LIMIT 1;

  IF _hash IS NOT NULL AND _hash <> '' THEN
    IF _current_password IS NULL OR extensions.crypt(_current_password, _hash) <> _hash THEN
      RAISE EXCEPTION 'Senha atual incorreta';
    END IF;
  END IF;

  UPDATE public.admin_settings
     SET password_hash = extensions.crypt(_new_password, extensions.gen_salt('bf', 10))
   WHERE singleton = true;

  RETURN true;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.create_revendedor_profile(_nome text DEFAULT NULL::text, _telefone text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.revendedores (auth_user_id, nome, email, telefone, saldo_creditos, status)
  VALUES (
    auth.uid(),
    COALESCE(NULLIF(_nome,''), split_part(_email,'@',1)),
    _email,
    _telefone,
    0,
    'ativo'
  )
  ON CONFLICT (auth_user_id) DO UPDATE
    SET nome = COALESCE(NULLIF(EXCLUDED.nome,''), public.revendedores.nome),
        telefone = COALESCE(EXCLUDED.telefone, public.revendedores.telefone),
        email = COALESCE(EXCLUDED.email, public.revendedores.email)
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.renovar_licenca(_licenca_id uuid, _dias integer)
 RETURNS licencas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.reativar_licenca(_licenca_id uuid)
 RETURNS licencas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.expirar_licencas_vencidas()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END;$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.verify_admin_password(_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _hash text;
BEGIN
  SELECT password_hash INTO _hash FROM public.admin_settings LIMIT 1;
  IF _hash IS NULL OR _hash = '' THEN
    RETURN false;
  END IF;
  RETURN extensions.crypt(_password, _hash) = _hash;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.current_revendedor_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.revendedores WHERE auth_user_id = auth.uid() LIMIT 1;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.is_revendedor(_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS(SELECT 1 FROM public.revendedores WHERE auth_user_id = _uid AND NOT bloqueado);
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.admin_password_configured()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _hash text;
BEGIN
  SELECT password_hash INTO _hash
  FROM public.admin_settings
  WHERE singleton = true
  LIMIT 1;

  RETURN _hash IS NOT NULL AND _hash <> '';
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_licenca_tipo_transicao()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Ao converter para premium, limpar campos de teste e destravar validade
  IF NEW.tipo = 'premium' AND (OLD.tipo IS DISTINCT FROM 'premium') THEN
    NEW.trial_iniciado_em := NULL;
    NEW.trial_duracao_minutos := NULL;
    NEW.expira_em := NULL;
    IF NEW.status = 'expirada' THEN NEW.status := 'ativa'; END IF;
  END IF;

  -- Ao criar/mudar para teste, garantir max_dispositivos padrão 1 e limpar trial anterior se troca de licenca
  IF NEW.tipo = 'teste' AND (OLD.tipo IS DISTINCT FROM 'teste') THEN
    NEW.trial_iniciado_em := NULL; -- será gravado na primeira validação
  END IF;

  RETURN NEW;
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_pagamento_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'aprovado'
     AND (OLD.status IS DISTINCT FROM 'aprovado')
     AND COALESCE(NEW.creditos_liberados, 0) = 0 THEN
    PERFORM public.approve_pagamento(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.validar_licenca(_email text, _chave text, _device_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _lic public.licencas;
BEGIN
  SELECT * INTO _lic FROM public.licencas WHERE chave = _chave FOR UPDATE;

  IF _lic.id IS NULL
     OR _lic.status <> 'ativa'
     OR _lic.email IS NULL
     OR lower(_lic.email) <> lower(COALESCE(_email, ''))
     OR (_lic.expira_em IS NOT NULL AND _lic.expira_em < now()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Licença inválida ou expirada.');
  END IF;

  -- Um dispositivo por vez
  IF _device_id IS NOT NULL AND _device_id <> '' THEN
    IF _lic.device_id IS NULL THEN
      UPDATE public.licencas SET device_id = _device_id, ultimo_acesso = now() WHERE id = _lic.id;
    ELSIF _lic.device_id <> _device_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Licença inválida ou expirada.');
    ELSE
      UPDATE public.licencas SET ultimo_acesso = now() WHERE id = _lic.id;
    END IF;
  ELSE
    UPDATE public.licencas SET ultimo_acesso = now() WHERE id = _lic.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'expira_em', _lic.expira_em,
    'cliente_id', _lic.cliente_id
  );
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.expirar_trials_vencidos()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.gerar_chave_licenca()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _out text := '';
  _i int;
  _j int;
BEGIN
  FOR _j IN 1..4 LOOP
    FOR _i IN 1..5 LOOP
      _out := _out || substr(_chars, 1 + floor(random() * length(_chars))::int, 1);
    END LOOP;
    IF _j < 4 THEN _out := _out || '-'; END IF;
  END LOOP;
  RETURN _out;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.gerar_licencas(_quantidade integer, _duracao_dias integer DEFAULT 30, _revendedor_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF licencas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _rev uuid;
  _i integer;
  _chave text;
  _row public.licencas;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    _rev := _revendedor_id;
  ELSE
    _rev := public.current_revendedor_id();
    IF _rev IS NULL THEN
      RAISE EXCEPTION 'Revendedor inválido.';
    END IF;
  END IF;

  IF _quantidade IS NULL OR _quantidade < 1 OR _quantidade > 500 THEN
    RAISE EXCEPTION 'Quantidade inválida.';
  END IF;

  FOR _i IN 1.._quantidade LOOP
    LOOP
      _chave := public.gerar_chave_licenca();
      EXIT WHEN NOT EXISTS(SELECT 1 FROM public.licencas WHERE chave = _chave);
    END LOOP;

    INSERT INTO public.licencas(chave, revendedor_id, status, duracao_dias)
    VALUES (_chave, _rev, 'ativa', COALESCE(_duracao_dias, 30))
    RETURNING * INTO _row;

    RETURN NEXT _row;
  END LOOP;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.criar_notificacao(_titulo text, _mensagem text, _categoria text DEFAULT 'geral'::text, _tipo text DEFAULT 'info'::text, _revendedor_id uuid DEFAULT NULL::uuid, _user_id uuid DEFAULT NULL::uuid, _link text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END;$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.authorize_pack_download(_pack_id uuid, _email text, _ip text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.add_credits(_revendedor_id uuid, _delta integer, _motivo text, _ref_tipo text DEFAULT NULL::text, _ref_id uuid DEFAULT NULL::uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _novo_saldo integer;
BEGIN
  UPDATE public.revendedores
     SET saldo_creditos = saldo_creditos + _delta
   WHERE id = _revendedor_id
   RETURNING saldo_creditos INTO _novo_saldo;

  IF _novo_saldo IS NULL THEN
    RAISE EXCEPTION 'Revendedor não encontrado (%).', _revendedor_id;
  END IF;
  IF _novo_saldo < 0 THEN
    RAISE EXCEPTION 'Créditos insuficientes.';
  END IF;

  INSERT INTO public.creditos_movimentos(
    revendedor_id, delta, saldo_apos, motivo, referencia_tipo, referencia_id
  ) VALUES (
    _revendedor_id, _delta, _novo_saldo, _motivo, _ref_tipo, _ref_id
  );

  RETURN _novo_saldo;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.consulta_licenca_publica(_chave text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.heartbeat_licenca(_chave text, _device_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.atribuir_licenca_cliente(_chave text, _cliente_id uuid, _email text)
 RETURNS licencas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _lic public.licencas;
  _cli public.clientes;
  _is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  _is_admin := public.has_role(auth.uid(), 'admin');

  SELECT * INTO _lic FROM public.licencas WHERE chave = _chave FOR UPDATE;
  IF _lic.id IS NULL THEN
    RAISE EXCEPTION 'Chave de licença não encontrada.';
  END IF;
  IF _lic.cliente_id IS NOT NULL AND _lic.cliente_id <> _cliente_id THEN
    RAISE EXCEPTION 'Esta chave já pertence a outro cliente.';
  END IF;

  SELECT * INTO _cli FROM public.clientes WHERE id = _cliente_id;
  IF _cli.id IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado.';
  END IF;

  IF NOT _is_admin
     AND _lic.revendedor_id IS DISTINCT FROM public.current_revendedor_id() THEN
    RAISE EXCEPTION 'Sem permissão para esta licença.';
  END IF;

  -- Limite antiabuso: 1 licença de teste por email de cliente em todo o sistema.
  -- Admins podem sobrescrever.
  IF _lic.tipo = 'teste' AND NOT _is_admin THEN
    IF EXISTS (
      SELECT 1 FROM public.licencas
       WHERE tipo = 'teste'
         AND id <> _lic.id
         AND lower(email) = lower(_email)
    ) THEN
      RAISE EXCEPTION 'Este email já usou o teste grátis. Solicite uma licença Premium ao administrador.';
    END IF;
  END IF;

  UPDATE public.licencas
     SET cliente_id = _cliente_id,
         email = lower(_email),
         revendedor_id = COALESCE(revendedor_id, _cli.revendedor_id),
         status = 'ativa'
   WHERE id = _lic.id
   RETURNING * INTO _lic;

  RETURN _lic;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.ensure_admin_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IS NOT NULL AND lower(NEW.email) IN ('rogeriocftv.mr@gmail.com','mariocftv@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_auth_user_to_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.log_audit(_acao text, _entidade text, _entidade_id uuid, _antes jsonb DEFAULT NULL::jsonb, _depois jsonb DEFAULT NULL::jsonb, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.limpar_logs_antigos()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_pagamento_gerar_licenca()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.converter_licenca_em_premium(_licenca_id uuid)
 RETURNS licencas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.cancelar_licenca(_licenca_id uuid, _motivo text DEFAULT NULL::text)
 RETURNS licencas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.revendedor_dashboard()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_licenca_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_pagamento_email_compra()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_pagamento_provisionar_painel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS DISTINCT FROM 'aprovado') THEN
    PERFORM public.provisionar_revendedor_por_pagamento(NEW.id);
  END IF;
  RETURN NEW;
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.reenviar_licenca(_licenca_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.provisionar_revendedor_por_pagamento(_payment_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.enfileirar_email(_template_chave text, _destinatario text, _variables jsonb DEFAULT '{}'::jsonb, _licenca_id uuid DEFAULT NULL::uuid, _cliente_id uuid DEFAULT NULL::uuid, _revendedor_id uuid DEFAULT NULL::uuid, _destinatario_nome text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END; $function$


-- ────────────────

CREATE OR REPLACE FUNCTION public.tg_licencas_evento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END;$function$

