-- FASE 9: ECOSSISTEMA COMERCIAL MR CENTRAL V2
-- Expansão do schema para Extensões, Releases, Trials e HWID Resets.

-- 1. EXTENSÕES (Produtos específicos que são baixáveis)
CREATE TABLE IF NOT EXISTS public.extensoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id uuid REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
    nome text NOT NULL,
    slug text UNIQUE NOT NULL,
    sigla text NOT NULL,
    icone_url text,
    capa_url text,
    descricao text,
    descricao_completa text,
    categoria text DEFAULT 'utilitario',
    status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'manutencao', 'descontinuado')),
    versao_atual text,
    screenshots text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.extensoes TO authenticated;
GRANT SELECT ON public.extensoes TO anon;
GRANT ALL ON public.extensoes TO service_role;
ALTER TABLE public.extensoes ENABLE ROW LEVEL SECURITY;

-- 2. RELEASES / VERSÕES
CREATE TABLE IF NOT EXISTS public.product_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    extensao_id uuid REFERENCES public.extensoes(id) ON DELETE CASCADE,
    versao text NOT NULL,
    changelog text,
    download_url text,
    checksum text,
    obrigatoria boolean DEFAULT false,
    versao_minima text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    UNIQUE(extensao_id, versao)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_versions TO authenticated;
GRANT SELECT ON public.product_versions TO anon;
GRANT ALL ON public.product_versions TO service_role;
ALTER TABLE public.product_versions ENABLE ROW LEVEL SECURITY;

-- 3. TRIALS (Configuração por Extensão)
CREATE TABLE IF NOT EXISTS public.extensao_trials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    extensao_id uuid REFERENCES public.extensoes(id) ON DELETE CASCADE UNIQUE,
    ativo boolean DEFAULT false,
    duracao_minutos int DEFAULT 60,
    limite_por_dispositivo int DEFAULT 1,
    cooldown_dias int DEFAULT 30,
    features_liberadas text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.extensao_trials TO authenticated;
GRANT SELECT ON public.extensao_trials TO anon;
GRANT ALL ON public.extensao_trials TO service_role;
ALTER TABLE public.extensao_trials ENABLE ROW LEVEL SECURITY;

-- 4. TRIALS EMITIDOS (Rastreamento para evitar abuso)
CREATE TABLE IF NOT EXISTS public.trials_emitidos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    extensao_id uuid REFERENCES public.extensoes(id) ON DELETE CASCADE,
    auth_user_id uuid REFERENCES auth.users(id),
    hwid text NOT NULL,
    expires_at timestamptz NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.trials_emitidos TO authenticated;
GRANT ALL ON public.trials_emitidos TO service_role;
ALTER TABLE public.trials_emitidos ENABLE ROW LEVEL SECURITY;

-- 5. HWID RESETS (Log de auditoria e controle)
CREATE TABLE IF NOT EXISTS public.hwid_resets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    licenca_id uuid REFERENCES public.licencas(id) ON DELETE CASCADE,
    auth_user_id uuid REFERENCES auth.users(id),
    hwid_anterior text,
    hwid_novo text,
    origem text DEFAULT 'cliente' CHECK (origem IN ('cliente', 'revendedor', 'admin')),
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.hwid_resets TO authenticated;
GRANT ALL ON public.hwid_resets TO service_role;
ALTER TABLE public.hwid_resets ENABLE ROW LEVEL SECURITY;

-- 6. AJUSTE EM API_KEYS (Melhor auditoria)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='last_ip') THEN
        ALTER TABLE public.api_keys ADD COLUMN last_ip text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='revendedor_id') THEN
        ALTER TABLE public.api_keys ADD COLUMN revendedor_id uuid REFERENCES public.revendedores(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Policies for new tables
CREATE POLICY "extensoes_public_select" ON public.extensoes FOR SELECT USING (status = 'ativo');
CREATE POLICY "extensoes_admin_all" ON public.extensoes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "product_versions_public_select" ON public.product_versions FOR SELECT USING (true);
CREATE POLICY "product_versions_admin_all" ON public.product_versions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "extensao_trials_public_select" ON public.extensao_trials FOR SELECT USING (true);
CREATE POLICY "extensao_trials_admin_all" ON public.extensao_trials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "trials_emitidos_user_select" ON public.trials_emitidos FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);
CREATE POLICY "trials_emitidos_user_insert" ON public.trials_emitidos FOR INSERT TO authenticated WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "hwid_resets_user_select" ON public.hwid_resets FOR SELECT TO authenticated USING (auth.uid() = auth_user_id);
CREATE POLICY "hwid_resets_admin_select" ON public.hwid_resets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
