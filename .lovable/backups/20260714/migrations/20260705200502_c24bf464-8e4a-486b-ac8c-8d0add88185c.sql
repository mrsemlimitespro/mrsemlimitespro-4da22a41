
-- =========================================================
-- 1. REVENDEDORES: identidade + saldo + bloqueio + plano
-- =========================================================
ALTER TABLE public.revendedores
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS saldo_creditos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plano_id uuid,
  ADD COLUMN IF NOT EXISTS plano_expira_em timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS revendedores_auth_user_id_key
  ON public.revendedores(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- =========================================================
-- 2. CLIENTES: vínculo com revendedor + campos de plano
-- =========================================================
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS revendedor_id uuid REFERENCES public.revendedores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS plano text,
  ADD COLUMN IF NOT EXISTS expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz;

CREATE INDEX IF NOT EXISTS clientes_revendedor_id_idx
  ON public.clientes(revendedor_id);

-- =========================================================
-- 3. LICENCAS: vínculo com revendedor
-- =========================================================
ALTER TABLE public.licencas
  ADD COLUMN IF NOT EXISTS revendedor_id uuid REFERENCES public.revendedores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS licencas_revendedor_id_idx
  ON public.licencas(revendedor_id);

-- =========================================================
-- 4. PAYMENT_TRANSACTIONS: extensão para revendedor / plano / pack
-- =========================================================
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS revendedor_id uuid REFERENCES public.revendedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plano_id uuid,
  ADD COLUMN IF NOT EXISTS pack_id uuid REFERENCES public.creditos_packs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creditos_liberados integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS payment_transactions_revendedor_id_idx
  ON public.payment_transactions(revendedor_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_payment_transactions_updated ON public.payment_transactions;
CREATE TRIGGER trg_payment_transactions_updated
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 5. PLANOS (Mensal / Anual)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('mensal','anual')),
  preco numeric(10,2) NOT NULL DEFAULT 0,
  creditos_incluidos integer NOT NULL DEFAULT 0,
  duracao_dias integer NOT NULL DEFAULT 30,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planos public read active" ON public.planos;
CREATE POLICY "planos public read active" ON public.planos
  FOR SELECT TO anon, authenticated
  USING (ativo OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "planos admin manage" ON public.planos;
CREATE POLICY "planos admin manage" ON public.planos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_planos_updated ON public.planos;
CREATE TRIGGER trg_planos_updated
  BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- FK atrasada: revendedores.plano_id → planos.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'revendedores_plano_id_fkey'
  ) THEN
    ALTER TABLE public.revendedores
      ADD CONSTRAINT revendedores_plano_id_fkey
      FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_transactions_plano_id_fkey'
  ) THEN
    ALTER TABLE public.payment_transactions
      ADD CONSTRAINT payment_transactions_plano_id_fkey
      FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =========================================================
