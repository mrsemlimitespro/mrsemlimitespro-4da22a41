ALTER TABLE public.revendedores
  DROP COLUMN IF EXISTS comissao,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS empresa text,
  ADD COLUMN IF NOT EXISTS cpf_cnpj text;