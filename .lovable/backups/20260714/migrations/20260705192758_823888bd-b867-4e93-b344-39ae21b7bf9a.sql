
-- ============ ADMIN SETTINGS (single row) ============
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  password_hash text,
  site_name text NOT NULL DEFAULT 'MR Lova',
  logo_url text,
  favicon_url text,
  primary_color text NOT NULL DEFAULT 'oklch(0.65 0.24 295)',
  accent_color text NOT NULL DEFAULT 'oklch(0.68 0.28 340)',
  welcome_text text,
  footer_text text,
  notification_message text,
  notification_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Public read of non-secret fields is fine (password_hash never leaves server via has_role fn we'll create).
-- To hide password_hash from clients, we simply revoke SELECT on that column for anon and authenticated.
REVOKE SELECT (password_hash) ON public.admin_settings FROM anon;
REVOKE SELECT (password_hash) ON public.admin_settings FROM authenticated;

CREATE POLICY "public read admin settings" ON public.admin_settings
  FOR SELECT USING (true);
CREATE POLICY "admin manage settings" ON public.admin_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_admin_settings_updated
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.admin_settings (singleton) VALUES (true)
  ON CONFLICT (singleton) DO NOTHING;

-- Helper: verify shared admin password (server-side compare)
CREATE OR REPLACE FUNCTION public.verify_admin_password(_password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _hash text;
BEGIN
  SELECT password_hash INTO _hash FROM public.admin_settings LIMIT 1;
  IF _hash IS NULL OR _hash = '' THEN
    RETURN false;
  END IF;
  RETURN extensions.crypt(_password, _hash) = _hash;
END;
$$;

-- Helper: set / change admin password
CREATE OR REPLACE FUNCTION public.set_admin_password(_new_password text, _current_password text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _hash text;
BEGIN
  IF length(coalesce(_new_password,'')) < 4 THEN
    RAISE EXCEPTION 'Senha muito curta';
  END IF;
  SELECT password_hash INTO _hash FROM public.admin_settings LIMIT 1;
  IF _hash IS NOT NULL AND _hash <> '' THEN
    IF _current_password IS NULL OR extensions.crypt(_current_password, _hash) <> _hash THEN
      RAISE EXCEPTION 'Senha atual incorreta';
    END IF;
  END IF;
  UPDATE public.admin_settings
     SET password_hash = extensions.crypt(_new_password, extensions.gen_salt('bf', 10));
  RETURN true;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

GRANT EXECUTE ON FUNCTION public.verify_admin_password(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_admin_password(text, text) TO anon, authenticated;

-- ============ REVENDEDORES ============
CREATE TABLE IF NOT EXISTS public.revendedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  telefone text,
  comissao numeric(5,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revendedores TO authenticated;
GRANT ALL ON public.revendedores TO service_role;
ALTER TABLE public.revendedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage revendedores" ON public.revendedores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_revendedores_updated BEFORE UPDATE ON public.revendedores
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ ESTOQUE ============
CREATE TABLE IF NOT EXISTS public.estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL,
  item text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0,
  minimo integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'disponivel',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque TO authenticated;
GRANT ALL ON public.estoque TO service_role;
ALTER TABLE public.estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage estoque" ON public.estoque FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_estoque_updated BEFORE UPDATE ON public.estoque
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ LOGOS ============
CREATE TABLE IF NOT EXISTS public.logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  url text NOT NULL,
  escopo text NOT NULL DEFAULT 'principal',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.logos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logos TO authenticated;
GRANT ALL ON public.logos TO service_role;
ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read logos" ON public.logos FOR SELECT USING (true);
CREATE POLICY "admin manage logos" ON public.logos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_logos_updated BEFORE UPDATE ON public.logos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ NOTIFICACOES ============
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'info',
  destino text NOT NULL DEFAULT 'todos',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notificacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read notificacoes" ON public.notificacoes FOR SELECT USING (true);
CREATE POLICY "admin manage notificacoes" ON public.notificacoes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_notificacoes_updated BEFORE UPDATE ON public.notificacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
