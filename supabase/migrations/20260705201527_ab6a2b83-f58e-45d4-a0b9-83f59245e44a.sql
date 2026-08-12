-- 1) Bloquear cadastro de clientes quando plano vencido
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
$function$;

-- 2) Permitir que revendedor crie seus próprios pagamentos (pendentes)
DROP POLICY IF EXISTS "revendedor create own transaction" ON public.payment_transactions;
CREATE POLICY "revendedor create own transaction"
ON public.payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  revendedor_id = public.current_revendedor_id()
  AND status IN ('pendente','aguardando')
  AND COALESCE(creditos_liberados, 0) = 0
);