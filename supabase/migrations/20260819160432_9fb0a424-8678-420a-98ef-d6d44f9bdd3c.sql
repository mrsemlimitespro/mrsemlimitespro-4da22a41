-- Migration SQL para Extensão V17 do MR Central
-- Cria tabelas, bucket e policies para a integração com a extensão.

-- 1. Tabela de Licenças (adaptação segura)
ALTER TABLE IF EXISTS public.licencas 
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial' CHECK (status IN ('active', 'revoked', 'trial')),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS max_devices INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Tabelas de Operação
CREATE TABLE IF NOT EXISTS public.ext_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licencas(id) ON DELETE CASCADE NOT NULL,
    hwid TEXT NOT NULL,
    session_id TEXT NOT NULL,
    last_seen TIMESTAMPTZ DEFAULT now(),
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ext_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licencas(id) ON DELETE CASCADE NOT NULL,
    route TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    correlation_id TEXT,
    payload_sanitized JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ext_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licencas(id) ON DELETE CASCADE NOT NULL,
    original_name TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_licencas_key ON public.licencas(license_key);
CREATE INDEX IF NOT EXISTS idx_ext_sessions_lic_hwid ON public.ext_sessions(license_id, hwid);
CREATE INDEX IF NOT EXISTS idx_ext_sessions_last_seen ON public.ext_sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_ext_requests_lic_id ON public.ext_requests(license_id);
CREATE INDEX IF NOT EXISTS idx_ext_requests_created ON public.ext_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_ext_uploads_lic_id ON public.ext_uploads(license_id);

-- 4. RLS e Segurança
ALTER TABLE public.licencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ext_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ext_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ext_uploads ENABLE ROW LEVEL SECURITY;

-- 5. Privilégios para authenticated e service_role
GRANT SELECT ON public.licencas TO authenticated;
GRANT ALL ON public.licencas TO service_role;

GRANT SELECT ON public.ext_sessions TO authenticated;
GRANT ALL ON public.ext_sessions TO service_role;

GRANT SELECT ON public.ext_requests TO authenticated;
GRANT ALL ON public.ext_requests TO service_role;

GRANT SELECT ON public.ext_uploads TO authenticated;
GRANT ALL ON public.ext_uploads TO service_role;
