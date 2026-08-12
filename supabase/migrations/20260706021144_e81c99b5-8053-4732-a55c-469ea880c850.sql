
-- Auto-cria um "cliente" a cada novo signup em auth.users (sem consumir crédito, pois revendedor_id fica NULL)
CREATE OR REPLACE FUNCTION public.tg_auth_user_to_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nome text;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  _nome := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name',''),
    NULLIF(NEW.raw_user_meta_data->>'name',''),
    split_part(NEW.email,'@',1)
  );

  INSERT INTO public.clientes (nome, email, ultimo_acesso, status)
  VALUES (_nome, lower(NEW.email), now(), 'ativo')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_cliente ON auth.users;
CREATE TRIGGER on_auth_user_created_cliente
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_auth_user_to_cliente();

-- Backfill: usuários já existentes viram clientes (sem duplicar por email)
INSERT INTO public.clientes (nome, email, ultimo_acesso, status)
SELECT
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name',''),
    NULLIF(u.raw_user_meta_data->>'name',''),
    split_part(u.email,'@',1)
  ) AS nome,
  lower(u.email) AS email,
  COALESCE(u.last_sign_in_at, u.created_at) AS ultimo_acesso,
  'ativo' AS status
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.clientes c WHERE lower(c.email) = lower(u.email)
  );
