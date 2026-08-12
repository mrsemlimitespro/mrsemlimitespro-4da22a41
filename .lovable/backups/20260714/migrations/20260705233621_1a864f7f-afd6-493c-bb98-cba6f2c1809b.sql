
ALTER TABLE public.promocoes
  ADD COLUMN IF NOT EXISTS plano_id uuid REFERENCES public.planos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pack_id  uuid REFERENCES public.creditos_packs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS link text;

CREATE POLICY "banners ativos visiveis"
  ON public.banners FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "promocoes ativas visiveis"
  ON public.promocoes FOR SELECT
  TO authenticated
  USING (
    ativo = true
    AND (inicio IS NULL OR inicio <= now())
    AND (fim    IS NULL OR fim    >= now())
  );
