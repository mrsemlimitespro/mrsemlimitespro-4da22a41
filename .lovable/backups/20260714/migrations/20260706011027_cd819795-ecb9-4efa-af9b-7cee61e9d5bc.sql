ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS extension_url TEXT,
  ADD COLUMN IF NOT EXISTS extension_filename TEXT;