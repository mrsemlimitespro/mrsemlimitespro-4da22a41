CREATE OR REPLACE FUNCTION public.admin_password_configured()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash text;
BEGIN
  SELECT password_hash INTO _hash
  FROM public.admin_settings
  WHERE singleton = true
  LIMIT 1;

  RETURN _hash IS NOT NULL AND _hash <> '';
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_password_configured() TO anon, authenticated;