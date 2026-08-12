-- Fase 1.1: produtos.slug
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS produtos_slug_unique_idx ON public.produtos(slug) WHERE slug IS NOT NULL;

-- Fase 1.2: admin_settings.config_extensao_por_produto
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS config_extensao_por_produto jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Fase 1.3: email_templates.produto_id
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS email_templates_produto_id_idx ON public.email_templates(produto_id) WHERE produto_id IS NOT NULL;

-- Fase 1.4: extensao_configs.produto_id
ALTER TABLE public.extensao_configs ADD COLUMN IF NOT EXISTS produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS extensao_configs_produto_id_idx ON public.extensao_configs(produto_id) WHERE produto_id IS NOT NULL;

-- Fase 1.5: licencas(produto_id, chave)
CREATE INDEX IF NOT EXISTS licencas_produto_id_chave_idx ON public.licencas(produto_id, chave);