
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
$function$;
