
-- Gateways de pagamento
CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  api_key text,
  client_id text,
  client_secret text,
  webhook_url text,
  webhook_secret text,
  priority integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  last_test_at timestamptz,
  last_test_status text,
  last_test_message text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateways TO authenticated;
GRANT ALL ON public.payment_gateways TO service_role;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage gateways" ON public.payment_gateways FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Configuração global de métodos de pagamento (singleton)
CREATE TABLE public.payment_methods_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_gateway text,
  max_parcelas integer NOT NULL DEFAULT 12,
  juros_percent numeric(6,3) NOT NULL DEFAULT 0,
  desconto_pix_percent numeric(6,3) NOT NULL DEFAULT 0,
  mensagem_pix text,
  mensagem_boleto text,
  mensagem_cartao text,
  mensagem_aprovado text,
  mensagem_pendente text,
  mensagem_recusado text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods_config TO authenticated;
GRANT ALL ON public.payment_methods_config TO service_role;
ALTER TABLE public.payment_methods_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage methods config" ON public.payment_methods_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Logs de webhooks
CREATE TABLE public.payment_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_slug text NOT NULL,
  event_type text,
  status text NOT NULL DEFAULT 'received',
  payload jsonb,
  error text,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_webhook_logs TO authenticated;
GRANT ALL ON public.payment_webhook_logs TO service_role;
ALTER TABLE public.payment_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read webhook logs" ON public.payment_webhook_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Transações
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_slug text NOT NULL,
  external_id text,
  cliente_nome text,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  moeda text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pendente',
  metodo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage transactions" ON public.payment_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_payment_gateways_updated BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_payment_methods_config_updated BEFORE UPDATE ON public.payment_methods_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed dos 3 gateways
INSERT INTO public.payment_gateways (slug, nome, priority) VALUES
  ('kiwify','Kiwify', 1),
  ('mercadopago','Mercado Pago', 2),
  ('cakto','Cakto', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.payment_methods_config (id) VALUES (gen_random_uuid());
