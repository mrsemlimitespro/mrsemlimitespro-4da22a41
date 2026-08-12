-- ============================================================
-- Etapa 3.1 — Schema Packs Premium (migração cirúrgica)
-- Cria APENAS o núcleo do módulo. NÃO cria subscribers/vip_codes
-- para não conflitar com o sistema de licenças/revendedores.
-- ============================================================

-- 1) premium_packs (consolidação de 4 migrations do origem)
CREATE TABLE IF NOT EXISTS public.premium_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'geral',
  descricao_curta text,
  descricao_completa text,
  banner_url text,
  capa_url text,
  icone_url text,
  video_url text,
  galeria text[] NOT NULL DEFAULT '{}'::text[],
  tags text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','rascunho','em_breve')),
  is_shareable boolean NOT NULL DEFAULT true,
  allow_download boolean NOT NULL DEFAULT true,
  allow_view boolean NOT NULL DEFAULT true,
  destaque boolean NOT NULL DEFAULT false,
  qtd_arquivos integer NOT NULL DEFAULT 0,
  espaco_bytes bigint NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  downloads integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  popularidade integer NOT NULL DEFAULT 0,
  autor text,
  versao text,
  compatibilidade text[] NOT NULL DEFAULT '{}'::text[],
  observacoes text,
  qr_code_url text,
  public_link text,
  seo_meta_title text,
  seo_meta_description text,
  og_image_url text,
  twitter_image_url text,
  source_type text NOT NULL DEFAULT 'none' CHECK (source_type IN ('none','google_drive','dropbox','onedrive','cloudflare_r2','supabase_storage','local','outro')),
  source_url_encrypted jsonb,
  source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  public_token text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  sales_platform text,
  sales_product_id text,
  visibility_status text NOT NULL DEFAULT 'publico' CHECK (visibility_status IN ('publico','privado','arquivado')),
  ultima_atualizacao timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.premium_packs.source_url_encrypted IS 'AES-256-GCM encrypted blob ({v,iv,tag,ct}). Admin-only. Never exposed to clients.';
COMMENT ON COLUMN public.premium_packs.source_metadata IS 'Non-sensitive metadata (folder_id, file_count, last_sync_at). Admin-only writes.';

CREATE UNIQUE INDEX IF NOT EXISTS premium_packs_public_token_key ON public.premium_packs(public_token);
CREATE INDEX IF NOT EXISTS premium_packs_categoria_idx ON public.premium_packs(categoria);
CREATE INDEX IF NOT EXISTS premium_packs_status_idx ON public.premium_packs(status);
CREATE INDEX IF NOT EXISTS premium_packs_ordem_idx ON public.premium_packs(ordem);
CREATE INDEX IF NOT EXISTS premium_packs_popularidade_idx ON public.premium_packs(popularidade DESC);
CREATE INDEX IF NOT EXISTS premium_packs_downloads_idx ON public.premium_packs(downloads DESC);
CREATE INDEX IF NOT EXISTS premium_packs_ultima_atualizacao_idx ON public.premium_packs(ultima_atualizacao DESC);
CREATE INDEX IF NOT EXISTS premium_packs_created_at_idx ON public.premium_packs(created_at DESC);
CREATE INDEX IF NOT EXISTS premium_packs_tags_gin_idx ON public.premium_packs USING gin(tags);
CREATE INDEX IF NOT EXISTS premium_packs_destaque_idx ON public.premium_packs(destaque) WHERE destaque = true;

GRANT SELECT ON public.premium_packs TO anon;
GRANT SELECT ON public.premium_packs TO authenticated;
GRANT ALL ON public.premium_packs TO service_role;

ALTER TABLE public.premium_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "premium_packs_read_public_anon"
  ON public.premium_packs FOR SELECT TO anon
  USING (status = 'ativo' AND visibility_status = 'publico');

CREATE POLICY "premium_packs_read_authenticated"
  ON public.premium_packs FOR SELECT TO authenticated
  USING (status = 'ativo');

CREATE POLICY "premium_packs_admin_all"
  ON public.premium_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER premium_packs_set_updated_at
  BEFORE UPDATE ON public.premium_packs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 2) pack_access (grants por user/email)
CREATE TABLE IF NOT EXISTS public.pack_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL REFERENCES public.premium_packs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  gateway text NOT NULL DEFAULT 'manual',
  transaction_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  origin text NOT NULL DEFAULT 'manual',
  amount_cents bigint,
  currency text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pack_access_txn_uniq ON public.pack_access(gateway, transaction_id) WHERE transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pack_access_pack_email_uniq ON public.pack_access(pack_id, lower(email));
CREATE INDEX IF NOT EXISTS pack_access_user_idx ON public.pack_access(user_id);
CREATE INDEX IF NOT EXISTS pack_access_email_idx ON public.pack_access(lower(email));
CREATE INDEX IF NOT EXISTS pack_access_status_idx ON public.pack_access(status);

GRANT SELECT ON public.pack_access TO authenticated;
GRANT ALL ON public.pack_access TO service_role;

ALTER TABLE public.pack_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pack_access_owner_read" ON public.pack_access
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email','')));

CREATE POLICY "pack_access_admin_all" ON public.pack_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pack_access_set_updated_at
  BEFORE UPDATE ON public.pack_access
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 3) pack_download_logs (auditoria)
CREATE TABLE IF NOT EXISTS public.pack_download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  pack_slug text NOT NULL,
  pack_id uuid NULL,
  node_id text NOT NULL,
  file_name text NULL,
  file_size bigint NULL,
  file_kind text NULL,
  origin_provider text NULL,
  user_id uuid NULL,
  user_email text NULL,
  ip text NULL,
  user_agent text NULL,
  device text NULL,
  browser text NULL,
  referer text NULL,
  status text NOT NULL DEFAULT 'started',
  error_message text NULL,
  bytes_sent bigint NULL,
  duration_ms integer NULL
);

CREATE INDEX IF NOT EXISTS idx_pack_download_logs_pack_slug_created ON public.pack_download_logs (pack_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pack_download_logs_user_created ON public.pack_download_logs (user_id, created_at DESC);

GRANT ALL ON public.pack_download_logs TO service_role;

ALTER TABLE public.pack_download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pack_download_logs_admin_read" ON public.pack_download_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) sales_events (webhooks de gateways)
CREATE TABLE IF NOT EXISTS public.sales_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL,
  transaction_id text,
  product_external_id text,
  pack_id uuid REFERENCES public.premium_packs(id) ON DELETE SET NULL,
  customer_email text,
  customer_name text,
  amount_cents bigint,
  currency text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sales_events_gateway_event_uniq ON public.sales_events(gateway, event_id);
CREATE INDEX IF NOT EXISTS sales_events_pack_idx ON public.sales_events(pack_id);
CREATE INDEX IF NOT EXISTS sales_events_email_idx ON public.sales_events(lower(customer_email));
CREATE INDEX IF NOT EXISTS sales_events_created_idx ON public.sales_events(created_at DESC);

GRANT ALL ON public.sales_events TO service_role;

ALTER TABLE public.sales_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_events_admin_read" ON public.sales_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sales_events_service_all" ON public.sales_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);