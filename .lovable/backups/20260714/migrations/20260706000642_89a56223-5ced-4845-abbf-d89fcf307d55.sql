
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS imagem_url text,
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS cor_gradiente text;

ALTER TABLE public.creditos_packs
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS cor_gradiente text;

-- status "aguardando_configuracao" para transações criadas antes do gateway existir
-- (a coluna status é text, então basta os apps criarem com esse valor)
