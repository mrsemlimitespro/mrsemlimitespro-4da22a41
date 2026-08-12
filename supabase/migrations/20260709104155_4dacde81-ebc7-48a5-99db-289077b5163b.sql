ALTER TABLE public.premium_packs
  ADD COLUMN IF NOT EXISTS drive_url TEXT,
  ADD COLUMN IF NOT EXISTS archive_url TEXT;