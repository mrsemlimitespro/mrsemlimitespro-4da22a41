
-- Garantir acesso pela Data API
GRANT SELECT ON public.videos TO anon, authenticated;
GRANT SELECT ON public.aulas  TO anon, authenticated;

-- Leitura pública dos vídeos
DROP POLICY IF EXISTS "videos public read" ON public.videos;
CREATE POLICY "videos public read"
  ON public.videos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Leitura pública das aulas
DROP POLICY IF EXISTS "aulas public read" ON public.aulas;
CREATE POLICY "aulas public read"
  ON public.aulas
  FOR SELECT
  TO anon, authenticated
  USING (true);
