
-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- 2. Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all clientes" ON public.clientes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_clientes_upd BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3. Licencas
CREATE TABLE public.licencas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  plano TEXT,
  status TEXT NOT NULL DEFAULT 'ativa',
  expira_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.licencas TO authenticated;
GRANT ALL ON public.licencas TO service_role;
ALTER TABLE public.licencas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all licencas" ON public.licencas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_licencas_upd BEFORE UPDATE ON public.licencas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 4. Produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all produtos" ON public.produtos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_produtos_upd BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 5. Creditos packs
CREATE TABLE public.creditos_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  quantidade INT NOT NULL DEFAULT 0,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creditos_packs TO authenticated;
GRANT ALL ON public.creditos_packs TO service_role;
ALTER TABLE public.creditos_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all creditos_packs" ON public.creditos_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_creditos_upd BEFORE UPDATE ON public.creditos_packs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 6. Promocoes
CREATE TABLE public.promocoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  desconto_percentual NUMERIC(5,2) DEFAULT 0,
  inicio TIMESTAMPTZ,
  fim TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promocoes TO authenticated;
GRANT ALL ON public.promocoes TO service_role;
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all promocoes" ON public.promocoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_promocoes_upd BEFORE UPDATE ON public.promocoes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 7. Banners
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  imagem_url TEXT,
  link TEXT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all banners" ON public.banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_banners_upd BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 8. Imagens
CREATE TABLE public.imagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  categoria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imagens TO authenticated;
GRANT ALL ON public.imagens TO service_role;
ALTER TABLE public.imagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all imagens" ON public.imagens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_imagens_upd BEFORE UPDATE ON public.imagens FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 9. Videos
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all videos" ON public.videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_videos_upd BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 10. Aulas
CREATE TABLE public.aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aulas TO authenticated;
GRANT ALL ON public.aulas TO service_role;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all aulas" ON public.aulas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_aulas_upd BEFORE UPDATE ON public.aulas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 11. Propagandas
CREATE TABLE public.propagandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  texto TEXT,
  imagem_url TEXT,
  link TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.propagandas TO authenticated;
GRANT ALL ON public.propagandas TO service_role;
ALTER TABLE public.propagandas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all propagandas" ON public.propagandas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_propagandas_upd BEFORE UPDATE ON public.propagandas FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
