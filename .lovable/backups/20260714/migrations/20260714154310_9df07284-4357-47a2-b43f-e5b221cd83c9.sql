
ALTER TABLE public.revendedores
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS temp_password_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_revendedores_deleted_at
  ON public.revendedores (deleted_at)
  WHERE deleted_at IS NULL;
