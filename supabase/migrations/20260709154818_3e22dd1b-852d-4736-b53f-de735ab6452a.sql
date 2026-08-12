
ALTER TABLE public.licencas
  ADD COLUMN IF NOT EXISTS chave_fornecedor text;

-- Drop encrypted col (não vamos usar; simplifica admin form)
ALTER TABLE public.licencas DROP COLUMN IF EXISTS chave_fornecedor_encrypted;
