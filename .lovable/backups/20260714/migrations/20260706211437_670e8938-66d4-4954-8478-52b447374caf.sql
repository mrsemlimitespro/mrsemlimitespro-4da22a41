-- ============================================================
-- AI PROMPTS
-- ============================================================
CREATE TABLE public.ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer,
  titulo text NOT NULL,
  descricao text,
  prompt text NOT NULL,
  categoria text,
  subcategoria text,
  nivel text,
  status text DEFAULT 'ativo',
  compatibilidade text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  cover_url text,
  autor text,
  versao text,
  ativo boolean NOT NULL DEFAULT true,
  oculto boolean NOT NULL DEFAULT false,
  destaque boolean NOT NULL DEFAULT false,
  mostrar_premium boolean NOT NULL DEFAULT true,
  mostrar_tv boolean NOT NULL DEFAULT false,
  mostrar_seguidores boolean NOT NULL DEFAULT false,
  visible_mobile boolean NOT NULL DEFAULT true,
  mobile_featured boolean NOT NULL DEFAULT false,
  mobile_order integer,
  uso_count integer NOT NULL DEFAULT 0,
  downloads integer NOT NULL DEFAULT 0,
  popularidade integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_prompts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_prompts TO authenticated;
GRANT ALL ON public.ai_prompts TO service_role;

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view prompts"
  ON public.ai_prompts FOR SELECT
  USING (true);

CREATE POLICY "Admins manage prompts"
  ON public.ai_prompts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX ai_prompts_categoria_idx ON public.ai_prompts (categoria);
CREATE INDEX ai_prompts_numero_idx ON public.ai_prompts (numero);
CREATE INDEX ai_prompts_ativo_oculto_idx ON public.ai_prompts (ativo, oculto);

-- ============================================================
-- AI AGENTS
-- ============================================================
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero integer,
  titulo text NOT NULL,
  descricao text,
  descricao_completa text,
  categoria text,
  subcategoria text,
  system_prompt text NOT NULL,
  instrucoes text,
  modelo text,
  provedor text,
  temperatura numeric,
  max_tokens integer,
  capabilities text[] DEFAULT '{}',
  tools text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  compatibilidade text[] DEFAULT '{}',
  autor text,
  nivel text,
  versao text,
  cover_url text,
  ativo boolean NOT NULL DEFAULT true,
  oculto boolean NOT NULL DEFAULT false,
  destaque boolean NOT NULL DEFAULT false,
  visible_mobile boolean NOT NULL DEFAULT true,
  uso_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_agents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_agents TO authenticated;
GRANT ALL ON public.ai_agents TO service_role;

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agents_public_read"
  ON public.ai_agents FOR SELECT
  USING (ativo = true AND oculto = false);

CREATE POLICY "Admins manage agents"
  ON public.ai_agents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX ai_agents_categoria_idx ON public.ai_agents (categoria);
CREATE INDEX ai_agents_numero_idx ON public.ai_agents (numero);

-- ============================================================
-- PROMPT FAVORITES (owner-scoped)
-- ============================================================
CREATE TABLE public.prompt_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id uuid NOT NULL REFERENCES public.ai_prompts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, prompt_id)
);

GRANT SELECT, INSERT, DELETE ON public.prompt_favorites TO authenticated;
GRANT ALL ON public.prompt_favorites TO service_role;

ALTER TABLE public.prompt_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_owner_select"
  ON public.prompt_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_owner_insert"
  ON public.prompt_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_owner_delete"
  ON public.prompt_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- PROMPT HISTORY (owner-scoped, append-only)
-- ============================================================
CREATE TABLE public.prompt_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_id uuid NOT NULL REFERENCES public.ai_prompts(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.prompt_history TO authenticated;
GRANT ALL ON public.prompt_history TO service_role;

ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_owner_select"
  ON public.prompt_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "history_owner_insert"
  ON public.prompt_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX prompt_history_user_idx ON public.prompt_history (user_id, created_at DESC);
CREATE INDEX prompt_history_prompt_idx ON public.prompt_history (prompt_id);

-- ============================================================
-- PROMPT CLASSIFICATION LEARNING (service_role only)
-- ============================================================
CREATE TABLE public.prompt_classification_learning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid REFERENCES public.ai_prompts(id) ON DELETE CASCADE,
  categoria_sugerida text,
  subcategoria_sugerida text,
  confianca numeric,
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.prompt_classification_learning TO service_role;

ALTER TABLE public.prompt_classification_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access"
  ON public.prompt_classification_learning FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- updated_at trigger reutiliza tg_set_updated_at (já existe no projeto)
-- ============================================================
CREATE TRIGGER ai_prompts_set_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER ai_agents_set_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER prompt_classification_learning_set_updated_at
  BEFORE UPDATE ON public.prompt_classification_learning
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
