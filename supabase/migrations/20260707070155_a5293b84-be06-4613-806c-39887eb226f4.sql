
-- ============================================================
-- Etapa 1 — CMS: colunas aditivas, RLS pública, realtime
-- ============================================================

-- ===== PROMOÇÕES =====
ALTER TABLE public.promocoes
  ADD COLUMN IF NOT EXISTS subtitulo text,
  ADD COLUMN IF NOT EXISTS banner_desktop_url text,
  ADD COLUMN IF NOT EXISTS banner_mobile_url text,
  ADD COLUMN IF NOT EXISTS botao_texto text,
  ADD COLUMN IF NOT EXISTS preco_antigo numeric(12,2),
  ADD COLUMN IF NOT EXISTS preco_atual numeric(12,2),
  ADD COLUMN IF NOT EXISTS cor text,
  ADD COLUMN IF NOT EXISTS icone text,
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS destaque boolean NOT NULL DEFAULT false;

-- Leitura pública de promoções ativas (anon + authenticated)
DROP POLICY IF EXISTS "promocoes ativas visiveis" ON public.promocoes;
CREATE POLICY "promocoes ativas visiveis" ON public.promocoes
  FOR SELECT TO anon, authenticated
  USING (
    (ativo = true AND (inicio IS NULL OR inicio <= now()) AND (fim IS NULL OR fim >= now()))
    OR public.has_role(auth.uid(),'admin')
  );
GRANT SELECT ON public.promocoes TO anon;

-- ===== BANNERS =====
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS subtitulo text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS imagem_mobile_url text,
  ADD COLUMN IF NOT EXISTS preco numeric(12,2),
  ADD COLUMN IF NOT EXISTS preco_promocional numeric(12,2),
  ADD COLUMN IF NOT EXISTS botao_texto text,
  ADD COLUMN IF NOT EXISTS cor_botao text,
  ADD COLUMN IF NOT EXISTS cor_fundo text,
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS icone text,
  ADD COLUMN IF NOT EXISTS inicio timestamptz,
  ADD COLUMN IF NOT EXISTS fim timestamptz;

DROP POLICY IF EXISTS "banners ativos visiveis" ON public.banners;
CREATE POLICY "banners ativos visiveis" ON public.banners
  FOR SELECT TO anon, authenticated
  USING (
    (ativo = true AND (inicio IS NULL OR inicio <= now()) AND (fim IS NULL OR fim >= now()))
    OR public.has_role(auth.uid(),'admin')
  );
GRANT SELECT ON public.banners TO anon;

-- ===== PROPAGANDAS =====
ALTER TABLE public.propagandas
  ADD COLUMN IF NOT EXISTS subtitulo text,
  ADD COLUMN IF NOT EXISTS botao_texto text,
  ADD COLUMN IF NOT EXISTS posicao text NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tempo_segundos integer,
  ADD COLUMN IF NOT EXISTS imagem_desktop_url text,
  ADD COLUMN IF NOT EXISTS imagem_mobile_url text,
  ADD COLUMN IF NOT EXISTS mostrar_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inicio timestamptz,
  ADD COLUMN IF NOT EXISTS fim timestamptz;

DROP POLICY IF EXISTS "propagandas ativas visiveis" ON public.propagandas;
CREATE POLICY "propagandas ativas visiveis" ON public.propagandas
  FOR SELECT TO anon, authenticated
  USING (
    (ativo = true AND (inicio IS NULL OR inicio <= now()) AND (fim IS NULL OR fim >= now()))
    OR public.has_role(auth.uid(),'admin')
  );
GRANT SELECT ON public.propagandas TO anon;

-- ===== PLANOS =====
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS beneficios jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cor text,
  ADD COLUMN IF NOT EXISTS icone text,
  ADD COLUMN IF NOT EXISTS botao_texto text,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS destaque boolean NOT NULL DEFAULT false;

GRANT SELECT ON public.planos TO anon;

-- ===== PRODUTOS =====
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS titulo text,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS estoque integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS botao_texto text,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'disponivel',
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "produtos ativos visiveis" ON public.produtos;
CREATE POLICY "produtos ativos visiveis" ON public.produtos
  FOR SELECT TO anon, authenticated
  USING (ativo = true OR public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.produtos TO anon;

-- ===== IMAGENS =====
ALTER TABLE public.imagens
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- ===== CARROSSEL SLIDES =====
CREATE TABLE IF NOT EXISTS public.carrossel_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  subtitulo text,
  descricao text,
  imagem_desktop_url text,
  imagem_mobile_url text,
  preco numeric(12,2),
  preco_promocional numeric(12,2),
  botao_texto text,
  link text,
  cor_botao text,
  cor_fundo text,
  badge text,
  icone text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  inicio timestamptz,
  fim timestamptz,
  agendamento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.carrossel_slides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.carrossel_slides TO authenticated;
GRANT ALL ON public.carrossel_slides TO service_role;
ALTER TABLE public.carrossel_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carrossel slides ativos visiveis" ON public.carrossel_slides;
CREATE POLICY "carrossel slides ativos visiveis" ON public.carrossel_slides
  FOR SELECT TO anon, authenticated
  USING (
    (ativo = true AND (inicio IS NULL OR inicio <= now()) AND (fim IS NULL OR fim >= now()))
    OR public.has_role(auth.uid(),'admin')
  );

DROP POLICY IF EXISTS "carrossel slides admin manage" ON public.carrossel_slides;
CREATE POLICY "carrossel slides admin manage" ON public.carrossel_slides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS carrossel_slides_updated_at ON public.carrossel_slides;
CREATE TRIGGER carrossel_slides_updated_at
  BEFORE UPDATE ON public.carrossel_slides
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== Realtime =====
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['promocoes','banners','propagandas','planos','produtos','imagens','videos','carrossel_slides']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL;
    END;
  END LOOP;
END $$;
