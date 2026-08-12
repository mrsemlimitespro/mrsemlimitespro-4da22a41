CREATE OR REPLACE FUNCTION public.set_admin_password(_new_password text, _current_password text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _hash text;
BEGIN
  IF length(coalesce(_new_password,'')) < 4 THEN
    RAISE EXCEPTION 'Senha muito curta';
  END IF;

  INSERT INTO public.admin_settings (singleton)
  VALUES (true)
  ON CONFLICT (singleton) DO NOTHING;

  SELECT password_hash INTO _hash
  FROM public.admin_settings
  WHERE singleton = true
  LIMIT 1;

  IF _hash IS NOT NULL AND _hash <> '' THEN
    IF _current_password IS NULL OR extensions.crypt(_current_password, _hash) <> _hash THEN
      RAISE EXCEPTION 'Senha atual incorreta';
    END IF;
  END IF;

  UPDATE public.admin_settings
     SET password_hash = extensions.crypt(_new_password, extensions.gen_salt('bf', 10))
   WHERE singleton = true;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_admin_password(text, text) TO anon, authenticated;