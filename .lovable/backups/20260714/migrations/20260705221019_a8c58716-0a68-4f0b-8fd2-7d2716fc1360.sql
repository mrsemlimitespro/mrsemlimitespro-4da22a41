
-- 1. Ajustes na tabela licencas
ALTER TABLE public.licencas
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS ativada_em timestamptz,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz,
  ADD COLUMN IF NOT EXISTS duracao_dias integer NOT NULL DEFAULT 30;

CREATE INDEX IF NOT EXISTS licencas_email_idx ON public.licencas (lower(email));
CREATE INDEX IF NOT EXISTS licencas_cliente_idx ON public.licencas (cliente_id);

-- 2. Função para gerar chaves únicas
CREATE OR REPLACE FUNCTION public.gerar_chave_licenca()
RETURNS text
LANGUAGE plpgsql
AS $$
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
$$;

-- 3. Gerar lote de licenças no estoque do revendedor (ou admin)
CREATE OR REPLACE FUNCTION public.gerar_licencas(_quantidade integer, _duracao_dias integer DEFAULT 30, _revendedor_id uuid DEFAULT NULL)
RETURNS SETOF public.licencas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.gerar_licencas(integer, integer, uuid) TO authenticated;

-- 4. Atribuir licença existente a um cliente
CREATE OR REPLACE FUNCTION public.atribuir_licenca_cliente(_chave text, _cliente_id uuid, _email text)
RETURNS public.licencas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lic public.licencas;
  _cli public.clientes;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

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

  IF NOT public.has_role(auth.uid(), 'admin')
     AND _lic.revendedor_id IS DISTINCT FROM public.current_revendedor_id() THEN
    RAISE EXCEPTION 'Sem permissão para esta licença.';
  END IF;

  UPDATE public.licencas
     SET cliente_id = _cliente_id,
         email = lower(_email),
         revendedor_id = COALESCE(revendedor_id, _cli.revendedor_id),
         ativada_em = COALESCE(ativada_em, now()),
         expira_em = COALESCE(expira_em, now() + make_interval(days => COALESCE(duracao_dias, 30))),
         status = 'ativa'
   WHERE id = _lic.id
   RETURNING * INTO _lic;

  RETURN _lic;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atribuir_licenca_cliente(text, uuid, text) TO authenticated;

-- 5. Validação pública (chamada pelo app do cliente)
CREATE OR REPLACE FUNCTION public.validar_licenca(_email text, _chave text, _device_id text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.validar_licenca(text, text, text) TO anon, authenticated;

-- 6. Reset de device (admin)
CREATE OR REPLACE FUNCTION public.resetar_device_licenca(_licenca_id uuid)
RETURNS public.licencas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lic public.licencas;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  UPDATE public.licencas
     SET device_id = NULL, ultimo_acesso = NULL
   WHERE id = _licenca_id
   RETURNING * INTO _lic;

  IF _lic.id IS NULL THEN
    RAISE EXCEPTION 'Licença não encontrada.';
  END IF;

  RETURN _lic;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resetar_device_licenca(uuid) TO authenticated;
