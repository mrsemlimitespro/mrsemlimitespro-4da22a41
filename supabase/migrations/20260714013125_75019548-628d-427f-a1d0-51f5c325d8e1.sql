CREATE TABLE public.mensagens_campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  canal text NOT NULL DEFAULT 'whatsapp',
  filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
  destinatarios_previstos integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'rascunho',
  agendada_para timestamptz,
  enviada_em timestamptz,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revendedor_id uuid REFERENCES public.revendedores(id) ON DELETE SET NULL,
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  plano_status text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mensagens_campanhas_canal_chk CHECK (canal IN ('whatsapp','email','notificacao')),
  CONSTRAINT mensagens_campanhas_status_chk CHECK (status IN ('rascunho','pronta_para_envio','enviada','cancelada'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens_campanhas TO authenticated;
GRANT ALL ON public.mensagens_campanhas TO service_role;

ALTER TABLE public.mensagens_campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam campanhas"
  ON public.mensagens_campanhas
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_mensagens_campanhas_updated
  BEFORE UPDATE ON public.mensagens_campanhas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_mensagens_campanhas_status ON public.mensagens_campanhas(status);
CREATE INDEX idx_mensagens_campanhas_created ON public.mensagens_campanhas(created_at DESC);