-- MIGRATION PARA EXTENSÃO MR SEM LIMITES V17
-- Aplique este SQL no Console do Supabase

-- 1. Tabelas de Auditoria e Sessão
CREATE TABLE IF NOT EXISTS public.ext_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licencas(id) ON DELETE CASCADE,
    hwid TEXT NOT NULL,
    session_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    last_seen TIMESTAMPTZ DEFAULT now(),
    UNIQUE(license_id, hwid)
);

CREATE TABLE IF NOT EXISTS public.ext_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licencas(id) ON DELETE SET NULL,
    route TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    payload_sanitized JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ext_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID REFERENCES public.licencas(id) ON DELETE SET NULL,
    original_name TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS (Privado, apenas service_role/admin acessa via backend)
ALTER TABLE public.ext_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ext_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ext_uploads ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.ext_sessions TO service_role;
GRANT ALL ON public.ext_requests TO service_role;
GRANT ALL ON public.ext_uploads TO service_role;

-- 3. Bucket de Storage
-- Nota: Criar via Dashboard do Supabase ou via API (setup-v17.ts)
-- Nome: mr-ext-uploads
-- Público: Não
