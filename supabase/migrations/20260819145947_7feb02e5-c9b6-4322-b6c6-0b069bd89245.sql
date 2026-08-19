-- MIGRATION: BACKEND MR CENTRAL PARA EXTENSÃO MR SEM LIMITES
-- Data: 2026-08-19

-- 1. Tabelas de Licenciamento (Garantindo campos obrigatórios)
DO $$ 
BEGIN
    -- Adicionar campos se não existirem na tabela licencas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licencas' AND column_name='license_key') THEN
        ALTER TABLE public.licencas ADD COLUMN license_key TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licencas' AND column_name='user_name') THEN
        ALTER TABLE public.licencas ADD COLUMN user_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licencas' AND column_name='status') THEN
        ALTER TABLE public.licencas ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licencas' AND column_name='expires_at') THEN
        ALTER TABLE public.licencas ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licencas' AND column_name='max_devices') THEN
        ALTER TABLE public.licencas ADD COLUMN max_devices INT DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='licencas' AND column_name='revoked_at') THEN
        ALTER TABLE public.licencas ADD COLUMN revoked_at TIMESTAMPTZ;
    END IF;
END $$;

-- Constraint de formato da chave: MR-XXXX-XXXX-XXXX ou SIGLA-MR-XXXX-XXXX-XXXX-XXXX
ALTER TABLE public.licencas DROP CONSTRAINT IF EXISTS check_license_key_format;
ALTER TABLE public.licencas ADD CONSTRAINT check_license_key_format 
    CHECK (license_key ~ '^[A-Z0-9]{2}-MR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$' OR license_key ~ '^MR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$');

-- 2. Tabela ext_sessions
CREATE TABLE IF NOT EXISTS public.ext_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licencas(id) ON DELETE CASCADE NOT NULL,
    hwid TEXT NOT NULL,
    session_id UUID DEFAULT gen_random_uuid(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(license_id, hwid)
);

GRANT SELECT, INSERT, UPDATE ON public.ext_sessions TO authenticated;
GRANT ALL ON public.ext_sessions TO service_role;
ALTER TABLE public.ext_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Tabela ext_requests (Auditoria)
CREATE TABLE IF NOT EXISTS public.ext_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licencas(id) ON DELETE SET NULL,
    route TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INT,
    correlation_id TEXT,
    payload_sanitized JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT INSERT ON public.ext_requests TO authenticated;
GRANT ALL ON public.ext_requests TO service_role;
ALTER TABLE public.ext_requests ENABLE ROW LEVEL SECURITY;

-- 4. Tabela ext_uploads
CREATE TABLE IF NOT EXISTS public.ext_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licencas(id) ON DELETE CASCADE NOT NULL,
    original_name TEXT,
    storage_key TEXT NOT NULL,
    url TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT ON public.ext_uploads TO authenticated;
GRANT ALL ON public.ext_uploads TO service_role;
ALTER TABLE public.ext_uploads ENABLE ROW LEVEL SECURITY;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_licencas_license_key ON public.licencas(license_key);
CREATE INDEX IF NOT EXISTS idx_ext_sessions_hwid ON public.ext_sessions(hwid);
CREATE INDEX IF NOT EXISTS idx_ext_sessions_last_seen ON public.ext_sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_ext_requests_license_id ON public.ext_requests(license_id);