-- 6. CREDITOS_MOVIMENTOS (extrato)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.creditos_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revendedor_id uuid NOT NULL REFERENCES public.revendedores(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  saldo_apos integer NOT NULL,
  motivo text NOT NULL,
  referencia_tipo text,
  referencia_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.creditos_movimentos TO authenticated;
GRANT ALL ON public.creditos_movimentos TO service_role;

ALTER TABLE public.creditos_movimentos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS creditos_mov_revendedor_idx
  ON public.creditos_movimentos(revendedor_id, created_at DESC);

-- =========================================================
-- 7. ACCESS LOGS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  revendedor_id uuid REFERENCES public.revendedores(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  event text NOT NULL,
  ip text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.access_logs TO authenticated;
GRANT ALL ON public.access_logs TO service_role;

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS access_logs_created_idx
  ON public.access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS access_logs_revendedor_idx
  ON public.access_logs(revendedor_id, created_at DESC);

-- =========================================================
-- 8. Helper functions
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_revendedor_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.revendedores WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_revendedor(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.revendedores WHERE auth_user_id = _uid AND NOT bloqueado);
$$;

GRANT EXECUTE ON FUNCTION public.current_revendedor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_revendedor(uuid) TO authenticated;

-- =========================================================
-- 9. Policies para o revendedor
-- =========================================================

-- revendedores: cada revendedor lê/edita o próprio; admin já tem acesso total
DROP POLICY IF EXISTS "revendedor read own" ON public.revendedores;
CREATE POLICY "revendedor read own" ON public.revendedores
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "revendedor update own" ON public.revendedores;
CREATE POLICY "revendedor update own" ON public.revendedores
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() AND NOT bloqueado)
  WITH CHECK (auth_user_id = auth.uid());

-- clientes: revendedor gerencia os próprios
DROP POLICY IF EXISTS "revendedor manage own clientes" ON public.clientes;
CREATE POLICY "revendedor manage own clientes" ON public.clientes
  FOR ALL TO authenticated
  USING (revendedor_id = public.current_revendedor_id())
  WITH CHECK (revendedor_id = public.current_revendedor_id());

-- licencas: revendedor lê as próprias
DROP POLICY IF EXISTS "revendedor read own licencas" ON public.licencas;
CREATE POLICY "revendedor read own licencas" ON public.licencas
  FOR SELECT TO authenticated
  USING (revendedor_id = public.current_revendedor_id());

-- creditos_movimentos
DROP POLICY IF EXISTS "admin read all movimentos" ON public.creditos_movimentos;
CREATE POLICY "admin read all movimentos" ON public.creditos_movimentos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "revendedor read own movimentos" ON public.creditos_movimentos;
CREATE POLICY "revendedor read own movimentos" ON public.creditos_movimentos
  FOR SELECT TO authenticated
  USING (revendedor_id = public.current_revendedor_id());

-- payment_transactions: revendedor lê as próprias (admin já tem policy)
DROP POLICY IF EXISTS "revendedor read own transactions" ON public.payment_transactions;
CREATE POLICY "revendedor read own transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (revendedor_id = public.current_revendedor_id());

-- access_logs
DROP POLICY IF EXISTS "admin read all access_logs" ON public.access_logs;
CREATE POLICY "admin read all access_logs" ON public.access_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "revendedor read own access_logs" ON public.access_logs;
CREATE POLICY "revendedor read own access_logs" ON public.access_logs
  FOR SELECT TO authenticated
  USING (revendedor_id = public.current_revendedor_id());

DROP POLICY IF EXISTS "any authenticated inserts own log" ON public.access_logs;
CREATE POLICY "any authenticated inserts own log" ON public.access_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid()
           OR revendedor_id = public.current_revendedor_id()
           OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- =========================================================
-- 10. Créditos: entrada/saída
-- =========================================================
CREATE OR REPLACE FUNCTION public.add_credits(
  _revendedor_id uuid,
  _delta integer,
  _motivo text,
  _ref_tipo text DEFAULT NULL,
  _ref_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.add_credits(uuid,integer,text,text,uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid,integer,text,text,uuid) TO service_role;

-- =========================================================
-- 11. Consumo automático de 1 crédito por cadastro de cliente
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_cliente_consume_credit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _r public.revendedores%ROWTYPE;
BEGIN
  IF NEW.revendedor_id IS NULL THEN
    NEW.revendedor_id := public.current_revendedor_id();
  END IF;

  -- Admin criando cliente “livre” sem revendedor: não desconta
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
  IF _r.saldo_creditos < 1 THEN
    RAISE EXCEPTION 'Créditos insuficientes. Compre mais créditos para cadastrar novos clientes.';
  END IF;

  PERFORM public.add_credits(NEW.revendedor_id, -1, 'consumo:cliente', 'cliente', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cliente_consume_credit ON public.clientes;
CREATE TRIGGER trg_cliente_consume_credit
  BEFORE INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.tg_cliente_consume_credit();

-- =========================================================
-- 12. Aprovação de pagamento libera créditos / plano
-- =========================================================
CREATE OR REPLACE FUNCTION public.approve_pagamento(_pagamento_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.approve_pagamento(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_pagamento(uuid) TO service_role;

-- Trigger: quando status vira 'aprovado' (por webhook / admin), libera automaticamente
CREATE OR REPLACE FUNCTION public.tg_pagamento_status()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovado'
     AND (OLD.status IS DISTINCT FROM 'aprovado')
     AND COALESCE(NEW.creditos_liberados, 0) = 0 THEN
    PERFORM public.approve_pagamento(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pagamento_status_after ON public.payment_transactions;
CREATE TRIGGER trg_pagamento_status_after
  AFTER UPDATE OF status ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_pagamento_status();

-- =========================================================
-- 13. RPC para o revendedor criar o próprio perfil após signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_revendedor_profile(
  _nome text DEFAULT NULL,
  _telefone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.create_revendedor_profile(text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_revendedor_profile(text,text) TO authenticated;
