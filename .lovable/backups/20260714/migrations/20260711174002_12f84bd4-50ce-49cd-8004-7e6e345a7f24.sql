
ALTER TABLE public.system_modules
  ADD COLUMN IF NOT EXISTS titulo_home text,
  ADD COLUMN IF NOT EXISTS subtitulo_home text;
