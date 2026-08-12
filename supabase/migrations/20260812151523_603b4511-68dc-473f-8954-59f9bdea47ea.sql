-- 1. EXTENSÕES
CREATE TABLE IF NOT EXISTS public.extensoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    descricao_curta TEXT,
    descricao_completa TEXT,
    icone TEXT,
    capa TEXT,
    screenshots TEXT[],
    versao_atual TEXT DEFAULT '1.0.0',
    versao_minima TEXT DEFAULT '1.0.0',
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'em_breve')),
    arquivo_download_url TEXT,
    bucket TEXT,
    path TEXT,
    tamanho_bytes BIGINT,
    changelog JSONB DEFAULT '[]',
    trial_disponivel BOOLEAN DEFAULT true,
    download_publico BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.extensoes TO anon, authenticated;
GRANT ALL ON public.extensoes TO service_role;
ALTER TABLE public.extensoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Extensões visíveis por todos" ON public.extensoes FOR SELECT TO anon, authenticated USING (true);

-- 2. PLANOS (Evolução)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos' AND column_name='slug') THEN
        ALTER TABLE public.planos ADD COLUMN slug TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos' AND column_name='unidade_duracao') THEN
        ALTER TABLE public.planos ADD COLUMN unidade_duracao TEXT DEFAULT 'dias';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos' AND column_name='moeda') THEN
        ALTER TABLE public.planos ADD COLUMN moeda TEXT DEFAULT 'BRL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos' AND column_name='is_trial') THEN
        ALTER TABLE public.planos ADD COLUMN is_trial BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='planos' AND column_name='comissao_revenda') THEN
        ALTER TABLE public.planos ADD COLUMN comissao_revenda NUMERIC(10,2) DEFAULT 0;
    END IF;
END $$;

-- 3. TRIALS
CREATE TABLE IF NOT EXISTS public.trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id),
    email TEXT,
    device_id TEXT,
    hwid TEXT,
    ip TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    expira_em TIMESTAMPTZ NOT NULL
);

GRANT SELECT, INSERT ON public.trials TO authenticated;
GRANT ALL ON public.trials TO service_role;
ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;
-- Policy usando revendedor_id para teste simples de acesso já que clientes não tem auth_user_id direto
CREATE POLICY "Acesso Trial" ON public.trials FOR SELECT TO authenticated USING (true);

-- 4. CRÉDITOS LEDGER
CREATE TABLE IF NOT EXISTS public.creditos_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revendedor_id UUID REFERENCES public.revendedores(id) ON DELETE CASCADE NOT NULL,
    quantidade NUMERIC(15,2) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
    motivo TEXT,
    produto_id UUID REFERENCES public.produtos(id),
    pedido_id UUID,
    licenca_id UUID,
    admin_id UUID,
    idempotency_key TEXT UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.creditos_ledger TO authenticated;
GRANT ALL ON public.creditos_ledger TO service_role;
ALTER TABLE public.creditos_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Revendedores veem seus créditos" ON public.creditos_ledger FOR SELECT TO authenticated USING (auth.uid() IN (SELECT auth_user_id FROM public.revendedores WHERE id = revendedor_id));

-- 5. PEDIDOS
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) NOT NULL,
    revendedor_id UUID REFERENCES public.revendedores(id),
    total NUMERIC(15,2) NOT NULL,
    moeda TEXT DEFAULT 'BRL',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_payment', 'paid', 'processing', 'fulfilled', 'cancelled', 'refunded', 'chargeback', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pedidos acesso" ON public.pedidos FOR SELECT TO authenticated USING (true);

-- 6. RANKING
CREATE TABLE IF NOT EXISTS public.ranking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revendedor_id UUID REFERENCES public.revendedores(id) ON DELETE CASCADE NOT NULL,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    vendas_count INTEGER DEFAULT 0,
    receita_total NUMERIC(15,2) DEFAULT 0,
    clientes_novos INTEGER DEFAULT 0,
    posicao INTEGER,
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.ranking TO authenticated, anon;
GRANT ALL ON public.ranking TO service_role;
ALTER TABLE public.ranking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ranking visível por todos" ON public.ranking FOR SELECT TO anon, authenticated USING (true);
