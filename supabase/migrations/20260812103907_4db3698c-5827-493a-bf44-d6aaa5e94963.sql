-- Criar tabelas centrais se não existirem
CREATE TABLE IF NOT EXISTS public.product_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    changelog TEXT,
    is_critical BOOLEAN DEFAULT false,
    download_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.license_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licencas(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    feature_value JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_versions TO authenticated;
GRANT ALL ON public.product_versions TO service_role;
GRANT SELECT ON public.product_versions TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_features TO authenticated;
GRANT ALL ON public.license_features TO service_role;
GRANT SELECT ON public.license_features TO anon;

-- Adicionar slug e product_id se faltarem (migração aditiva)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='slug') THEN
        ALTER TABLE public.produtos ADD COLUMN slug TEXT UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licencas' AND column_name='produto_id') THEN
        ALTER TABLE public.licencas ADD COLUMN produto_id UUID REFERENCES public.produtos(id);
    END IF;
END $$;
